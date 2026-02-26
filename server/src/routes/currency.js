import { Router } from 'express';
import logger from '../logger.js';
import cacheService from '../services/cacheService.js';

const router = Router();

const FRANKFURTER_BASE = 'https://api.frankfurter.dev';
const FALLBACK_BASE = 'https://open.er-api.com/v6/latest';

/**
 * GET /api/currency/rates?from=USD&to=INR,EUR
 * Fetch real-time exchange rates (ECB data via Frankfurter API).
 */
router.get('/rates', async (req, res, next) => {
  try {
    const { from = 'USD', to } = req.query;

    const cacheKey = cacheService.generateKey('currency-rates', from, to || 'all');
    const cached = cacheService.get(cacheKey);
    if (cached) return res.json(cached);

    let result;
    try {
      const url = new URL(`${FRANKFURTER_BASE}/v1/latest`);
      url.searchParams.set('base', from.toUpperCase());
      if (to) url.searchParams.set('symbols', to.toUpperCase());

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Frankfurter: ${response.status}`);

      const data = await response.json();
      result = { base: data.base, date: data.date, rates: data.rates };
    } catch {
      // Fallback
      logger.info(`Frankfurter rates failed for ${from}, trying fallback API`);
      const fallbackRes = await fetch(`${FALLBACK_BASE}/${from.toUpperCase()}`);
      if (!fallbackRes.ok) throw new Error(`Fallback API: ${fallbackRes.status}`);
      const fallbackData = await fallbackRes.json();
      if (fallbackData.result === 'error') throw new Error(`Fallback: ${fallbackData['error-type']}`);

      let rates = fallbackData.rates || {};
      if (to) {
        const symbols = to.toUpperCase().split(',');
        rates = Object.fromEntries(symbols.map(s => [s, rates[s]]).filter(([, v]) => v != null));
      }
      result = { base: from.toUpperCase(), date: new Date().toISOString().split('T')[0], rates };
    }

    // Cache for 1 hour (rates update once per business day)
    cacheService.set(cacheKey, result, 3600);
    res.json(result);
  } catch (err) {
    logger.error(`Currency rates fetch failed: ${err.message}`);
    next(err);
  }
});

/**
 * GET /api/currency/convert?from=IDR&to=USD&amount=1000000
 * Convert a specific amount.
 */
router.get('/convert', async (req, res, next) => {
  try {
    const { from, to, amount } = req.query;

    if (!from || !to || !amount) {
      return res.status(400).json({ error: true, message: 'from, to, and amount are required' });
    }

    const cacheKey = cacheService.generateKey('currency-convert', from, to);
    let rate = cacheService.get(cacheKey);

    if (!rate) {
      try {
        // Try Frankfurter first (ECB currencies)
        const url = new URL(`${FRANKFURTER_BASE}/v1/latest`);
        url.searchParams.set('base', from.toUpperCase());
        url.searchParams.set('symbols', to.toUpperCase());

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error(`Frankfurter: ${response.status}`);

        const data = await response.json();
        rate = data.rates[to.toUpperCase()];
      } catch {
        // Fallback to open.er-api.com (supports 150+ currencies)
        logger.info(`Frankfurter failed for ${from}→${to}, trying fallback API`);
        const fallbackRes = await fetch(`${FALLBACK_BASE}/${from.toUpperCase()}`);
        if (!fallbackRes.ok) {
          const text = await fallbackRes.text();
          throw new Error(`Fallback API error: ${fallbackRes.status} ${text}`);
        }
        const fallbackData = await fallbackRes.json();
        if (fallbackData.result === 'error') {
          throw new Error(`Fallback API: ${fallbackData['error-type']}`);
        }
        rate = fallbackData.rates?.[to.toUpperCase()];
      }

      if (!rate) {
        return res.status(400).json({ error: true, message: `Unsupported currency pair: ${from} → ${to}` });
      }

      cacheService.set(cacheKey, rate, 3600);
    }

    const converted = parseFloat(amount) * rate;

    res.json({
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      amount: parseFloat(amount),
      rate,
      converted: Math.round(converted * 100) / 100,
    });
  } catch (err) {
    logger.error(`Currency conversion failed: ${err.message}`);
    next(err);
  }
});

/**
 * GET /api/currency/list
 * List all available currencies.
 */
router.get('/list', async (req, res, next) => {
  try {
    const cacheKey = 'currency-list';
    const cached = cacheService.get(cacheKey);
    if (cached) return res.json(cached);

    let currencies = {};
    try {
      const response = await fetch(`${FRANKFURTER_BASE}/v1/currencies`);
      if (response.ok) currencies = await response.json();
    } catch { /* ignore */ }

    // Merge in extra currencies from the fallback API
    try {
      const fallbackRes = await fetch(`${FALLBACK_BASE}/USD`);
      if (fallbackRes.ok) {
        const fb = await fallbackRes.json();
        const EXTRA_NAMES = {
          VND: 'Vietnamese Dong', AED: 'UAE Dirham', KWD: 'Kuwaiti Dinar',
          THB: 'Thai Baht', TWD: 'Taiwan Dollar', SAR: 'Saudi Riyal',
          QAR: 'Qatari Riyal', OMR: 'Omani Rial', BHD: 'Bahraini Dinar',
          EGP: 'Egyptian Pound', PKR: 'Pakistani Rupee', BDT: 'Bangladeshi Taka',
          LKR: 'Sri Lankan Rupee', NPR: 'Nepalese Rupee', MMK: 'Myanmar Kyat',
          KHR: 'Cambodian Riel', LAK: 'Lao Kip', MAD: 'Moroccan Dirham',
          TND: 'Tunisian Dinar', JOD: 'Jordanian Dinar', KES: 'Kenyan Shilling',
          NGN: 'Nigerian Naira', GHS: 'Ghanaian Cedi', TZS: 'Tanzanian Shilling',
          COP: 'Colombian Peso', PEN: 'Peruvian Sol', CLP: 'Chilean Peso',
          ARS: 'Argentine Peso', UAH: 'Ukrainian Hryvnia', GEL: 'Georgian Lari',
          RUB: 'Russian Ruble', KZT: 'Kazakhstani Tenge', UZS: 'Uzbekistani Som',
        };
        for (const code of Object.keys(fb.rates || {})) {
          if (!currencies[code]) {
            currencies[code] = EXTRA_NAMES[code] || code;
          }
        }
      }
    } catch { /* ignore */ }

    const result = { currencies };

    cacheService.set(cacheKey, result, 86400);
    res.json(result);
  } catch (err) {
    logger.error(`Currency list fetch failed: ${err.message}`);
    next(err);
  }
});

export default router;

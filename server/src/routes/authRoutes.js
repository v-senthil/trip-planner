import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config.js';
import logger from '../logger.js';

const router = Router();

// Constant-time string comparison to prevent timing attacks
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) {
    // Still run the comparison on same-length buffers to take constant time
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const validEmail    = safeEqual(email.toLowerCase().trim(), config.auth.email);
  const validPassword = safeEqual(password, config.auth.password);

  if (!validEmail || !validPassword) {
    logger.warn(`Failed login attempt for email: ${email}`);
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { email: config.auth.email },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn }
  );

  logger.info(`Successful login for: ${email}`);
  res.json({ token, expiresIn: config.auth.jwtExpiresIn });
});

// GET /api/auth/me  — verify token is still valid
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'No token provided.' });

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    res.json({ email: decoded.email });
  } catch {
    res.status(401).json({ message: 'Token invalid or expired.' });
  }
});

export default router;

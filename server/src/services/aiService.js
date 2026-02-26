import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import config from '../config.js';
import logger from '../logger.js';
import cacheService from './cacheService.js';
import dbService from './dbService.js';

// ─── Resolve effective API key (DB-stored has priority over .env) ─────────────

function resolveKey(dbKeyName, envFallback) {
  try {
    const dbKey = dbService.getApiKey(dbKeyName);
    if (dbKey) return dbKey;
  } catch { /* fall through to env */ }
  return envFallback || null;
}

// ─── Provider clients (lazily initialized) ───────────────────────────────────

let geminiClient = null;
let openaiClient = null;
let anthropicClient = null;
let perplexityClient = null;

function getGeminiClient() {
  const key = resolveKey('GEMINI_API_KEY', config.ai.providers.gemini.apiKey);
  if (key && key !== geminiClient?._apiKey) {
    // Re-create if key changed (e.g. saved via Settings page)
    geminiClient = new GoogleGenerativeAI(key);
  }
  if (!geminiClient && key) {
    geminiClient = new GoogleGenerativeAI(key);
  }
  return geminiClient;
}

function getOpenAIClient() {
  const key = resolveKey('OPENAI_API_KEY', config.ai.providers.openai.apiKey);
  if (!openaiClient && key) {
    openaiClient = new OpenAI({ apiKey: key });
  }
  return openaiClient;
}

function getAnthropicClient() {
  const key = resolveKey('ANTHROPIC_API_KEY', config.ai.providers.anthropic.apiKey);
  if (!anthropicClient && key) {
    anthropicClient = new Anthropic({ apiKey: key });
  }
  return anthropicClient;
}

function getPerplexityClient() {
  const key = resolveKey('PERPLEXITY_API_KEY', config.ai.providers.perplexity.apiKey);
  if (!perplexityClient && key) {
    perplexityClient = new OpenAI({
      apiKey: key,
      baseURL: config.ai.providers.perplexity.baseUrl,
    });
  }
  return perplexityClient;
}

// ─── Resolve the active provider/model from settings DB ─────────────────────

function getActiveAI() {
  try {
    const settings = dbService.getSettings();
    const provider = settings.aiProvider || config.ai.defaultProvider;
    const model = settings.aiModel || config.ai.defaultModel;
    return { provider, model };
  } catch {
    return { provider: config.ai.defaultProvider, model: config.ai.defaultModel };
  }
}

const SYSTEM_PROMPT = `You are a professional travel planner and local expert.
Generate a structured JSON itinerary for a vacation.

RULES:
- Plan day-by-day with realistic timing
- Optimize locations by proximity — group nearby places together
- Include for EACH time slot:
  - name: Place name
  - type: "attraction" | "restaurant" | "cafe" | "activity" | "viewpoint" | "market" | "temple" | "museum" | "beach" | "park"
  - timeStart: "HH:MM" (24h format)
  - timeEnd: "HH:MM"
  - estimatedMinutes: number
  - description: 1-2 sentences why this is recommended
  - budgetEstimate: estimated cost in local currency (string)
  - tips: practical tip for this place
- Each day should have these slots: morning, midMorning, lunch, afternoon, evening, dinner
- Keep realistic travel time between locations
- Avoid impossible distances in the same day
- Respect the user's travel pace preference
- Consider weather patterns for the destination
- Include local hidden gems, not just tourist traps
- For restaurants, suggest specific dishes to try

RESPONSE FORMAT (JSON only, no markdown):
{
  "destination": "City Name",
  "country": "Country",
  "currency": "XXX",
  "language": "Local Language",
  "bestTimeToVisit": "Month - Month",
  "localTips": ["tip1", "tip2", "tip3"],
  "emergencyNumbers": { "police": "xxx", "ambulance": "xxx", "tourist helpline": "xxx" },
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "Day theme/area focus",
      "area": "Neighborhood/area name",
      "energyLevel": "relaxed" | "moderate" | "high",
      "estimatedBudget": { "amount": number, "currency": "XXX", "breakdown": { "food": number, "transport": number, "activities": number } },
      "activities": [
        {
          "slot": "morning",
          "name": "Place Name",
          "type": "attraction",
          "timeStart": "08:00",
          "timeEnd": "10:00",
          "estimatedMinutes": 120,
          "description": "Why visit this place",
          "budgetEstimate": "Free / $10-20",
          "tips": "Practical tip",
          "travelFromPrevious": { "minutes": 15, "method": "walk" }
        }
      ]
    }
  ]
}`;

/**
 * Helper: call Gemini with a system instruction and user prompt, return parsed JSON.
 * Includes retry with exponential backoff for 429 rate-limit errors.
 */
async function callGemini(systemInstruction, userPrompt, options = {}) {
  const chatModel = genAI.getGenerativeModel({
    model: config.gemini.model,
    systemInstruction,
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: options.maxTokens || config.gemini.maxTokens,
      temperature: options.temperature ?? 0.7,
    },
  });

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await chatModel.generateContent(userPrompt);
      const response = result.response;
      let text = response.text();

      if (response.usageMetadata) {
        logger.info(`Gemini tokens used: prompt=${response.usageMetadata.promptTokenCount}, completion=${response.usageMetadata.candidatesTokenCount}, total=${response.usageMetadata.totalTokenCount}`);
      }

      // Strip markdown code fences if Gemini wraps the JSON
      text = text.trim();
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
      }

      try {
        return JSON.parse(text);
      } catch (parseErr) {
        logger.error('Failed to parse Gemini response as JSON', { text: text.substring(0, 500) });
        // On parse failure, retry if attempts remain
        if (attempt < maxRetries) {
          logger.warn(`JSON parse failed (attempt ${attempt}/${maxRetries}), retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        throw new Error('AI returned invalid JSON');
      }
    } catch (err) {
      const is429 = err.message?.includes('429') || err.status === 429;
      if (is429 && attempt < maxRetries) {
        // Extract retry delay from error message, default to exponential backoff
        const retryMatch = err.message?.match(/retry in ([\d.]+)s/i);
        const waitSec = retryMatch ? parseFloat(retryMatch[1]) : Math.pow(2, attempt) * 5;
        logger.warn(`Gemini rate limited (attempt ${attempt}/${maxRetries}), retrying in ${waitSec.toFixed(1)}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Generate a trip itinerary using Gemini.
 */
export async function generateItinerary(tripParams) {
  const {
    destination,
    days,
    startDate,
    endDate,
    budget,
    vacationType,
    travelPace,
    foodPreference,
    transportType,
    accommodationArea,
    mood,
    customVacationType,
  } = tripParams;

  const cacheKey = cacheService.generateKey(
    'itinerary', destination, days, startDate, budget, vacationType, travelPace, foodPreference
  );
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const paceMap = {
    jampacked: '5-6 places per day, energetic schedule',
    balanced: '3-4 places per day, comfortable pace',
    relaxed: '2-3 places per day, lots of downtime',
  };

  const dateInfo = startDate && endDate
    ? `Dates: ${startDate} to ${endDate} (${days} days)`
    : `${days} days`;

  const userPrompt = `Plan a ${days}-day trip to ${destination}.

${dateInfo}
Budget: ${budget}
Vacation type: ${(() => {
    const types = Array.isArray(vacationType) ? vacationType : [vacationType];
    return types.map(t => t === 'other' && customVacationType ? customVacationType : t).filter(Boolean).join(', ');
  })()}
Travel pace: ${paceMap[travelPace] || travelPace}
Food preference: ${Array.isArray(foodPreference) ? foodPreference.join(', ') : foodPreference}
Transport: ${transportType}
${accommodationArea ? `Stay area: ${accommodationArea}` : ''}
${Array.isArray(mood) && mood.length > 0 ? `Mood/Vibe: ${mood.join(', ')}` : (mood ? `Mood/Vibe: ${mood}` : '')}

Important:
- Group nearby attractions on the same day
- Start each day from the accommodation area
- Consider opening hours and best times to visit
- Include breakfast/coffee spots
- Account for ${transportType} travel between places
${startDate ? `- For each day, use the actual date starting from ${startDate}. Include the "date" field as "YYYY-MM-DD" format.` : ''}
${startDate ? `- Consider day-of-week: plan markets/temples for mornings, nightlife for weekends, etc.` : ''}`;

  logger.info(`Generating itinerary for ${destination}, ${days} days`);

  const itinerary = await callGemini(SYSTEM_PROMPT, userPrompt, {
    maxTokens: config.gemini.maxTokens,
    temperature: 0.7,
  });
  logger.info(`Itinerary generated for ${destination}: ${JSON.stringify(itinerary).substring(0, 500)}...`);
  cacheService.set(cacheKey, itinerary, 3600); // 1h cache
  return itinerary;
}

/**
 * Regenerate a specific day.
 */
export async function regenerateDay(destination, dayNumber, existingDays, preferences) {
  const existingPlaces = existingDays
    .flatMap((d) => d.activities?.map((a) => a.name) || []);

  const prompt = `Regenerate ONLY day ${dayNumber} of a trip to ${destination}.

Preferences: ${JSON.stringify(preferences)}

AVOID these already-planned places: ${existingPlaces.join(', ')}

Generate fresh, different recommendations for day ${dayNumber}.
Return the SAME JSON structure as a single day object with "day", "theme", "area", "energyLevel", "estimatedBudget", and "activities" array.`;

  return callGemini(SYSTEM_PROMPT, prompt, { maxTokens: 2048, temperature: 0.9 });
}

/**
 * Generate a swap suggestion for a specific activity.
 */
export async function swapAttraction(destination, currentPlace, slot, vacationType, budget) {
  const prompt = `Suggest an alternative to "${currentPlace}" in ${destination} for the ${slot} time slot.

Vacation type: ${vacationType}
Budget: ${budget}

Return JSON: { "name": "...", "type": "...", "description": "...", "budgetEstimate": "...", "tips": "...", "estimatedMinutes": number }`;

  return callGemini('You are a travel expert. Return JSON only.', prompt, {
    maxTokens: 512,
    temperature: 0.9,
  });
}

/**
 * Generate a packing list based on trip details.
 */
export async function generatePackingList(tripParams) {
  const { destination, days, vacationType, weather } = tripParams;

  const cacheKey = cacheService.generateKey('packing-list', destination, days, vacationType);
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const prompt = `Generate a smart packing list for a ${days}-day ${vacationType} trip to ${destination}.

${weather ? `Expected weather: ${JSON.stringify(weather)}` : ''}

Return JSON:
{
  "essentials": ["item1", "item2"],
  "clothing": ["item1", "item2"],
  "toiletries": ["item1", "item2"],
  "electronics": ["item1", "item2"],
  "documents": ["item1", "item2"],
  "activitySpecific": ["item1", "item2"],
  "culturalNotes": ["note1", "note2"],
  "tips": ["tip1", "tip2"]
}`;

  const result = await callGemini('You are a travel packing expert. Return JSON only.', prompt, {
    maxTokens: 4096,
    temperature: 0.5,
  });

  cacheService.set(cacheKey, result, 86400); // 24h cache
  return result;
}

/**
 * Generate local transport guide.
 */
export async function generateTransportGuide(destination) {
  const cacheKey = cacheService.generateKey('transport-guide', destination);
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const prompt = `Provide a local transport guide for ${destination}.

Return JSON:
{
  "overview": "Brief transport overview",
  "options": [
    { "type": "metro/bus/taxi/bike/walk", "name": "Service name", "description": "How to use", "cost": "Typical cost", "app": "App name if any", "tips": "Practical tip" }
  ],
  "airportTransfer": { "options": ["Option 1", "Option 2"], "estimatedCost": "...", "estimatedTime": "..." },
  "tips": ["tip1", "tip2"]
}`;

  const result = await callGemini('You are a local transport expert. Return JSON only.', prompt, {
    maxTokens: 4096,
    temperature: 0.5,
  });

  cacheService.set(cacheKey, result, 86400);
  return result;
}

export default {
  generateItinerary,
  regenerateDay,
  swapAttraction,
  generatePackingList,
  generateTransportGuide,
};

import jwt from 'jsonwebtoken';
import config from '../config.js';

/**
 * Express middleware — verifies JWT from Authorization header.
 * Rejects with 401 if token is missing, invalid, or expired.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expired. Please log in again.'
      : 'Invalid token.';
    return res.status(401).json({ message: msg });
  }
}

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Sign a JWT token
 * @param {object} payload - Data to encode (userId, role)
 * @returns {string} signed JWT
 */
const signToken = (payload) => {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined in environment variables.');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify and decode a JWT token
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyToken = (token) => {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined in environment variables.');
  return jwt.verify(token, JWT_SECRET);
};

module.exports = { signToken, verifyToken };

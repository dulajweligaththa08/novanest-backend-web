const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/database');
const { AppError } = require('./error.middleware');

/**
 * Verifies JWT from Authorization header and attaches user to req.user
 */
const verifyTokenMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No token provided. Please log in.', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) return next(new AppError('User no longer exists.', 401));
    if (!user.isActive) return next(new AppError('Your account has been deactivated. Contact support.', 403));

    req.user = user;
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired token. Please log in again.', 401));
  }
};

/**
 * Allows only ADMIN role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new AppError('Access denied. Admins only.', 403));
  }
  next();
};

/**
 * Allows only CUSTOMER role
 */
const requireCustomer = (req, res, next) => {
  if (!req.user || req.user.role !== 'CUSTOMER') {
    return next(new AppError('Access denied. Customers only.', 403));
  }
  next();
};

/**
 * Allows both ADMIN and CUSTOMER roles (any authenticated user)
 */
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401));
  }
  next();
};

module.exports = {
  verifyTokenMiddleware,
  requireAdmin,
  requireCustomer,
  requireAuth,
};

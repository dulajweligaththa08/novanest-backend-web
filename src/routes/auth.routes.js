const router = require('express').Router();
const { login, getMe, changePassword } = require('../controllers/auth.controller');
const { verifyTokenMiddleware } = require('../middleware/auth.middleware');

// Public
router.post('/login', login);

// Protected (any authenticated user)
router.get('/me', verifyTokenMiddleware, getMe);
router.post('/change-password', verifyTokenMiddleware, changePassword);

module.exports = router;

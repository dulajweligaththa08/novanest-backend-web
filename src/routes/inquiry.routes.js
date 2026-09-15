const router = require('express').Router();
const { submitInquiry, getInquiries, getInquiry, updateInquiry, deleteInquiry } = require('../controllers/inquiry.controller');
const { verifyTokenMiddleware, requireAdmin } = require('../middleware/auth.middleware');

// Public
router.post('/', submitInquiry);

// Admin
router.get('/', verifyTokenMiddleware, requireAdmin, getInquiries);
router.get('/:id', verifyTokenMiddleware, requireAdmin, getInquiry);
router.put('/:id', verifyTokenMiddleware, requireAdmin, updateInquiry);
router.delete('/:id', verifyTokenMiddleware, requireAdmin, deleteInquiry);

module.exports = router;

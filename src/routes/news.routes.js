const router = require('express').Router();
const { getArticles, getArticle, getAllArticles, createArticle, updateArticle, deleteArticle } = require('../controllers/news.controller');
const { verifyTokenMiddleware, requireAdmin } = require('../middleware/auth.middleware');

// Public
router.get('/', getArticles);
router.get('/:slug', getArticle);

// Admin
router.get('/admin/all', verifyTokenMiddleware, requireAdmin, getAllArticles);
router.post('/', verifyTokenMiddleware, requireAdmin, createArticle);
router.put('/:id', verifyTokenMiddleware, requireAdmin, updateArticle);
router.delete('/:id', verifyTokenMiddleware, requireAdmin, deleteArticle);

module.exports = router;

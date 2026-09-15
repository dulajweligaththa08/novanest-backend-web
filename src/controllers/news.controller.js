const slugify = require('slugify');
const prisma = require('../config/database');
const { AppError } = require('../middleware/error.middleware');

const makeSlug = (title) => slugify(title, { lower: true, strict: true });

// ─── GET /api/news  (public) ──────────────────────────────────────────────────
const getArticles = async (req, res, next) => {
  try {
    const { category, page = 1, limit = 9 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      status: 'PUBLISHED',
      ...(category && { category }),
    };

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        select: { id: true, title: true, slug: true, category: true, author: true, thumbnail: true, excerpt: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.article.count({ where }),
    ]);

    res.json({
      success: true,
      data: articles,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/news/:slug  (public) ────────────────────────────────────────────
const getArticle = async (req, res, next) => {
  try {
    const article = await prisma.article.findUnique({ where: { slug: req.params.slug } });
    if (!article || article.status !== 'PUBLISHED') return next(new AppError('Article not found.', 404));
    res.json({ success: true, data: article });
  } catch (err) {
    next(err);
  }
};

// ─── Admin CRUD ────────────────────────────────────────────────────────────────

const getAllArticles = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { ...(status && { status }) };
    const [articles, total] = await Promise.all([
      prisma.article.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.article.count({ where }),
    ]);

    res.json({
      success: true,
      data: articles,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

const createArticle = async (req, res, next) => {
  try {
    const { title, category, author, thumbnail, excerpt, body, status } = req.body;
    if (!title || !body) return next(new AppError('Title and body are required.', 400));

    const slug = makeSlug(title);
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) return next(new AppError('An article with this title already exists.', 409));

    const article = await prisma.article.create({
      data: {
        title, slug, category: category || 'General',
        author, thumbnail, excerpt, body,
        status: status || 'DRAFT',
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      },
    });

    res.status(201).json({ success: true, data: article });
  } catch (err) {
    next(err);
  }
};

const updateArticle = async (req, res, next) => {
  try {
    const { title, category, author, thumbnail, excerpt, body, status } = req.body;

    const article = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!article) return next(new AppError('Article not found.', 404));

    const updated = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title, slug: makeSlug(title) }),
        ...(category !== undefined && { category }),
        ...(author !== undefined && { author }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(excerpt !== undefined && { excerpt }),
        ...(body !== undefined && { body }),
        ...(status !== undefined && {
          status,
          publishedAt: status === 'PUBLISHED' && !article.publishedAt ? new Date() : article.publishedAt,
        }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const deleteArticle = async (req, res, next) => {
  try {
    await prisma.article.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Article deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getArticles, getArticle, getAllArticles, createArticle, updateArticle, deleteArticle };

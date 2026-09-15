const router = require('express').Router();
const {
  getJobs, getJob, applyForJob,
  getAllJobs, createJob, updateJob, deleteJob,
  getApplications, updateApplication,
} = require('../controllers/career.controller');
const { verifyTokenMiddleware, requireAdmin } = require('../middleware/auth.middleware');

// Public
router.get('/', getJobs);
router.get('/:id', getJob);
router.post('/:id/apply', applyForJob);

// Admin
router.get('/admin/all', verifyTokenMiddleware, requireAdmin, getAllJobs);
router.post('/', verifyTokenMiddleware, requireAdmin, createJob);
router.put('/:id', verifyTokenMiddleware, requireAdmin, updateJob);
router.delete('/:id', verifyTokenMiddleware, requireAdmin, deleteJob);
router.get('/:id/applications', verifyTokenMiddleware, requireAdmin, getApplications);
router.put('/applications/:id', verifyTokenMiddleware, requireAdmin, updateApplication);

module.exports = router;

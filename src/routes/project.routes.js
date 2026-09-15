const router = require('express').Router();
const {
  getProjects, getProjectBySlug, getAllProjects, createProject, updateProject, deleteProject, setProjectFacilities,
  getBuildings, createBuilding, updateBuilding, deleteBuilding,
  getFloors, createFloor, updateFloor, deleteFloor,
  addProjectImage, deleteGalleryImage,
  getFacilities, createFacility, deleteFacility,
} = require('../controllers/project.controller');
const { verifyTokenMiddleware, requireAdmin } = require('../middleware/auth.middleware');

// ─── Public routes ─────────────────────────────────────────────────────────────
router.get('/', getProjects);
router.get('/facilities', getFacilities);
router.get('/:slug', getProjectBySlug);

// ─── Admin routes ──────────────────────────────────────────────────────────────
router.get('/admin/all', verifyTokenMiddleware, requireAdmin, getAllProjects);
router.post('/', verifyTokenMiddleware, requireAdmin, createProject);
router.put('/:id', verifyTokenMiddleware, requireAdmin, updateProject);
router.delete('/:id', verifyTokenMiddleware, requireAdmin, deleteProject);
router.post('/:id/facilities', verifyTokenMiddleware, requireAdmin, setProjectFacilities);

// Buildings
router.get('/:projectId/buildings', verifyTokenMiddleware, requireAdmin, getBuildings);
router.post('/:projectId/buildings', verifyTokenMiddleware, requireAdmin, createBuilding);

// Gallery
router.post('/:projectId/gallery', verifyTokenMiddleware, requireAdmin, addProjectImage);

module.exports = router;

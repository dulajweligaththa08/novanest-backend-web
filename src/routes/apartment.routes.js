const router = require('express').Router();
const {
  getApartments, getApartment,
  getAllApartments, createApartment, updateApartment, deleteApartment,
  getApartmentTypes, createApartmentType, updateApartmentType, deleteApartmentType,
  addFloorPlan, deleteFloorPlan,
  addApartmentImage,
} = require('../controllers/apartment.controller');
const { verifyTokenMiddleware, requireAdmin } = require('../middleware/auth.middleware');

// ─── Public ────────────────────────────────────────────────────────────────────
router.get('/', getApartments);
router.get('/types', getApartmentTypes);
router.get('/:id', getApartment);

// ─── Admin ─────────────────────────────────────────────────────────────────────
router.get('/admin/all', verifyTokenMiddleware, requireAdmin, getAllApartments);
router.post('/floors/:floorId', verifyTokenMiddleware, requireAdmin, createApartment);
router.put('/:id', verifyTokenMiddleware, requireAdmin, updateApartment);
router.delete('/:id', verifyTokenMiddleware, requireAdmin, deleteApartment);

// Apartment types
router.post('/types', verifyTokenMiddleware, requireAdmin, createApartmentType);
router.put('/types/:id', verifyTokenMiddleware, requireAdmin, updateApartmentType);
router.delete('/types/:id', verifyTokenMiddleware, requireAdmin, deleteApartmentType);

// Floor plans
router.post('/:apartmentId/floor-plans', verifyTokenMiddleware, requireAdmin, addFloorPlan);
router.delete('/floor-plans/:id', verifyTokenMiddleware, requireAdmin, deleteFloorPlan);

// Apartment gallery
router.post('/:apartmentId/gallery', verifyTokenMiddleware, requireAdmin, addApartmentImage);

module.exports = router;

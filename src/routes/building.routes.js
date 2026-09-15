const router = require('express').Router();
const { updateBuilding, deleteBuilding, getFloors, createFloor } = require('../controllers/project.controller');
const { deleteFacility, createFacility } = require('../controllers/project.controller');
const { verifyTokenMiddleware, requireAdmin } = require('../middleware/auth.middleware');
const { updateFloor, deleteFloor, deleteGalleryImage } = require('../controllers/project.controller');

router.use(verifyTokenMiddleware, requireAdmin);

// Buildings
router.put('/buildings/:id', updateBuilding);
router.delete('/buildings/:id', deleteBuilding);

// Floors
router.get('/buildings/:buildingId/floors', getFloors);
router.post('/buildings/:buildingId/floors', createFloor);
router.put('/floors/:id', updateFloor);
router.delete('/floors/:id', deleteFloor);

// Gallery
router.delete('/gallery/:id', deleteGalleryImage);

// Facilities
router.post('/facilities', createFacility);
router.delete('/facilities/:id', deleteFacility);

module.exports = router;

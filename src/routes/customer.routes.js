const router = require('express').Router();
const {
  getMyApartment,
  getMyUpdates,
  getMyDocuments,
  getMyNotifications,
  markNotificationsRead,
  getProfile,
  updateProfile,
} = require('../controllers/customer.controller');
const { verifyTokenMiddleware, requireCustomer } = require('../middleware/auth.middleware');

// All customer routes require authentication + customer role
router.use(verifyTokenMiddleware, requireCustomer);

router.get('/apartment', getMyApartment);
router.get('/updates', getMyUpdates);
router.get('/documents', getMyDocuments);
router.get('/notifications', getMyNotifications);
router.post('/notifications/read-all', markNotificationsRead);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

module.exports = router;

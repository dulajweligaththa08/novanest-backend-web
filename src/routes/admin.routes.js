const router = require('express').Router();
const {
  getCustomers, getCustomer, createCustomer, updateCustomer, resetCustomerPassword,
  assignApartment,
  getUpdates, createUpdate, editUpdate, deleteUpdate,
  uploadDocument, deleteDocument,
  getAdmins, createAdmin, deactivateAdmin,
  getDashboard,
} = require('../controllers/admin.controller');
const { verifyTokenMiddleware, requireAdmin } = require('../middleware/auth.middleware');

// All admin routes require authentication + admin role
router.use(verifyTokenMiddleware, requireAdmin);

// Dashboard
router.get('/dashboard', getDashboard);

// Customers
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomer);
router.post('/customers', createCustomer);
router.put('/customers/:id', updateCustomer);
router.post('/customers/:id/reset-password', resetCustomerPassword);

// Apartment assignment
router.post('/customers/:id/apartments', assignApartment);

// Apartment updates
router.get('/assignments/:assignmentId/updates', getUpdates);
router.post('/assignments/:assignmentId/updates', createUpdate);
router.put('/updates/:id', editUpdate);
router.delete('/updates/:id', deleteUpdate);

// Documents
router.post('/assignments/:assignmentId/documents', uploadDocument);
router.delete('/documents/:id', deleteDocument);

// Admin accounts
router.get('/admins', getAdmins);
router.post('/admins', createAdmin);
router.delete('/admins/:id', deactivateAdmin);

module.exports = router;

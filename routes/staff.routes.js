// routes/staff.routes.js

const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staff.controller');
const { isLoggedIn, hasRole, hasSpecialty, isNotSpecialty } = require('../middleware/auth.middleware');

// Protect all staff routes
router.use(isLoggedIn);
router.use(hasRole('staff'));

// Staff Dashboard (generic, anyone can see)
router.get('/dashboard', staffController.showDashboard);


// --- COMPLAINT MANAGEMENT (Plumber, Electrician, etc.) ---
const complaintRouter = express.Router();
// USE THE NEW MIDDLEWARE: Allow if NOT Security
complaintRouter.use(isNotSpecialty('Security')); 
complaintRouter.get('/', staffController.showMyAssignedComplaints);
complaintRouter.post('/:id/resolve', staffController.resolveComplaint);
// Use this sub-router
router.use('/complaints', complaintRouter);


// --- VISITOR MANAGEMENT (Security ONLY) ---
// We'll protect these for 'Security'
const visitorRouter = express.Router();
visitorRouter.use(hasSpecialty('Security')); // <-- This protects the routes
visitorRouter.get('/', staffController.showVisitorDashboard);
visitorRouter.post('/check-in', staffController.checkInWalkIn);
visitorRouter.post('/:id/check-in', staffController.checkInPreRegistered);
visitorRouter.post('/:id/check-out', staffController.checkOutVisitor);
// Use this sub-router
router.use('/visitors', visitorRouter);


module.exports = router;
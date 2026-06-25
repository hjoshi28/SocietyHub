// routes/admin.routes.js

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { isLoggedIn, hasRole } = require('../middleware/auth.middleware');

// Protect all admin routes
router.use(isLoggedIn);
router.use(hasRole('admin'));

// Admin Dashboard
router.get('/dashboard', adminController.showDashboard);

// --- COMPLAINT MANAGEMENT ---

// GET /admin/complaints - Show all complaints from all residents
router.get('/complaints', adminController.showAllComplaints);

// GET /admin/complaints/:id/assign - Show form to assign a complaint
router.get('/complaints/:id/assign', adminController.showAssignForm);

// POST /admin/complaints/:id/assign - Process the complaint assignment
router.post('/complaints/:id/assign', adminController.assignComplaint);
router.get('/bookings', adminController.showAllBookings);

// --- END COMPLAINT MANAGEMENT ---

// --- BILLING & FINANCIALS ---

// GET /admin/bills - Show master list of all bills
router.get('/bills', adminController.showAllBills);

// POST /admin/bills/:id/mark-paid - Mark a specific bill as paid
router.post('/bills/:id/mark-paid', adminController.markBillAsPaid);
router.post('/bills/generate', adminController.generateMonthlyBills);

router.get('/reports', adminController.showFinancialReports);
// --- END BILLING & FINANCIALS ---

// --- PARKING MANAGEMENT ---

// GET /admin/parking - Show the parking management dashboard
router.get('/parking', adminController.showParkingDashboard);

// GET /admin/parking/assign - Show form to assign a spot
router.get('/parking/assign', adminController.showAssignParkingForm);

// POST /admin/parking/assign - Process the assignment
router.post('/parking/assign', adminController.assignParkingSpot);

// POST /admin/parking/unassign/:vehicle_id - Unassign a spot
// POST /parking/unassign/:id - Unassign a spot
router.post('/parking/unassign/:id', adminController.unassignParkingSpot);
// --- END PARKING MANAGEMENT ---

// --- COMMUNICATION (ANNOUNCEMENTS) ---

// GET /admin/announcements - Show page to manage announcements
router.get('/announcements', adminController.showAnnouncementsPage);

// POST /admin/announcements - Create a new announcement
router.post('/announcements', adminController.postAnnouncement);

// POST /admin/announcements/:id/delete - Delete an announcement
router.post('/announcements/:id/delete', adminController.deleteAnnouncement);

// --- END COMMUNICATION ---

// --- USER MANAGEMENT ---

// GET /admin/users - Show all users
router.get('/users', adminController.showUserList);

// POST /admin/users/:id/toggle-active - Deactivate or reactivate a user
router.post('/users/:id/toggle-active', adminController.toggleUserActive);

// GET /admin/users/:id/assign-flat - Show form to assign a flat to a resident
router.get('/users/:id/assign-flat', adminController.showAssignFlatForm);

// POST /admin/users/:id/assign-flat - Process the flat assignment
router.post('/users/:id/assign-flat', adminController.assignFlatToUser);

// --- END USER MANAGEMENT ---

// --- USER MANAGEMENT ---
router.get('/users', adminController.showUserList);

// GET /admin/users/new - Show form to create a new user
router.get('/users/new', adminController.showCreateUserForm);

// POST /admin/users/new - Process the new user creation
router.post('/users/new', adminController.createNewUser);

router.post('/users/:id/toggle-active', adminController.toggleUserActive);

router.post('/users/:id/delete', adminController.deleteUser);

router.post('/bills/add-fine', adminController.addFine);

router.post('/amenities/block', adminController.blockAmenitySlot);

// --- FLAT MANAGEMENT ---

// GET /admin/flats - Show master list of all flats
router.get('/flats', adminController.showFlatList);

// POST /admin/flats/new - Add a new flat
router.post('/flats/new', adminController.createFlat);

router.post('/flats/:id/unassign', adminController.unassignFlat);

// --- END FLAT MANAGEMENT ---
router.get('/audit-log', adminController.showAuditLog);

module.exports = router;
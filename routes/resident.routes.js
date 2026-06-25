// routes/resident.routes.js

const express = require('express');
const router = express.Router();
const residentController = require('../controllers/resident.controller');
const { isLoggedIn, hasRole } = require('../middleware/auth.middleware');

// --- Razorpay Setup ---
const Razorpay = require('razorpay');
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});
// Pass the instance to the controller
residentController.setRazorpayInstance(razorpayInstance);
// --- End Razorpay Setup ---


// Protect all resident routes
router.use(isLoggedIn);
router.use(hasRole('resident'));

// --- Dashboard, Profile, Complaints, etc. ---
// (All your other routes are here... /dashboard, /profile, /complaints, etc.)
router.get('/dashboard', residentController.showDashboard);
router.get('/announcements', residentController.showAnnouncements);
router.get('/profile', residentController.showMyProfile);
router.get('/profile/edit', residentController.showEditProfileForm);
router.post('/profile/edit', residentController.updateProfile);
router.post('/profile/change-password', residentController.changePassword);
router.post('/profile/change-password', residentController.changePassword);
router.post('/profile/vehicles/add', residentController.addVehicle);
router.post('/profile/vehicles/:id/remove', residentController.removeVehicle);
router.get('/complaints', residentController.showComplaints);
router.get('/complaints/new', residentController.showNewComplaintForm);
router.post('/complaints/new', residentController.submitNewComplaint);
router.get('/amenities', residentController.showAmenities);
router.get('/amenities/:id', residentController.showAmenityBookingPage);
router.post('/amenities/:id', residentController.bookAmenity);
router.get('/my-bookings', residentController.showMyBookings);
router.get('/visitors', residentController.showMyVisitors);
router.get('/visitors/new', residentController.showNewVisitorForm);
router.post('/visitors/new', residentController.preRegisterVisitor);
router.get('/parking', residentController.showMyParking);

// --- BILLING & PAYMENT ROUTES (Updated) ---
router.get('/bills', residentController.showMyBills);

// 1. Show page to pay a SINGLE bill
router.get('/bills/:id/pay', residentController.showPaySingleBillPage);

// 2. Show page to pay ALL unpaid bills
router.get('/bills/pay-all', residentController.showPayAllBillsPage);

// 3. Backend: Create a Razorpay order
router.post('/bills/create-order', residentController.createPaymentOrder);

// 4. Backend: Verify the payment
router.post('/bills/verify-payment', residentController.verifyPayment);
// --- END BILLING ---

module.exports = router;
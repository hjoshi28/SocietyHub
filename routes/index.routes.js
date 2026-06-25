// routes/index.routes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');


// When a GET request comes to the homepage ('/'),
// use the getHomePage function from our controller.
router.get('/', (req, res) => {
  // Check if user is already logged in
  if (req.session && req.session.isLoggedIn) {
    // Redirect to their respective dashboard
    if (req.session.user.role === 'admin') {
      res.redirect('/admin/dashboard');
    } else if (req.session.user.role === 'staff') {
      res.redirect('/staff/dashboard');
    } else {
      res.redirect('/resident/dashboard');
    }
  } else {
    // If not logged in, just show the login page
    // We call the controller function directly
    authController.showLoginPage(req, res);
  }
});
module.exports = router;
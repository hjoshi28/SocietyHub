// routes/auth.routes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// GET /register - Show the registration page
router.get('/register', authController.showRegisterPage);

// POST /register - Handle new user registration
router.post('/register', authController.registerUser);

// GET /login - Show the login page
router.get('/login', authController.showLoginPage);

// POST /login - Handle user login
router.post('/login', authController.loginUser);

// GET /logout - Handle user logout
router.get('/logout', authController.logoutUser);

module.exports = router;
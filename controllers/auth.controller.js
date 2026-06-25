// controllers/auth.controller.js

const db = require('../models/db');
const bcrypt = require('bcrypt');
const saltRounds = 10; // For bcrypt hashing

// 1. Show the registration page
const showRegisterPage = (req, res) => {
  res.render('register', { error: null });
};

// 2. Handle new user registration
const registerUser = async (req, res) => {
  const { full_name, email, phone, password } = req.body;

  try {
    // Check if user already exists
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ? OR phone = ?', [email, phone]);
    
    if (existingUsers.length > 0) {
      return res.render('register', { error: 'Email or phone number already in use.' });
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new user (defaulting to 'resident' role)
    // Admins and Staff will be created manually or by other admins
    const sql = 'INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)';
    await db.query(sql, [full_name, email, phone, password_hash, 'resident']);

    // Redirect to login page after successful registration
    res.redirect('/login');

  } catch (error) {
    console.error('Registration Error:', error);
    res.render('register', { error: 'An error occurred. Please try again.' });
  }
};

// 3. Show the login page
const showLoginPage = (req, res) => {
  res.render('login', { error: null });
};

// 4. Handle user login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      // No user found
      return res.render('login', { error: 'Invalid email or password.' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.render('login', { error: 'Your account has been deactivated. Please contact the admin.' });
    }

    // Compare the submitted password with the stored hash
    const match = await bcrypt.compare(password, user.password_hash);

    if (match) {
      // Passwords match! Create a session.

      // Redirect based on role
      if (user.role === 'admin') {
        // --- THIS IS THE CORRECTED BLOCK ---
        req.session.isLoggedIn = true;
        req.session.user = {
          id: user.user_id,
          name: user.full_name,
          email: user.email,
          role: user.role // This line was likely missing
        };
        res.redirect('/admin/dashboard');

      } else if (user.role === 'staff') {
        // --- THIS IS THE STAFF BLOCK WE BUILT ---
        const [staffDetails] = await db.query(
          'SELECT specialty FROM staff_details WHERE user_id = ?',
          [user.user_id]
        );
        const specialty = staffDetails.length > 0 ? staffDetails[0].specialty : 'Generic';

        req.session.isLoggedIn = true;
        req.session.user = {
          id: user.user_id,
          name: user.full_name,
          email: user.email,
          role: user.role,
          specialty: specialty
        };
        res.redirect('/staff/dashboard');

      } else {
        // --- THIS IS THE RESIDENT BLOCK ---
        req.session.isLoggedIn = true;
        req.session.user = {
          id: user.user_id,
          name: user.full_name,
          email: user.email,
          role: user.role
        };
        res.redirect('/resident/dashboard');
      }

    } else {
      // Passwords do not match
      return res.render('login', { error: 'Invalid email or password.' });
    }

  } catch (error) {
    console.error('Login Error:', error);
    res.render('login', { error: 'An error occurred. Please try again.' });
  }
};

// 5. Handle user logout
const logoutUser = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout Error:', err);
      return res.redirect('/'); // Redirect to homepage even if error
    }
    
    // Clear the cookie and redirect to login
    res.clearCookie('connect.sid'); // The default session cookie name
    res.redirect('/login');
  });
};

module.exports = {
  showRegisterPage,
  registerUser,
  showLoginPage,
  loginUser,
  logoutUser
};
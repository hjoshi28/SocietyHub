// server.js

require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session'); // 1. Import
const cookieParser = require('cookie-parser'); // 2. Import

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser()); // 3. Use

// 4. Session Setup
app.use(session({
  secret: 'a-very-strong-secret-key-that-you-should-change', 
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Import our routes
const indexRoutes = require('./routes/index.routes');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes'); // 1. Import
const residentRoutes = require('./routes/resident.routes'); // 2. Import
const staffRoutes = require('./routes/staff.routes'); // 3. Import

// Use our routes
app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes); // CHANGED from '/'
app.use('/resident', residentRoutes); // CHANGED from '/'
app.use('/staff', staffRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
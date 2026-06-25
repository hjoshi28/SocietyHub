// middleware/auth.middleware.js

// This checks if a user is logged in
const isLoggedIn = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect('/login');
  }
  next(); // User is logged in, proceed to the route
};

// This checks if a user has a specific role
const hasRole = (role) => {
  return (req, res, next) => {
    if (req.session.user.role !== role) {
      // You could redirect to their own dashboard or show an error
      console.log(req.session.user.role);
      console.log(role);
      return res.status(403).send('Access Denied: You do not have permission.');
    }
    next(); // User has the correct role, proceed
  };
};

const hasSpecialty = (specialty) => {
  return (req, res, next) => {
    if (req.session.user.specialty !== specialty) {
      return res.status(403).send('Access Denied: You are not authorized for this task.');
    }
    next(); // User has the correct specialty
  };
};

const isNotSpecialty = (specialty) => {
  return (req, res, next) => {
    // If they have the specialty, deny access
    if (req.session.user.specialty === specialty) {
      return res.status(403).send('Access Denied: You are not authorized for this task.');
    }
    next(); // User is fine, proceed
  };
};

module.exports = {
  isLoggedIn,
  hasRole,
  hasSpecialty,
  isNotSpecialty // Add new export
};
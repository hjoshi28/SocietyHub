// controllers/staff.controller.js
const db = require('../models/db'); // Make sure db is imported

const showDashboard = (req, res) => {
  const user = req.session.user;
  res.render('staff_dashboard', { user: user });
};

// --- NEW COMPLAINT FUNCTIONS ---

// Show all complaints assigned to the logged-in staff member
const showMyAssignedComplaints = async (req, res) => {
  const staffUserId = req.session.user.id;
  
  try {
    // This query joins complaints, users (residents), and flats
    const sql = `
      SELECT 
        c.complaint_id, c.title, c.description, c.status, c.created_at,
        r.full_name AS resident_name,
        f.wing, f.flat_number
      FROM complaints c
      JOIN users r ON c.user_id = r.user_id
      JOIN flats f ON c.flat_id = f.flat_id
      WHERE c.assigned_to_staff_user_id = ?
      ORDER BY c.status ASC, c.created_at DESC
    `;
    const [complaints] = await db.query(sql, [staffUserId]);

    res.render('staff_complaints', { 
      user: req.session.user, 
      complaints: complaints 
    });

  } catch (error) {
    console.error('Error fetching assigned complaints:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Mark a complaint as resolved
const resolveComplaint = async (req, res) => {
  const complaintId = req.params.id;
  const staffUserId = req.session.user.id;
  
  try {
    // We check the staffUserId in the WHERE clause
    // to make sure a staff member can only resolve their *own* tasks
    const updateSql = `
      UPDATE complaints
      SET status = 'Resolved'
      WHERE complaint_id = ? AND assigned_to_staff_user_id = ?
    `;
    
    const [result] = await db.query(updateSql, [complaintId, staffUserId]);

    if (result.affectedRows === 0) {
      // This means the complaint was not found OR it wasn't assigned to this staff member
      return res.status(403).send('Error: Complaint not found or not assigned to you.');
    }

    // Redirect back to their list
    res.redirect('/staff/complaints');

  } catch (error) {
    console.error('Error resolving complaint:', error);
    res.status(500).send('Internal Server Error');
  }
};

const showVisitorDashboard = async (req, res) => {
  try {
    // Query 1: Get all flats (for the walk-in form dropdown)
    const [flats] = await db.query('SELECT flat_id, wing, flat_number FROM flats ORDER BY wing, flat_number');

    // Query 2: Get all pre-registered visitors for today
    const [preRegistered] = await db.query(
      `SELECT v.visitor_id, v.name, v.phone, v.expected_check_in, f.wing, f.flat_number
       FROM visitors v
       JOIN flats f ON v.flat_id = f.flat_id
       WHERE v.actual_check_in IS NULL AND v.expected_check_in >= CURDATE()
       ORDER BY v.expected_check_in`
    );

    // Query 3: Get all currently checked-in visitors
    const [checkedIn] = await db.query(
      `SELECT v.visitor_id, v.name, v.phone, v.actual_check_in, f.wing, f.flat_number
       FROM visitors v
       JOIN flats f ON v.flat_id = f.flat_id
       WHERE v.actual_check_in IS NOT NULL AND v.actual_check_out IS NULL
       ORDER BY v.actual_check_in`
    );

    res.render('staff_visitors', {
      user: req.session.user,
      flats: flats,
      preRegisteredVisitors: preRegistered,
      checkedInVisitors: checkedIn,
      error: null
    });

  } catch (error) {
    console.error('Error fetching visitor dashboard data:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Handle a walk-in visitor
const checkInWalkIn = async (req, res) => {
  const { name, phone, flat_id } = req.body;
  
  try {
    if (!name || !phone || !flat_id) {
      // If error, we must re-fetch data to render the page
      // This is a simplified error handling
      return res.redirect('/staff/visitors?error=All fields are required');
    }

    // Insert new visitor and set actual_check_in to NOW()
    const insertSql = `
      INSERT INTO visitors (name, phone, flat_id, actual_check_in)
      VALUES (?, ?, ?, NOW())
    `;
    await db.query(insertSql, [name, phone, flat_id]);
    
    res.redirect('/staff/visitors');

  } catch (error) {
    console.error('Error checking in walk-in:', error);
    res.redirect('/staff/visitors?error=Database error');
  }
};

// Handle a pre-registered visitor check-in
const checkInPreRegistered = async (req, res) => {
  const visitorId = req.params.id;
  try {
    // Update the existing record, set actual_check_in to NOW()
    const updateSql = `
      UPDATE visitors 
      SET actual_check_in = NOW() 
      WHERE visitor_id = ?
    `;
    await db.query(updateSql, [visitorId]);
    
    res.redirect('/staff/visitors');

  } catch (error) {
    console.error('Error checking in pre-registered:', error);
    res.redirect('/staff/visitors?error=Database error');
  }
};

// Handle any visitor check-out
const checkOutVisitor = async (req, res) => {
  const visitorId = req.params.id;
  try {
    // Update the record, set actual_check_out to NOW()
    const updateSql = `
      UPDATE visitors 
      SET actual_check_out = NOW() 
      WHERE visitor_id = ?
    `;
    await db.query(updateSql, [visitorId]);
    
    res.redirect('/staff/visitors');

  } catch (error) {
    console.error('Error checking out visitor:', error);
    res.redirect('/staff/visitors?error=Database error');
  }
};


module.exports = {
  showDashboard,
  showMyAssignedComplaints, // Add new
  resolveComplaint,
  showVisitorDashboard,  // Add new
  checkInWalkIn,          // Add new
  checkInPreRegistered,   // Add new
  checkOutVisitor          // Add new
};
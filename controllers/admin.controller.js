// controllers/admin.controller.js
const db = require('../models/db'); // Make sure db is imported
const bcrypt = require('bcrypt'); // <-- ADD THIS LINE
const saltRounds = 10;           // <-- AND THIS LINE

const showDashboard = (req, res) => {
  const user = req.session.user;
  res.render('admin_dashboard', { user: user });
};

// --- NEW COMPLAINT FUNCTIONS ---

// Show all complaints from all users
const showAllComplaints = async (req, res) => {
  try {
    // This is our complex query!
    // It joins 4 tables to get all the data we need.
    const sql = `
      SELECT 
        c.complaint_id, c.title, c.description, c.status, c.created_at,
        r.full_name AS resident_name,
        f.wing, f.flat_number,
        s.full_name AS staff_name
      FROM complaints c
      JOIN users r ON c.user_id = r.user_id
      JOIN flats f ON c.flat_id = f.flat_id
      LEFT JOIN users s ON c.assigned_to_staff_user_id = s.user_id
      ORDER BY c.status ASC, c.created_at DESC
    `;
    const [complaints] = await db.query(sql);
    
    res.render('admin_complaints', { 
      user: req.session.user, 
      complaints: complaints 
    });

  } catch (error) {
    console.error('Error fetching all complaints:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Show the form to assign a complaint
const showAssignForm = async (req, res) => {
  const complaintId = req.params.id;
  try {
    // 1. Get the specific complaint details
    const [complaintRows] = await db.query(
      'SELECT complaint_id, title FROM complaints WHERE complaint_id = ?', 
      [complaintId]
    );
    
    if (complaintRows.length === 0) {
      return res.status(404).send('Complaint not found.');
    }
    
    // 2. Get a list of all available staff members (FIXED QUERY)
    const [staffMembers] = await db.query(
      "SELECT u.user_id, u.full_name, sd.specialty FROM users u JOIN staff_details sd ON u.user_id = sd.user_id WHERE u.role = 'staff' AND sd.is_active = true"
    );

    res.render('assign_complaint', {
      user: req.session.user,
      complaint: complaintRows[0],
      staffList: staffMembers,
      error: null
    });

  } catch (error) {
    console.error('Error fetching data for assignment:', error);
    res.status(500).send('Internal Server Error');
  }
};
// Process the assignment
const assignComplaint = async (req, res) => {
  const complaintId = req.params.id;
  const { staff_user_id } = req.body; // Get staff ID from the form

  if (!staff_user_id) {
    // Handle case where no staff is selected
    // (We'll just re-render the form with an error)
    // This part is skipped for brevity, but you'd re-fetch data
    return res.status(400).send('Please select a staff member.');
  }

  try {
    // Update the complaint: set staff ID and change status
    const updateSql = `
      UPDATE complaints
      SET 
        assigned_to_staff_user_id = ?,
        status = 'In Progress'
      WHERE complaint_id = ?
    `;
    await db.query(updateSql, [staff_user_id, complaintId]);

    // Redirect back to the main complaints list
    res.redirect('/admin/complaints');

  } catch (error) {
    console.error('Error assigning complaint:', error);
    res.status(500).send('Internal Server Error');
  }
};

const showAllBookings = async (req, res) => {
  try {
    const [amenities] = await db.query('SELECT amenity_id, name FROM amenities');
    
    // --- THIS SQL IS THE FIX ---
    const sql = `
      SELECT 
        a.name AS amenity_name,
        u.full_name AS booker_name,
        u.role AS booker_role,
        b.start_time, b.end_time, b.total_cost
      FROM amenity_bookings b
      JOIN amenities a ON b.amenity_id = a.amenity_id
      JOIN users u ON b.user_id = u.user_id
      WHERE b.end_time > NOW()
      ORDER BY b.start_time ASC
    `;
    const [bookings] = await db.query(sql);
    
    res.render('admin_bookings', { 
      user: req.session.user, 
      bookings: bookings,
      amenities: amenities,
      error: null
    });

  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).send('Internal Server Error');
  }
};

// --- NEW BILLING FUNCTIONS ---

// Show a master list of all bills
const addFine = async (req, res) => {
  const { flat_id, amount, due_date, description } = req.body;

  if (!flat_id || !amount || !due_date || !description) {
    // A more robust error handling would be good, but redirect for now
    return res.redirect('/admin/bills');
  }

  try {
    const sql = `
      INSERT INTO maintenance_bills (flat_id, amount, description, due_date, status)
      VALUES (?, ?, ?, ?, 'Unpaid')
    `;
    await db.query(sql, [flat_id, amount, description, due_date]);
    
    res.redirect('/admin/bills');

  } catch (error) {
    console.error('Error adding fine:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Also, we must update showAllBills to get the list of flats for the new form
// REPLACE your old showAllBills with this
// controllers/admin.controller.js
// REPLACE this function
// controllers/admin.controller.js
// REPLACE this function
const showAllBills = async (req, res) => {
  try {
    const [flats] = await db.query('SELECT flat_id, wing, flat_number FROM flats ORDER BY wing, flat_number');

    // --- THIS SQL QUERY IS UPDATED ---
    const sql = `
      SELECT 
        b.bill_id, b.amount, b.description, b.due_date, b.status, b.generated_at,
        f.wing, f.flat_number,
        u.full_name AS resident_name
      FROM maintenance_bills b
      JOIN flats f ON b.flat_id = f.flat_id
      LEFT JOIN flat_residents fr ON f.flat_id = fr.flat_id
      LEFT JOIN users u ON fr.user_id = u.user_id
      ORDER BY b.status ASC, b.due_date DESC
    `;
    // --- END OF UPDATE ---
    
    const [bills] = await db.query(sql);

    const [unpaidResult] = await db.query(
      "SELECT SUM(amount) AS total_unpaid FROM maintenance_bills WHERE status = 'Unpaid' OR status = 'Pending Verification'"
    );
    const totalUnpaid = unpaidResult[0].total_unpaid || 0;

    res.render('admin_bills', { 
      user: req.session.user, 
      bills: bills,
      totalUnpaid: totalUnpaid,
      flats: flats
    });

  } catch (error) {
    console.error('Error fetching all bills:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Mark a specific bill as paid
const markBillAsPaid = async (req, res) => {
  const billId = req.params.id;
  try {
    const updateSql = "UPDATE maintenance_bills SET status = 'Paid' WHERE bill_id = ?";
    await db.query(updateSql, [billId]);
    
    // Redirect back to the bills page
    res.redirect('/admin/bills');

  } catch (error) {
    console.error('Error marking bill as paid:', error);
    res.status(500).send('Internal Server Error');
  }
};

const generateMonthlyBills = async (req, res) => {
  const { amount, due_date } = req.body;

  // Simple validation
  if (!amount || !due_date) {
    return res.status(400).send('Amount and Due Date are required.');
  }

  try {
    // Step 1: Get all flat_id's from the flats table
    const [flats] = await db.query('SELECT flat_id FROM flats');

    if (flats.length === 0) {
      return res.status(400).send('No flats found in the system.');
    }

    // Step 2: Create an array of "promises" for all the inserts
    const insertPromises = flats.map(flat => {
      const insertSql = `
        INSERT INTO maintenance_bills (flat_id, amount, due_date, status)
        VALUES (?, ?, ?, 'Unpaid')
      `;
      return db.query(insertSql, [flat.flat_id, amount, due_date]);
    });

    // Step 3: Execute all insert queries at once
    await Promise.all(insertPromises);

    // All bills are generated, redirect back to the bills page
    res.redirect('/admin/bills');

  } catch (error) {
    console.error('Error generating monthly bills:', error);
    res.status(500).send('Internal Server Error');
  }
};

const showFinancialReports = async (req, res) => {
  try {
    // Query 1: Get all overdue bills (status 'Unpaid' and due_date is in the past)
    // We join with flats and users to get resident details
    const overdueSql = `
      SELECT 
        f.wing, f.flat_number,
        r.full_name AS resident_name,
        b.amount, b.due_date
      FROM maintenance_bills b
      JOIN flats f ON b.flat_id = f.flat_id
      LEFT JOIN flat_residents fr ON f.flat_id = fr.flat_id AND fr.relationship = 'Owner'
      LEFT JOIN users r ON fr.user_id = r.user_id
      WHERE b.status = 'Unpaid' AND b.due_date < CURDATE()
      ORDER BY f.wing, f.flat_number;
    `;
    const [overdueBills] = await db.query(overdueSql);

    // Query 2: Get a quarterly summary, grouped by wing
    // This uses SUM() and CASE to pivot data
    const summarySql = `
      SELECT 
        YEAR(generated_at) as bill_year,
        QUARTER(generated_at) as bill_quarter,
        f.wing,
        SUM(CASE WHEN b.status = 'Paid' THEN b.amount ELSE 0 END) AS total_paid,
        SUM(CASE WHEN b.status = 'Unpaid' THEN b.amount ELSE 0 END) AS total_unpaid
      FROM maintenance_bills b
      JOIN flats f ON b.flat_id = f.flat_id
      GROUP BY bill_year, bill_quarter, f.wing
      ORDER BY bill_year DESC, bill_quarter DESC, f.wing ASC;
    `;
    const [quarterlySummary] = await db.query(summarySql);

    // Query 3: Get all unresolved complaints (Pending or In Progress)
    const complaintsSql = `
      SELECT 
        c.title, c.status,
        r.full_name AS resident_name,
        s.full_name AS staff_name
      FROM complaints c
      JOIN users r ON c.user_id = r.user_id
      LEFT JOIN users s ON c.assigned_to_staff_user_id = s.user_id
      WHERE c.status != 'Resolved'
      ORDER BY c.status ASC, c.created_at ASC;
    `;
    const [unresolvedComplaints] = await db.query(complaintsSql);

    // Render the report page with all 3 sets of data
    res.render('admin_reports', {
      user: req.session.user,
      overdueBills: overdueBills,
      quarterlySummary: quarterlySummary,
      unresolvedComplaints: unresolvedComplaints
    });

  } catch (error) {
    console.error('Error generating financial reports:', error);
    res.status(500).send('Internal Server Error');
  }
};

const showParkingDashboard = async (req, res) => {
  try {
    // This query is now simpler: just joins slots with users
    const sql = `
      SELECT 
        ps.slot_id, ps.slot_number, ps.status,
        u.user_id, u.full_name AS resident_name
      FROM parking_slots ps
      LEFT JOIN users u ON ps.assigned_to_user_id = u.user_id
      ORDER BY ps.slot_number;
    `;
    const [parkingSlots] = await db.query(sql);

    res.render('admin_parking', { 
      user: req.session.user, 
      parkingSlots: parkingSlots 
    });

  } catch (error) {
    console.error('Error fetching parking dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
};

// 2. Show the form to assign a new parking spot (NEW QUERY)
const showAssignParkingForm = async (req, res) => {
  try {
    // 1. Get all available (unassigned) parking slots
    const [availableSlots] = await db.query(
      "SELECT slot_id, slot_number FROM parking_slots WHERE status = 'Available'"
    );

    // 2. Get all residents who do NOT already have a parking spot
    const [residentsWithoutSpot] = await db.query(
      `SELECT user_id, full_name FROM users 
       WHERE role = 'resident' 
       AND user_id NOT IN (SELECT assigned_to_user_id FROM parking_slots WHERE assigned_to_user_id IS NOT NULL)`
    );

    res.render('assign_parking', {
      user: req.session.user,
      availableSlots: availableSlots,
      residents: residentsWithoutSpot,
      error: null
    });

  } catch (error) {
    console.error('Error fetching data for parking assignment:', error);
    res.status(500).send('Internal Server Error');
  }
};

// 3. Process the parking spot assignment (SIMPLIFIED)
const assignParkingSpot = async (req, res) => {
  // This is now much simpler. No vehicles involved.
  const { user_id, slot_id } = req.body;

  if (!user_id || !slot_id) {
    return res.status(400).send('All fields are required.');
  }

  try {
    // Just update the parking slot
    await db.query(
      "UPDATE parking_slots SET status = 'Assigned', assigned_to_user_id = ? WHERE slot_id = ?",
      [user_id, slot_id]
    );
    res.redirect('/admin/parking');

  } catch (error) {
    console.error('Error assigning parking spot:', error);
    res.status(500).send('Error during assignment.');
  }
};

// 4. Unassign a parking spot (NEW LOGIC)
const unassignParkingSpot = async (req, res) => {
  // The route gives us the slot_id to unassign (we changed this in routes/admin.routes.js)
  const slotId = req.params.id; 
  
  try {
    // Simply set the spot back to Available
    await db.query(
      "UPDATE parking_slots SET status = 'Available', assigned_to_user_id = NULL WHERE slot_id = ?",
      [slotId]
    );
    res.redirect('/admin/parking');

  } catch (error) {
    console.error('Error unassigning parking spot:', error);
    res.status(500).send('Error during unassignment.');
  }
};

// --- NEW ANNOUNCEMENT FUNCTIONS ---

// Show the announcement management page
const showAnnouncementsPage = async (req, res) => {
  try {
    // Get all announcements, join with users to see who posted it
    const sql = `
      SELECT a.announcement_id, a.title, a.body, a.created_at, u.full_name
      FROM announcements a
      JOIN users u ON a.created_by_user_id = u.user_id
      ORDER BY a.created_at DESC
    `;
    const [announcements] = await db.query(sql);

    res.render('admin_announcements', { 
      user: req.session.user, 
      announcements: announcements 
    });

  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Post a new announcement
const postAnnouncement = async (req, res) => {
  const { title, body } = req.body;
  const adminUserId = req.session.user.id;
  
  try {
    if (!title || !body) {
      // Handle error, but for now just redirect
      return res.redirect('/admin/announcements');
    }
    
    const insertSql = `
      INSERT INTO announcements (title, body, created_by_user_id)
      VALUES (?, ?, ?)
    `;
    await db.query(insertSql, [title, body, adminUserId]);
    
    res.redirect('/admin/announcements');

  } catch (error) {
    console.error('Error posting announcement:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Delete an announcement
const deleteAnnouncement = async (req, res) => {
  const announcementId = req.params.id;
  
  try {
    // We'd normally check if the user is an admin, but the route is already protected
    await db.query('DELETE FROM announcements WHERE announcement_id = ?', [announcementId]);
    res.redirect('/admin/announcements');

  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).send('Internal Server Error');
  }
};

const showUserList = async (req, res) => {
  try {
    // This query is now more complex:
    // It joins users, flat_residents, flats, AND staff_details
    const sql = `
      SELECT 
        u.user_id, u.full_name, u.email, u.phone, u.role, u.is_active,
        f.wing, f.flat_number,
        sd.specialty
      FROM users u
      LEFT JOIN flat_residents fr ON u.user_id = fr.user_id
      LEFT JOIN flats f ON fr.flat_id = f.flat_id
      LEFT JOIN staff_details sd ON u.user_id = sd.user_id
      ORDER BY u.role, u.full_name;
    `;
    const [users] = await db.query(sql);

    res.render('admin_users', { 
      user: req.session.user, 
      users: users // We send all users, the EJS will split them
    });

  } catch (error) {
    console.error('Error fetching user list:', error);
    res.status(500).send('Internal Server Error');
  }
};

// ADD this new function
const deleteUser = async (req, res) => {
  const userIdToDelete = req.params.id;
  const adminUserId = req.session.user.id;

  if (userIdToDelete == adminUserId) {
    // Prevent admin from deleting themselves
    return res.redirect('/admin/users'); // Or send an error message
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get the role of the user being deleted
    const [userRows] = await connection.query('SELECT role FROM users WHERE user_id = ?', [userIdToDelete]);
    if (userRows.length === 0) {
      throw new Error('User not found.');
    }
    const role = userRows[0].role;

    // 2. CHECK: If the user is an admin, check if they are the last one
    if (role === 'admin') {
      const [adminCountRows] = await connection.query(
        "SELECT COUNT(user_id) AS adminCount FROM users WHERE role = 'admin' AND is_active = true"
      );
      const adminCount = adminCountRows[0].adminCount;

      if (adminCount <= 1) {
        // This is the last admin! Stop the deletion.
        throw new Error('Cannot delete the last active admin account.');
      }
    }

    // 3. Proceed with deletion
    await connection.query('DELETE FROM users WHERE user_id = ?', [userIdToDelete]);

    await connection.commit();
    res.redirect('/admin/users');

  } catch (error) {
    await connection.rollback();
    console.error('Error deleting user:', error);
    // We should send the error back to the user
    // For now, redirecting, but a real app would show the error message
    res.redirect('/admin/users'); // You could add an error query param
  } finally {
    connection.release();
  }
};

// Deactivate or reactivate a user
const toggleUserActive = async (req, res) => {
  const userIdToToggle = req.params.id;
  const adminUserId = req.session.user.id;

  if (userIdToToggle == adminUserId) {
    // Prevent admin from deactivating themselves
    return res.redirect('/admin/users');
  }

  try {
    // We get the current status and flip it
    const [userRows] = await db.query('SELECT is_active FROM users WHERE user_id = ?', [userIdToToggle]);
    const newStatus = !userRows[0].is_active;
    
    await db.query('UPDATE users SET is_active = ? WHERE user_id = ?', [newStatus, userIdToToggle]);
    res.redirect('/admin/users');

  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Show form to assign a flat to a resident
const showAssignFlatForm = async (req, res) => {
  const residentUserId = req.params.id;
  try {
    // 1. Get the resident's details
    const [userRows] = await db.query('SELECT user_id, full_name FROM users WHERE user_id = ? AND role = \'resident\'', [residentUserId]);
    if (userRows.length === 0) {
      return res.status(404).send('Resident not found.');
    }

    // 2. Get all flats that are NOT already assigned
    // This subquery finds all flat_id's that are in the flat_residents table
    const [availableFlats] = await db.query(
      `SELECT flat_id, wing, flat_number FROM flats
       WHERE flat_id NOT IN (SELECT flat_id FROM flat_residents)`
    );

    res.render('admin_assign_flat', {
      user: req.session.user,
      resident: userRows[0],
      availableFlats: availableFlats,
      error: null
    });

  } catch (error) {
    console.error('Error fetching data for flat assignment:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Process the flat assignment
const assignFlatToUser = async (req, res) => {
  const residentUserId = req.params.id;
  const { flat_id, relationship } = req.body;

  try {
    if (!flat_id || !relationship) {
      return res.status(400).send('All fields are required.');
    }

    // Insert into the junction table
    const sql = 'INSERT INTO flat_residents (user_id, flat_id, relationship) VALUES (?, ?, ?)';
    await db.query(sql, [residentUserId, flat_id, relationship]);

    res.redirect('/admin/users');

  } catch (error) {
    console.error('Error assigning flat:', error);
    // Handle potential duplicate assignment error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).send('This flat or user is already assigned.');
    }
    res.status(500).send('Internal Server Error');
  }
};

const showCreateUserForm = (req, res) => {
  res.render('admin_create_user', { 
    user: req.session.user, 
    error: null 
  });
};

// Create a new user (Admin, Staff, or Resident)
const createNewUser = async (req, res) => {
  const { full_name, email, phone, password, role, specialty } = req.body;
  
  if (!full_name || !email || !phone || !password || !role) {
    return res.render('admin_create_user', { user: req.session.user, error: 'All fields except specialty are required.' });
  }

  // Check for staff specialty
  if (role === 'staff' && !specialty) {
    return res.render('admin_create_user', { user: req.session.user, error: 'Specialty is required for staff members.' });
  }

  const connection = await db.pool.getConnection();
  try {
    // Check if user already exists
    const [existingUsers] = await connection.query(
      'SELECT user_id FROM users WHERE email = ? OR phone = ?', 
      [email, phone]
    );
    if (existingUsers.length > 0) {
      throw new Error('Email or phone number is already in use.');
    }

    await connection.beginTransaction();

    // 1. Hash the password
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 2. Insert into 'users' table
    const [insertResult] = await connection.query(
      'INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, phone, password_hash, role]
    );
    
    const newUserId = insertResult.insertId;

    // 3. If role is 'staff', also insert into 'staff_details'
    if (role === 'staff') {
      await connection.query(
        'INSERT INTO staff_details (user_id, specialty) VALUES (?, ?)',
        [newUserId, specialty]
      );
    }

    // 4. If all good, commit
    await connection.commit();
    res.redirect('/admin/users');

  } catch (error) {
    await connection.rollback();
    console.error('Error creating new user:', error);
    res.render('admin_create_user', { 
      user: req.session.user, 
      error: error.message || 'An error occurred. Transaction rolled back.' 
    });
  } finally {
    connection.release();
  }
};

const blockAmenitySlot = async (req, res) => {
  const { amenity_id, booking_date, start_hour } = req.body;
  const adminUserId = req.session.user.id;

  if (!amenity_id || !booking_date || !start_hour) {
    return res.status(400).send('Missing required fields.');
  }

  const startTime = `${booking_date} ${start_hour}:00`;
  const endHour = parseInt(start_hour.split(':')[0]) + 1;
  const endTime = `${booking_date} ${endHour}:00:00`;

  try {
    const conflictSql = `
      SELECT booking_id FROM amenity_bookings
      WHERE amenity_id = ? AND start_time < ? AND end_time > ?
    `;
    const [conflicts] = await db.query(conflictSql, [amenity_id, endTime, startTime]);

    if (conflicts.length > 0) {
      const [amenities] = await db.query('SELECT amenity_id, name FROM amenities');
      
      // --- THIS SQL IS THE FIX ---
      const bookingsSql = `
        SELECT a.name AS amenity_name, u.full_name AS booker_name, u.role AS booker_role,
               b.start_time, b.end_time, b.total_cost
        FROM amenity_bookings b
        JOIN amenities a ON b.amenity_id = a.amenity_id
        JOIN users u ON b.user_id = u.user_id
        WHERE b.end_time > NOW()
        ORDER BY b.start_time ASC
      `;
      const [bookings] = await db.query(bookingsSql);
      
      return res.render('admin_bookings', {
        user: req.session.user,
        bookings: bookings,
        amenities: amenities,
        error: 'This time slot is already booked and cannot be blocked.'
      });
    }

    const insertSql = `
      INSERT INTO amenity_bookings (user_id, amenity_id, start_time, end_time, total_cost)
      VALUES (?, ?, ?, ?, 0.00)
    `;
    await db.query(insertSql, [adminUserId, amenity_id, startTime, endTime]);
    
    res.redirect('/admin/bookings');

  } catch (error) {
    console.error('Error blocking slot:', error);
    res.status(500).send('Internal Server Error');
  }
};

const showFlatList = async (req, res) => {
  try {
    // This query JOINS flats with flat_residents to see the status
    const sql = `
      SELECT 
        f.flat_id, f.wing, f.flat_number, f.sq_footage,
        fr.relationship, -- This will be 'Owner', 'Tenant', or NULL
        u.full_name AS resident_name
      FROM flats f
      LEFT JOIN flat_residents fr ON f.flat_id = fr.flat_id
      LEFT JOIN users u ON fr.user_id = u.user_id
      ORDER BY f.wing, f.flat_number;
    `;
    const [flats] = await db.query(sql);

    res.render('admin_flats', { 
      user: req.session.user, 
      flats: flats,
      error: null
    });

  } catch (error) {
    console.error('Error fetching flat list:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Create a new flat
const createFlat = async (req, res) => {
  const { wing, flat_number, sq_footage } = req.body;

  try {
    if (!wing || !flat_number) {
      throw new Error('Wing and Flat Number are required.');
    }

    const sql = 'INSERT INTO flats (wing, flat_number, sq_footage) VALUES (?, ?, ?)';
    await db.query(sql, [wing, flat_number, (sq_footage || null)]);
    
    res.redirect('/admin/flats');

  } catch (error) {
    console.error('Error creating flat:', error);
    const [flats] = await db.query('SELECT * FROM flats'); 
    res.render('admin_flats', {
      user: req.session.user,
      flats: flats,
      error: error.message
    });
  }
};

const unassignFlat = async (req, res) => {
  const flatId = req.params.id;
  try {
    await db.query('DELETE FROM flat_residents WHERE flat_id = ?', [flatId]);
    res.redirect('/admin/flats');

  } catch (error) {
    console.error('Error un-assigning flat:', error);
    res.status(500).send('Internal Server Error');
  }
};

const showAuditLog = async (req, res) => {
  try {
    const [logs] = await db.query(
      'SELECT * FROM audit_log ORDER BY log_timestamp DESC'
    );
    
    res.render('admin_audit_log', { 
      user: req.session.user, 
      logs: logs 
    });

  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).send('Internal Server Error');
  }
};



module.exports = {
  showDashboard,
  showAllComplaints, // Add new
  showAssignForm,    // Add new
  assignComplaint,
  showAllBills,     // Add new
  markBillAsPaid, 
  showAllBookings,
  generateMonthlyBills,
  showFinancialReports,
  showParkingDashboard,     // Add new
  showAssignParkingForm,    // Add new
  assignParkingSpot,        // Add new
  unassignParkingSpot,
  showAnnouncementsPage, // Add new
  postAnnouncement,      // Add new
  deleteAnnouncement,
  showUserList,        // Add new
  toggleUserActive,    // Add new
  showAssignFlatForm,  // Add new
  assignFlatToUser,
  showCreateUserForm,  // Add new
  createNewUser,
  deleteUser,
  addFine,
  blockAmenitySlot,
  showFlatList,     // Add new
  createFlat,       // Add new
  unassignFlat,
  showAuditLog   // Add new
};
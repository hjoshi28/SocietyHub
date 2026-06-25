// controllers/resident.controller.js
const db = require('../models/db'); // Make sure db is imported
const bcrypt = require('bcrypt'); // We need bcrypt here
const saltRounds = 10;
const crypto = require('crypto'); 

let razorpay;
const setRazorpayInstance = (instance) => {
  razorpay = instance;
};

const showDashboard = async (req, res) => {
  const userId = req.session.user.id;
  
  try {
    // We will run 4 queries in parallel for maximum speed
    
    // 1. Get Billing Summary
    const billSql = `
      SELECT COUNT(*) AS unpaid_count, SUM(amount) AS total_due
      FROM maintenance_bills b
      JOIN flat_residents fr ON b.flat_id = fr.flat_id
      WHERE fr.user_id = ? AND b.status = 'Unpaid'
    `;
    
    // 2. Get Latest Complaint Status
    const complaintSql = `
      SELECT title, status FROM complaints
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    // 3. Get Next Amenity Booking
    const bookingSql = `
      SELECT a.name AS amenity_name, b.start_time
      FROM amenity_bookings b
      JOIN amenities a ON b.amenity_id = a.amenity_id
      WHERE b.user_id = ? AND b.end_time > NOW()
      ORDER BY b.start_time ASC
      LIMIT 1
    `;
    
    // 4. Get Latest Announcement
    const announcementSql = `
      SELECT title, body FROM announcements
      ORDER BY created_at DESC
      LIMIT 1
    `;

    // Run all queries concurrently
    const [
      billResult, 
      complaintResult, 
      bookingResult, 
      announcementResult
    ] = await Promise.all([
      db.query(billSql, [userId]),
      db.query(complaintSql, [userId]),
      db.query(bookingSql, [userId]),
      db.query(announcementSql)
    ]);

    // Process the results
    const summary = {
      bills: billResult[0][0], // { unpaid_count: 0, total_due: null }
      complaint: complaintResult[0][0] || null, // { title: '...', status: '...' } or null
      booking: bookingResult[0][0] || null, // { amenity_name: '...', start_time: '...' } or null
      announcement: announcementResult[0][0] || null // { title: '...', body: '...' } or null
    };

    // Fix total_due if it's null
    if (!summary.bills.total_due) {
      summary.bills.total_due = 0;
    }

    res.render('resident_dashboard', { 
      user: req.session.user, 
      summary: summary 
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).send('Internal Server Error');
  }
};

// --- NEW COMPLAINT FUNCTIONS ---

// Show all of my complaints
const showComplaints = async (req, res) => {
  const userId = req.session.user.id;
  
  try {
    // This query JOINS complaints with staff users to get the staff's name
    const sql = `
      SELECT 
        c.title, c.description, c.status, c.created_at,
        s.full_name AS assigned_staff_name
      FROM complaints c
      LEFT JOIN users s ON c.assigned_to_staff_user_id = s.user_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `;
    const [complaints] = await db.query(sql, [userId]);
    
    res.render('resident_complaints', { 
      user: req.session.user, 
      complaints: complaints 
    });

  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Show the 'file new complaint' form
const showNewComplaintForm = (req, res) => {
  res.render('new_complaint', { 
    user: req.session.user, 
    error: null 
  });
};

// Handle the submission of a new complaint
const submitNewComplaint = async (req, res) => {
  const { title, description } = req.body;
  const userId = req.session.user.id;

  try {
    // We need to find the resident's flat_id
    const [flatRows] = await db.query(
      'SELECT flat_id FROM flat_residents WHERE user_id = ?', 
      [userId]
    );

    if (flatRows.length === 0) {
      // This user is not linked to a flat, so they can't file a complaint
      return res.render('new_complaint', {
        user: req.session.user,
        error: 'You are not associated with a flat. Cannot file complaint.'
      });
    }

    const flatId = flatRows[0].flat_id;

    // Now, insert the complaint
    const insertSql = `
      INSERT INTO complaints (user_id, flat_id, title, description, status)
      VALUES (?, ?, ?, ?, 'Pending')
    `;
    await db.query(insertSql, [userId, flatId, title, description]);

    // Redirect back to their list of complaints
    res.redirect('/resident/complaints');

  } catch (error) {
    console.error('Error submitting complaint:', error);
    res.render('new_complaint', {
      user: req.session.user,
      error: 'An error occurred. Please try again.'
    });
  }
};

// --- NEW AMENITY FUNCTIONS ---

// Show all amenities
const showAmenities = async (req, res) => {
  try {
    const [amenities] = await db.query('SELECT * FROM amenities');
    res.render('resident_amenities', { 
      user: req.session.user, 
      amenities: amenities 
    });
  } catch (error) {
    console.error('Error fetching amenities:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Show the booking page for one amenity, including its schedule
const showAmenityBookingPage = async (req, res) => {
  const amenityId = req.params.id;
  try {
    const [amenityRows] = await db.query('SELECT * FROM amenities WHERE amenity_id = ?', [amenityId]);
    if (amenityRows.length === 0) {
      return res.status(404).send('Amenity not found.');
    }

    // --- THIS SQL IS THE FIX ---
    const sql = `
      SELECT 
        b.start_time, b.end_time,
        u.full_name AS resident_name,
        u.role AS booker_role
      FROM amenity_bookings b
      JOIN users u ON b.user_id = u.user_id
      WHERE b.amenity_id = ? AND b.end_time > NOW() 
      ORDER BY b.start_time
    `;
    const [bookings] = await db.query(sql, [amenityId]);

    res.render('book_amenity', {
      user: req.session.user,
      amenity: amenityRows[0],
      bookings: bookings,
      error: null
    });

  } catch (error) {
    console.error('Error fetching amenity details:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Handle the booking submission
const bookAmenity = async (req, res) => {
  const amenityId = req.params.id;
  const userId = req.session.user.id;
  const { booking_date, start_hour } = req.body; // e.g., '2025-12-25', '14:00'

  // --- Data Validation (Simple) ---
  if (!booking_date || !start_hour) {
    // This is basic. A real app would need more complex date validation.
    return res.status(400).send('Date and start hour are required.');
  }

  // --- Create timestamps ---
  // We'll assume all bookings are for 1 hour
  const startTime = `${booking_date} ${start_hour}:00`;
  // Simple way to add 1 hour
  const endHour = parseInt(start_hour.split(':')[0]) + 1;
  const endTime = `${booking_date} ${endHour}:00:00`;

  try {
    // --- THIS IS THE CRITICAL QUERY ---
    // Check for conflicting bookings
    const conflictSql = `
      SELECT booking_id FROM amenity_bookings
      WHERE amenity_id = ? 
      AND (
        (start_time < ? AND end_time > ?) OR -- Overlaps the start
        (start_time < ? AND end_time > ?) OR -- Overlaps the end
        (start_time >= ? AND end_time <= ?)   -- Is contained within
      )
    `;
    const [conflicts] = await db.query(conflictSql, [
      amenityId, 
      endTime, startTime, // Overlaps start
      endTime, startTime, // Overlaps end (Note: this is simplified, better logic exists)
      startTime, endTime  // Contained within
    ]);
    
    // A simpler (and often better) conflict check is just:
    // WHERE amenity_id = ? AND start_time < ? AND end_time > ?
    // We'll stick to the one above as it's more explicit
    // Let's use the simpler one, it's more robust:
    const simplerConflictSql = `
      SELECT booking_id FROM amenity_bookings
      WHERE amenity_id = ? AND start_time < ? AND end_time > ?
    `;
    const [simpleConflicts] = await db.query(simplerConflictSql, [amenityId, endTime, startTime]);


    if (simpleConflicts.length > 0) {
      // CONFLICT FOUND! Re-render the page with an error.
      // We need to re-fetch the data for the render.
      const [amenityRows] = await db.query('SELECT * FROM amenities WHERE amenity_id = ?', [amenityId]);
      const [bookings] = await db.query('SELECT b.start_time, b.end_time, u.full_name AS resident_name FROM amenity_bookings b JOIN users u ON b.user_id = u.user_id WHERE b.amenity_id = ? AND b.start_time >= CURDATE() ORDER BY b.start_time', [amenityId]);

      return res.render('book_amenity', {
        user: req.session.user,
        amenity: amenityRows[0],
        bookings: bookings,
        error: 'This time slot is already booked. Please choose another.'
      });
    }
    
    // --- NO CONFLICT: Proceed with booking ---
    // Get amenity cost
    const [amenityRows] = await db.query('SELECT hourly_cost FROM amenities WHERE amenity_id = ?', [amenityId]);
    const cost = amenityRows[0].hourly_cost; // Assuming 1-hour booking

    const insertSql = `
      INSERT INTO amenity_bookings (user_id, amenity_id, start_time, end_time, total_cost)
      VALUES (?, ?, ?, ?, ?)
    `;
    await db.query(insertSql, [userId, amenityId, startTime, endTime, cost]);

    // Redirect to the amenity page, where they'll see their new booking
    res.redirect(`/resident/amenities/${amenityId}`);

  } catch (error) {
    console.error('Error booking amenity:', error);
    res.status(500).send('Internal Server Error');
  }
};

const showMyBills = async (req, res) => {
  const userId = req.session.user.id;
  try {
    const sql = `
      SELECT 
        b.bill_id, b.amount, b.description, b.due_date, b.status, b.generated_at,
        f.wing, f.flat_number
      FROM maintenance_bills b
      JOIN flats f ON b.flat_id = f.flat_id
      JOIN flat_residents fr ON f.flat_id = fr.flat_id
      WHERE fr.user_id = ?
      ORDER BY b.due_date DESC
    `;
    const [bills] = await db.query(sql, [userId]);
    const [unpaidResult] = await db.query(
      `SELECT SUM(b.amount) AS total_unpaid
       FROM maintenance_bills b
       JOIN flat_residents fr ON b.flat_id = fr.flat_id
       WHERE fr.user_id = ? AND b.status = 'Unpaid'`,
      [userId]
    );
    const totalUnpaid = unpaidResult[0].total_unpaid || 0;
    res.render('resident_bills', { 
      user: req.session.user, 
      bills: bills,
      totalUnpaid: totalUnpaid
    });
  } catch (error) {
    console.error('Error fetching resident bills:', error);
    res.status(500).send('Internal Server Error');
  }
};

// --- NEW PAYMENT FUNCTIONS ---

// Show page to pay a SINGLE bill
const showPaySingleBillPage = async (req, res) => {
  const billId = req.params.id;
  try {
    const [billRows] = await db.query('SELECT amount FROM maintenance_bills WHERE bill_id = ? AND status = \'Unpaid\'', [billId]);
    if (billRows.length === 0) {
      return res.status(404).send('Bill not found or already paid.');
    }
    res.render('resident_pay_bill', {
      user: req.session.user,
      totalAmount: billRows[0].amount,
      billIds: [billId], // Pass as an array
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error fetching single bill for payment:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Show page to pay ALL unpaid bills
const showPayAllBillsPage = async (req, res) => {
  const userId = req.session.user.id;
  try {
    const sql = `
      SELECT GROUP_CONCAT(b.bill_id) AS all_ids, SUM(b.amount) AS total_due
      FROM maintenance_bills b
      JOIN flat_residents fr ON b.flat_id = fr.flat_id
      WHERE fr.user_id = ? AND b.status = 'Unpaid'
    `;
    const [result] = await db.query(sql, [userId]);
    const { all_ids, total_due } = result[0];
    if (!total_due) {
      return res.redirect('/resident/bills'); // No unpaid bills
    }
    res.render('resident_pay_bill', {
      user: req.session.user,
      totalAmount: total_due,
      billIds: all_ids.split(','), // Pass all IDs as an array
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error fetching all unpaid bills:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Backend: Create Razorpay Order
const createPaymentOrder = async (req, res) => {
  const { amount, bill_ids } = req.body;
  
  // Razorpay amounts are in the smallest currency unit (e.g., paise)
  const amountInPaise = Math.round(parseFloat(amount) * 100);

  const options = {
    amount: amountInPaise,
    currency: "INR",
    receipt: `receipt_bills_${bill_ids.replace(',', '_')}`,
    notes: {
      bill_ids: bill_ids,
      user_id: req.session.user.id
    }
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order); // Send the order details to the frontend
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create payment order.' });
  }
};

// Backend: Verify Razorpay Payment
const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bill_ids } = req.body;
  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generated_signature = hmac.digest('hex');

  if (generated_signature === razorpay_signature) {
    // Payment is authentic
    try {
      const billIdsArray = bill_ids.split(',').map(id => parseInt(id));
      const sql = "UPDATE maintenance_bills SET status = 'Paid' WHERE bill_id IN (?) AND status = 'Unpaid'";
      await db.query(sql, [billIdsArray]);
      
      res.json({ success: true, message: 'Payment verified and bills updated.' });
    } catch (dbError) {
      console.error('Error updating database:', dbError);
      res.status(500).json({ success: false, message: 'Payment verified, but failed to update database.' });
    }
  } else {
    // Payment verification failed
    res.status(400).json({ success: false, message: 'Payment verification failed.' });
  }
};


// --- NEW VISITOR FUNCTIONS ---

// Function to get the resident's flat_id
const getResidentFlatId = async (userId) => {
  const [flatRows] = await db.query(
    'SELECT flat_id FROM flat_residents WHERE user_id = ? LIMIT 1',
    [userId]
  );
  if (flatRows.length === 0) {
    throw new Error('Resident not associated with any flat.');
  }
  return flatRows[0].flat_id;
};

// Show all visitors (past and pre-registered) for my flat
const showMyVisitors = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const flatId = await getResidentFlatId(userId); // Uses the helper function

    // --- THIS SQL QUERY IS NOW FIXED ---
    const sql = `
      SELECT name, phone, expected_check_in, actual_check_in, actual_check_out 
      FROM visitors 
      WHERE flat_id = ?
      ORDER BY 
        CASE 
          WHEN actual_check_in IS NOT NULL THEN actual_check_in
          ELSE expected_check_in 
        END DESC, 
        visitor_id DESC
    `;
    const [visitors] = await db.query(sql, [flatId]);

    res.render('resident_visitors', { 
      user: req.session.user, 
      visitors: visitors 
    });

  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).send('Internal ServerError');
  }
};

// Show the form to pre-register a new visitor
const showNewVisitorForm = (req, res) => {
  res.render('new_visitor', { 
    user: req.session.user, 
    error: null 
  });
};

// Handle the pre-registration submission
const preRegisterVisitor = async (req, res) => {
  // Get the new field from the form
  const { name, phone, expected_check_in } = req.body;
  
  try {
    const userId = req.session.user.id;
    const flatId = await getResidentFlatId(userId); // Uses the helper function

    if (!name || !phone || !expected_check_in) {
      return res.render('new_visitor', { 
        user: req.session.user, 
        error: 'All fields are required.' 
      });
    }

    // Insert the visitor with the expected time
    const insertSql = `
      INSERT INTO visitors (name, phone, flat_id, expected_check_in)
      VALUES (?, ?, ?, ?)
    `;
    // Add expected_check_in to the parameters
    await db.query(insertSql, [name, phone, flatId, expected_check_in]);

    // Redirect back to their list of visitors
    res.redirect('/resident/visitors');

  } catch (error) {
    console.error('Error pre-registering visitor:', error);
    res.render('new_visitor', {
      user: req.session.user,
      error: 'An error occurred. Please try again.'
    });
  }
};

const showMyParking = async (req, res) => {
  const userId = req.session.user.id;
  
  try {
    // This query JOINS vehicles and parking_slots to get all details
    const sql = `
      SELECT 
        v.vehicle_number, v.vehicle_type,
        ps.slot_number, ps.is_covered
      FROM vehicles v
      JOIN parking_slots ps ON v.slot_id = ps.slot_id
      WHERE v.user_id = ?
    `;
    const [parkingDetails] = await db.query(sql, [userId]);

    res.render('resident_parking', { 
      user: req.session.user, 
      // Send the first result (or null if they have no spot)
      parking: parkingDetails[0] || null 
    });

  } catch (error) {
    console.error('Error fetching parking details:', error);
    res.status(500).send('Internal Server Error');
  }
};

const showAnnouncements = async (req, res) => {
  try {
    // This is the same query as the admin side
    const sql = `
      SELECT a.title, a.body, a.created_at, u.full_name AS posted_by
      FROM announcements a
      JOIN users u ON a.created_by_user_id = u.user_id
      ORDER BY a.created_at DESC
    `;
    const [announcements] = await db.query(sql);

    res.render('resident_announcements', { 
      user: req.session.user, 
      announcements: announcements 
    });

  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).send('Internal Server Error');
  }
};
const showMyProfile = async (req, res) => {
  const userId = req.session.user.id;
  
  try {
    // Query 1: Get flat details
    const flatSql = `
      SELECT f.wing, f.flat_number, fr.relationship
      FROM flat_residents fr
      JOIN flats f ON fr.flat_id = f.flat_id
      WHERE fr.user_id = ?
    `;
    
    // Query 2: Get ALL vehicles for this user
    const vehicleSql = 'SELECT * FROM vehicles WHERE user_id = ?';
    
    // Query 3: Get the user's assigned parking spot
    const parkingSql = 'SELECT slot_number, is_covered FROM parking_slots WHERE assigned_to_user_id = ?';

    // Run all queries concurrently
    const [flatResult, vehicleResult, parkingResult] = await Promise.all([
      db.query(flatSql, [userId]),
      db.query(vehicleSql, [userId]),
      db.query(parkingSql, [userId])
    ]);

    const flat = flatResult[0].length > 0 ? flatResult[0][0] : null;
    const vehicles = vehicleResult[0]; // This is now an array
    const parking = parkingResult[0].length > 0 ? parkingResult[0][0] : null;

    res.render('resident_profile', {
      user: req.session.user,
      flat: flat,
      vehicles: vehicles, // Pass the full array
      parking: parking
    });

  } catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).send('Internal Server Error');
  }
};
const showEditProfileForm = (req, res) => {
  res.render('resident_edit_profile', {
    user: req.session.user,
    error: null,
    success: null
  });
};

// Process the update for name and phone
const updateProfile = async (req, res) => {
  const { full_name, phone } = req.body;
  const userId = req.session.user.id;

  try {
    // Check if new phone number is already in use by ANOTHER user
    const [existing] = await db.query(
      'SELECT user_id FROM users WHERE phone = ? AND user_id != ?',
      [phone, userId]
    );

    if (existing.length > 0) {
      return res.render('resident_edit_profile', {
        user: req.session.user,
        error: 'That phone number is already in use by another account.',
        success: null
      });
    }

    // Update the user
    await db.query(
      'UPDATE users SET full_name = ?, phone = ? WHERE user_id = ?',
      [full_name, phone, userId]
    );

    // IMPORTANT: Update the session data
    req.session.user.name = full_name;
    req.session.user.phone = phone;

    // Re-render the form with a success message
    res.render('resident_edit_profile', {
      user: req.session.user,
      error: null,
      success: 'Your profile has been updated successfully.'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.render('resident_edit_profile', {
      user: req.session.user,
      error: 'An error occurred. Please try again.',
      success: null
    });
  }
};

// Process a password change
const changePassword = async (req, res) => {
  const { old_password, new_password } = req.body;
  const userId = req.session.user.id;

  try {
    // 1. Get the user's current password hash
    const [userRows] = await db.query(
      'SELECT password_hash FROM users WHERE user_id = ?',
      [userId]
    );
    const hash = userRows[0].password_hash;

    // 2. Compare the old password with the hash
    const match = await bcrypt.compare(old_password, hash);

    if (!match) {
      // Old password did not match
      return res.render('resident_edit_profile', {
        user: req.session.user,
        error: 'Your "Old Password" was incorrect.',
        success: null
      });
    }

    // 3. Hash the new password
    const new_password_hash = await bcrypt.hash(new_password, saltRounds);

    // 4. Update the database
    await db.query(
      'UPDATE users SET password_hash = ? WHERE user_id = ?',
      [new_password_hash, userId]
    );

    // 5. Render with success
    res.render('resident_edit_profile', {
      user: req.session.user,
      error: null,
      success: 'Your password has been changed successfully.'
    });

  } catch (error) {
    console.error('Error changing password:', error);
    res.render('resident_edit_profile', {
      user: req.session.user,
      error: 'An error occurred. Please try again.',
      success: null
    });
  }
};

const showMyBookings = async (req, res) => {
  const userId = req.session.user.id;

  try {
    // Get all bookings for this user where the end time is in the future
    const sql = `
      SELECT 
        a.name AS amenity_name,
        b.start_time,
        b.end_time,
        b.total_cost
      FROM amenity_bookings b
      JOIN amenities a ON b.amenity_id = a.amenity_id
      WHERE b.user_id = ? AND b.end_time > NOW()
      ORDER BY b.start_time ASC
    `;
    const [bookings] = await db.query(sql, [userId]);

    res.render('resident_my_bookings', {
      user: req.session.user,
      bookings: bookings
    });

  } catch (error) {
    console.error('Error fetching my bookings:', error);
    res.status(500).send('Internal Server Error');
  }
};

const handlePayment = async (req, res) => {
  const { bill_ids } = req.body;
  const screenshotFile = req.file; // From multer
  
  if (!screenshotFile) {
    return res.status(400).send('Screenshot file is required.');
  }
  
  // Get the path to save in DB
  const screenshotPath = '/uploads/screenshots/' + screenshotFile.filename;
  
  try {
    // Convert bill_ids string (e.g., "1,2,3") into an array for the query
    const billIdsArray = bill_ids.split(',').map(id => parseInt(id));

    // Update all bills in the array
    const sql = `
      UPDATE maintenance_bills
      SET status = 'Pending Verification', screenshot_path = ?
      WHERE bill_id IN (?) AND status = 'Unpaid'
    `;
    await db.query(sql, [screenshotPath, billIdsArray]);
    
    // Redirect to the main bills page
    res.redirect('/resident/bills');

  } catch (error) {
    console.error('Error handling payment upload:', error);
    res.status(500).send('Internal Server Error');
  }
};

// This route can just re-use the same handlePayment function
const handlePayAll = async (req, res) => {
  await handlePayment(req, res);
};
const addVehicle = async (req, res) => {
  const { vehicle_number, vehicle_type } = req.body;
  const userId = req.session.user.id;

  try {
    // Check for duplicate vehicle number (it's a UNIQUE key)
    const [existing] = await db.query('SELECT vehicle_id FROM vehicles WHERE vehicle_number = ?', [vehicle_number]);
    if (existing.length > 0) {
      // Handle error - for now, just redirect
      // A better way would be to show an error on the profile page
      return res.redirect('/resident/profile');
    }

    // Insert the new vehicle
    const sql = 'INSERT INTO vehicles (user_id, vehicle_number, vehicle_type) VALUES (?, ?, ?)';
    await db.query(sql, [userId, vehicle_number, vehicle_type]);

    res.redirect('/resident/profile');

  } catch (error) {
    console.error('Error adding vehicle:', error);
    res.redirect('/resident/profile'); // Redirect on error
  }
};

const removeVehicle = async (req, res) => {
  const vehicleId = req.params.id;
  const userId = req.session.user.id;

  try {
    // Delete the vehicle
    // We also check user_id in the WHERE clause for security,
    // ensuring a user can only delete their *own* vehicles.
    const sql = 'DELETE FROM vehicles WHERE vehicle_id = ? AND user_id = ?';
    await db.query(sql, [vehicleId, userId]);

    res.redirect('/resident/profile');

  } catch (error) {
    console.error('Error removing vehicle:', error);
    res.redirect('/resident/profile');

};
}
module.exports = {
  
  

 
  
  
  setRazorpayInstance, 
  showDashboard,
  showAnnouncements,
  showMyProfile,
  showEditProfileForm,
  updateProfile,
  changePassword,
  showComplaints,
  showNewComplaintForm,
  submitNewComplaint,
  showAmenities,
  showAmenityBookingPage,
  bookAmenity,
  showMyBookings,
  getResidentFlatId,
  showMyVisitors,
  showNewVisitorForm,
  preRegisterVisitor,
  showMyParking,
  showMyBills,
  showPaySingleBillPage,
  showPayAllBillsPage,
  createPaymentOrder,
  verifyPayment,
  addVehicle,      // Add new
  removeVehicle
};


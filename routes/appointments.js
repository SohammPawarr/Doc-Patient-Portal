const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { 
  getAppointmentsByUserId, 
  getAppointmentById,
  getAppointmentByToken,
  createAppointment, 
  updateAppointment,
  deleteAppointment,
  findUserById
} = require('../utils/database');
const { sendAppointmentNotification, sendPatientConfirmation, sendStatusUpdateEmail } = require('../utils/emailService');

const router = express.Router();

// Middleware to verify JWT token
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Book a new appointment (protected)
router.post('/book', authMiddleware, async (req, res) => {
  try {
    const { 
      appointmentDate, 
      appointmentTime, 
      healthConcern, 
      symptoms,
      preferredDoctor 
    } = req.body;

    // Validation
    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'Date and time are required' });
    }

    // Get user details
    const user = findUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create appointment
    const appointment = {
      id: uuidv4(),
      confirmationToken: uuidv4(), // Token for confirm/reject via email
      userId: req.userId,
      patientName: user.name,
      patientEmail: user.email,
      patientPhone: user.phone || '',
      appointmentDate,
      appointmentTime,
      healthConcern: healthConcern || '',
      symptoms: symptoms || '',
      preferredDoctor: preferredDoctor || 'Dr. Neelam Pandey',
      status: 'pending', // pending, confirmed, completed, cancelled, rejected
      createdAt: new Date().toISOString()
    };

    createAppointment(appointment);

    // Send email notifications
    const clinicEmailResult = await sendAppointmentNotification(appointment);
    const patientEmailResult = await sendPatientConfirmation(appointment);

    res.status(201).json({
      message: 'Appointment booked successfully!',
      appointment,
      emailNotifications: {
        clinicNotified: clinicEmailResult.success,
        patientNotified: patientEmailResult.success
      }
    });

  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// Book appointment without login (guest booking)
router.post('/book-guest', async (req, res) => {
  try {
    const { 
      patientName,
      patientEmail,
      patientPhone,
      appointmentDate, 
      appointmentTime, 
      healthConcern, 
      symptoms,
      preferredDoctor 
    } = req.body;

    // Validation
    if (!patientName || !patientEmail || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'Name, email, date and time are required' });
    }

    // Create appointment
    const appointment = {
      id: uuidv4(),
      confirmationToken: uuidv4(), // Token for confirm/reject via email
      userId: null, // Guest booking
      patientName,
      patientEmail,
      patientPhone: patientPhone || '',
      appointmentDate,
      appointmentTime,
      healthConcern: healthConcern || '',
      symptoms: symptoms || '',
      preferredDoctor: preferredDoctor || 'Dr. Neelam Pandey',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    createAppointment(appointment);

    // Send email notifications
    const clinicEmailResult = await sendAppointmentNotification(appointment);
    const patientEmailResult = await sendPatientConfirmation(appointment);

    res.status(201).json({
      message: 'Appointment booked successfully!',
      appointment,
      emailNotifications: {
        clinicNotified: clinicEmailResult.success,
        patientNotified: patientEmailResult.success
      }
    });

  } catch (error) {
    console.error('Guest booking error:', error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// Get user's appointments (protected)
router.get('/my-appointments', authMiddleware, (req, res) => {
  try {
    const appointments = getAppointmentsByUserId(req.userId);
    
    // Sort by date (newest first)
    appointments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ appointments });
  } catch (error) {
    console.error('Fetch appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get single appointment (protected)
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const appointment = getAppointmentById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check if appointment belongs to user
    if (appointment.userId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ appointment });
  } catch (error) {
    console.error('Fetch appointment error:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// Cancel appointment (protected)
router.put('/:id/cancel', authMiddleware, (req, res) => {
  try {
    const appointment = getAppointmentById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.userId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = updateAppointment(req.params.id, { 
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    });

    res.json({ message: 'Appointment cancelled', appointment: updated });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// Reschedule appointment (protected)
router.put('/:id/reschedule', authMiddleware, (req, res) => {
  try {
    const { appointmentDate, appointmentTime } = req.body;

    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'New date and time are required' });
    }

    const appointment = getAppointmentById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.userId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = updateAppointment(req.params.id, { 
      appointmentDate,
      appointmentTime,
      status: 'pending', // Reset to pending for re-confirmation
      rescheduledAt: new Date().toISOString()
    });

    res.json({ message: 'Appointment rescheduled', appointment: updated });
  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(500).json({ error: 'Failed to reschedule appointment' });
  }
});

// Confirm appointment via email link (no auth required - uses token)
router.get('/confirm/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const appointment = getAppointmentByToken(token);
    
    if (!appointment) {
      return res.send(getResponsePage('error', 'Invalid or expired confirmation link.'));
    }

    if (appointment.status === 'confirmed') {
      return res.send(getResponsePage('info', 'This appointment has already been confirmed.'));
    }

    if (appointment.status === 'cancelled' || appointment.status === 'rejected') {
      return res.send(getResponsePage('error', 'This appointment has been cancelled and cannot be confirmed.'));
    }

    // Update appointment status
    const updated = updateAppointment(appointment.id, { 
      status: 'confirmed',
      confirmedAt: new Date().toISOString()
    });

    // Send confirmation email to patient
    await sendStatusUpdateEmail(appointment, 'confirmed');

    res.send(getResponsePage('success', `Appointment for ${appointment.patientName} on ${appointment.appointmentDate} at ${appointment.appointmentTime} has been confirmed! The patient has been notified via email.`));

  } catch (error) {
    console.error('Confirm error:', error);
    res.send(getResponsePage('error', 'Failed to confirm appointment. Please try again.'));
  }
});

// Reject appointment via email link (no auth required - uses token)
router.get('/reject/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const appointment = getAppointmentByToken(token);
    
    if (!appointment) {
      return res.send(getResponsePage('error', 'Invalid or expired confirmation link.'));
    }

    if (appointment.status === 'rejected') {
      return res.send(getResponsePage('info', 'This appointment has already been rejected.'));
    }

    if (appointment.status === 'confirmed') {
      return res.send(getResponsePage('error', 'This appointment has already been confirmed. Please cancel it from the dashboard if needed.'));
    }

    // Update appointment status
    const updated = updateAppointment(appointment.id, { 
      status: 'rejected',
      rejectedAt: new Date().toISOString()
    });

    // Send rejection email to patient
    await sendStatusUpdateEmail(appointment, 'rejected');

    res.send(getResponsePage('rejected', `Appointment for ${appointment.patientName} on ${appointment.appointmentDate} has been rejected. The patient has been notified via email.`));

  } catch (error) {
    console.error('Reject error:', error);
    res.send(getResponsePage('error', 'Failed to reject appointment. Please try again.'));
  }
});

// Helper function to generate response HTML page
const getResponsePage = (type, message) => {
  const config = {
    success: { icon: '✅', title: 'Appointment Confirmed!', color: '#10b981', bgColor: '#d1fae5' },
    rejected: { icon: '❌', title: 'Appointment Rejected', color: '#ef4444', bgColor: '#fee2e2' },
    error: { icon: '⚠️', title: 'Error', color: '#f59e0b', bgColor: '#fef3c7' },
    info: { icon: 'ℹ️', title: 'Information', color: '#3b82f6', bgColor: '#dbeafe' }
  };

  const { icon, title, color, bgColor } = config[type] || config.error;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - DocClinic</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          background: linear-gradient(135deg, #c41e3a 0%, #a01830 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .icon { font-size: 64px; margin-bottom: 20px; }
        .title { font-size: 24px; color: ${color}; margin-bottom: 15px; font-weight: 700; }
        .message { 
          background: ${bgColor}; 
          color: #333; 
          padding: 20px; 
          border-radius: 10px; 
          line-height: 1.6;
          border-left: 4px solid ${color};
        }
        .footer { margin-top: 30px; color: #666; font-size: 14px; }
        .clinic-name { color: #c41e3a; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${icon}</div>
        <h1 class="title">${title}</h1>
        <div class="message">${message}</div>
        <div class="footer">
          <p class="clinic-name">🌿 Dr. Neelam Pandey's Homeopathy Clinic</p>
          <p style="margin-top: 10px;">You can close this window now.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = router;

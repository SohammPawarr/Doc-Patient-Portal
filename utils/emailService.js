const nodemailer = require('nodemailer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Create reusable transporter with explicit SMTP settings
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use TLS
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000
  });
};

// Send appointment notification to clinic
const sendAppointmentNotification = async (appointmentData) => {
  const transporter = createTransporter();
  
  const { 
    id,
    confirmationToken,
    patientName, 
    patientEmail, 
    patientPhone, 
    appointmentDate, 
    appointmentTime, 
    healthConcern,
    symptoms,
    preferredDoctor 
  } = appointmentData;

  const confirmUrl = `${BASE_URL}/api/appointments/confirm/${confirmationToken}`;
  const rejectUrl = `${BASE_URL}/api/appointments/reject/${confirmationToken}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #c41e3a 0%, #a01830 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .info-row { display: flex; border-bottom: 1px solid #eee; padding: 15px 0; }
        .info-label { width: 150px; color: #666; font-weight: 600; }
        .info-value { flex: 1; color: #333; }
        .highlight { background: #fef2f2; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #c41e3a; }
        .highlight h3 { margin: 0 0 10px; color: #c41e3a; }
        .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .badge { display: inline-block; background: #c41e3a; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .action-buttons { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; padding: 15px 40px; margin: 0 10px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; }
        .btn-confirm { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; }
        .btn-reject { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏥 New Appointment Booking</h1>
          <p>A new patient has requested an appointment</p>
        </div>
        <div class="content">
          <div class="highlight">
            <h3>📅 Appointment Details</h3>
            <p><strong>Date:</strong> ${appointmentDate}</p>
            <p><strong>Time:</strong> ${appointmentTime}</p>
            <span class="badge">PENDING CONFIRMATION</span>
          </div>
          
          <h3 style="color: #333; margin-bottom: 15px;">👤 Patient Information</h3>
          
          <div class="info-row">
            <div class="info-label">Full Name</div>
            <div class="info-value">${patientName}</div>
          </div>
          
          <div class="info-row">
            <div class="info-label">Email</div>
            <div class="info-value"><a href="mailto:${patientEmail}">${patientEmail}</a></div>
          </div>
          
          <div class="info-row">
            <div class="info-label">Phone</div>
            <div class="info-value"><a href="tel:${patientPhone}">${patientPhone}</a></div>
          </div>
          
          <div class="info-row">
            <div class="info-label">Health Concern</div>
            <div class="info-value">${healthConcern || 'Not specified'}</div>
          </div>
          
          <div class="info-row">
            <div class="info-label">Symptoms</div>
            <div class="info-value">${symptoms || 'Not provided'}</div>
          </div>
          
          <div class="info-row">
            <div class="info-label">Preferred Doctor</div>
            <div class="info-value">${preferredDoctor || 'Dr. Neelam Pandey'}</div>
          </div>

          <div class="action-buttons">
            <a href="${confirmUrl}" class="btn btn-confirm">✅ Confirm Appointment</a>
            <a href="${rejectUrl}" class="btn btn-reject">❌ Reject</a>
          </div>
          
          <p style="text-align: center; color: #666; font-size: 14px;">
            Click the buttons above to confirm or reject this appointment.<br>
            The patient will receive an automatic email notification.
          </p>
        </div>
        <div class="footer">
          <p>This email was sent from DocClinic Appointment System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"DocClinic Appointments" <${process.env.GMAIL_USER}>`,
    to: process.env.CLINIC_EMAIL,
    subject: `🏥 New Appointment: ${patientName} - ${appointmentDate} at ${appointmentTime}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Appointment notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send confirmation email to patient
const sendPatientConfirmation = async (appointmentData) => {
  const transporter = createTransporter();
  
  const { patientName, patientEmail, appointmentDate, appointmentTime } = appointmentData;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #c41e3a 0%, #a01830 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .appointment-card { background: #fef2f2; padding: 25px; border-radius: 15px; text-align: center; margin: 20px 0; }
        .appointment-card h2 { color: #c41e3a; margin: 0 0 15px; }
        .appointment-card .date { font-size: 24px; font-weight: 700; color: #333; }
        .appointment-card .time { font-size: 18px; color: #666; margin-top: 5px; }
        .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .note { background: #fff3cd; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ffc107; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Appointment Request Received</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>Thank you for booking an appointment with Dr. Neelam Pandey's Homeopathy Clinic.</p>
          
          <div class="appointment-card">
            <h2>📅 Your Appointment</h2>
            <div class="date">${appointmentDate}</div>
            <div class="time">🕐 ${appointmentTime}</div>
          </div>
          
          <div class="note">
            <strong>⏳ Pending Confirmation</strong>
            <p style="margin: 10px 0 0;">Your appointment request has been received. We will contact you shortly to confirm the appointment.</p>
          </div>
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <p style="margin-top: 30px;">
            Warm regards,<br>
            <strong>Dr. Neelam Pandey</strong><br>
            <em>Homeopathy Clinic</em>
          </p>
        </div>
        <div class="footer">
          <p>🌿 Healing Naturally, One Patient at a Time</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Dr. Neelam Pandey - Homeopathy Clinic" <${process.env.GMAIL_USER}>`,
    to: patientEmail,
    subject: `✅ Appointment Request Received - ${appointmentDate}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Patient confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending patient email:', error);
    return { success: false, error: error.message };
  }
};

// Send status update email to patient (confirmed/rejected)
const sendStatusUpdateEmail = async (appointmentData, status) => {
  const transporter = createTransporter();
  
  const { patientName, patientEmail, appointmentDate, appointmentTime } = appointmentData;
  
  const isConfirmed = status === 'confirmed';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, ${isConfirmed ? '#10b981 0%, #059669' : '#ef4444 0%, #dc2626'} 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .status-card { background: ${isConfirmed ? '#d1fae5' : '#fee2e2'}; padding: 25px; border-radius: 15px; text-align: center; margin: 20px 0; border-left: 4px solid ${isConfirmed ? '#10b981' : '#ef4444'}; }
        .status-card h2 { color: ${isConfirmed ? '#059669' : '#dc2626'}; margin: 0 0 15px; }
        .status-card .date { font-size: 24px; font-weight: 700; color: #333; }
        .status-card .time { font-size: 18px; color: #666; margin-top: 5px; }
        .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .note { background: ${isConfirmed ? '#d1fae5' : '#fef3c7'}; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 4px solid ${isConfirmed ? '#10b981' : '#f59e0b'}; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isConfirmed ? '✅ Appointment Confirmed!' : '❌ Appointment Update'}</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${patientName}</strong>,</p>
          
          ${isConfirmed ? `
            <p>Great news! Your appointment has been <strong>confirmed</strong> by the clinic.</p>
            
            <div class="status-card">
              <h2>📅 Your Confirmed Appointment</h2>
              <div class="date">${appointmentDate}</div>
              <div class="time">🕐 ${appointmentTime}</div>
            </div>
            
            <div class="note">
              <strong>📋 Please Remember:</strong>
              <ul style="margin: 10px 0 0; padding-left: 20px;">
                <li>Arrive 10-15 minutes before your appointment time</li>
                <li>Bring any previous medical reports</li>
                <li>Prepare a list of your current medications</li>
              </ul>
            </div>
          ` : `
            <p>We regret to inform you that your appointment request could not be confirmed at this time.</p>
            
            <div class="status-card">
              <h2>📅 Appointment Details</h2>
              <div class="date">${appointmentDate}</div>
              <div class="time">🕐 ${appointmentTime}</div>
            </div>
            
            <div class="note">
              <strong>💡 What to do next:</strong>
              <p style="margin: 10px 0 0;">Please contact the clinic or book a new appointment for an alternative date/time.</p>
            </div>
          `}
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <p style="margin-top: 30px;">
            Warm regards,<br>
            <strong>Dr. Neelam Pandey</strong><br>
            <em>Homeopathy Clinic</em>
          </p>
        </div>
        <div class="footer">
          <p>🌿 Healing Naturally, One Patient at a Time</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Dr. Neelam Pandey - Homeopathy Clinic" <${process.env.GMAIL_USER}>`,
    to: patientEmail,
    subject: isConfirmed 
      ? `✅ Appointment Confirmed - ${appointmentDate} at ${appointmentTime}`
      : `❌ Appointment Update - ${appointmentDate}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Status update email sent (${status}):`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending status email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendAppointmentNotification,
  sendPatientConfirmation,
  sendStatusUpdateEmail
};

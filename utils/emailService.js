const { Resend } = require('resend');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// From email - Resend requires verified domain or use their default
const FROM_EMAIL = 'DocClinic <onboarding@resend.dev>';

// Send appointment notification to clinic
const sendAppointmentNotification = async (appointmentData) => {
  const { 
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
        .content { padding: 30px; }
        .info-row { border-bottom: 1px solid #eee; padding: 15px 0; }
        .info-label { color: #666; font-weight: 600; }
        .info-value { color: #333; }
        .highlight { background: #fef2f2; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #c41e3a; }
        .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .badge { display: inline-block; background: #c41e3a; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .btn { display: inline-block; padding: 15px 40px; margin: 10px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; }
        .btn-confirm { background: #10b981; color: white; }
        .btn-reject { background: #ef4444; color: white; }
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
            <h3 style="color: #c41e3a; margin: 0 0 10px;">📅 Appointment Details</h3>
            <p><strong>Date:</strong> ${appointmentDate}</p>
            <p><strong>Time:</strong> ${appointmentTime}</p>
            <span class="badge">PENDING CONFIRMATION</span>
          </div>
          
          <h3 style="color: #333; margin-bottom: 15px;">👤 Patient Information</h3>
          
          <div class="info-row">
            <span class="info-label">Full Name:</span>
            <span class="info-value">${patientName}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${patientEmail}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Phone:</span>
            <span class="info-value">${patientPhone}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Health Concern:</span>
            <span class="info-value">${healthConcern || 'Not specified'}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Symptoms:</span>
            <span class="info-value">${symptoms || 'Not provided'}</span>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmUrl}" class="btn btn-confirm">✅ Confirm Appointment</a>
            <a href="${rejectUrl}" class="btn btn-reject">❌ Reject</a>
          </div>
          
          <p style="text-align: center; color: #666; font-size: 14px;">
            Click the buttons above to confirm or reject this appointment.
          </p>
        </div>
        <div class="footer">
          <p>This email was sent from DocClinic Appointment System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [process.env.CLINIC_EMAIL],
      subject: `🏥 New Appointment: ${patientName} - ${appointmentDate} at ${appointmentTime}`,
      html: htmlContent
    });

    if (error) {
      console.error('❌ Error sending email:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Appointment notification email sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send confirmation email to patient
const sendPatientConfirmation = async (appointmentData) => {
  const { patientName, patientEmail, appointmentDate, appointmentTime } = appointmentData;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #c41e3a 0%, #a01830 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .appointment-card { background: #fef2f2; padding: 25px; border-radius: 15px; text-align: center; margin: 20px 0; }
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
            <h2 style="color: #c41e3a; margin: 0 0 15px;">📅 Your Appointment</h2>
            <div style="font-size: 24px; font-weight: 700; color: #333;">${appointmentDate}</div>
            <div style="font-size: 18px; color: #666; margin-top: 5px;">🕐 ${appointmentTime}</div>
          </div>
          
          <div class="note">
            <strong>⏳ Pending Confirmation</strong>
            <p style="margin: 10px 0 0;">Your appointment request has been received. We will contact you shortly to confirm.</p>
          </div>
          
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

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [patientEmail],
      subject: `✅ Appointment Request Received - ${appointmentDate}`,
      html: htmlContent
    });

    if (error) {
      console.error('❌ Error sending patient email:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Patient confirmation email sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Error sending patient email:', error);
    return { success: false, error: error.message };
  }
};

// Send status update email to patient (confirmed/rejected)
const sendStatusUpdateEmail = async (appointmentData, status) => {
  const { patientName, patientEmail, appointmentDate, appointmentTime } = appointmentData;
  const isConfirmed = status === 'confirmed';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; }
        .header { background: ${isConfirmed ? '#10b981' : '#ef4444'}; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .status-card { background: ${isConfirmed ? '#d1fae5' : '#fee2e2'}; padding: 25px; border-radius: 15px; text-align: center; margin: 20px 0; }
        .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 14px; }
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
            <p>Great news! Your appointment has been <strong>confirmed</strong>.</p>
            <div class="status-card">
              <h2 style="color: #059669; margin: 0 0 15px;">📅 Confirmed Appointment</h2>
              <div style="font-size: 24px; font-weight: 700; color: #333;">${appointmentDate}</div>
              <div style="font-size: 18px; color: #666; margin-top: 5px;">🕐 ${appointmentTime}</div>
            </div>
            <p><strong>Please remember:</strong></p>
            <ul>
              <li>Arrive 10-15 minutes early</li>
              <li>Bring any previous medical reports</li>
            </ul>
          ` : `
            <p>We regret to inform you that your appointment could not be confirmed at this time.</p>
            <div class="status-card">
              <h2 style="color: #dc2626; margin: 0 0 15px;">📅 Appointment Details</h2>
              <div style="font-size: 24px; font-weight: 700; color: #333;">${appointmentDate}</div>
              <div style="font-size: 18px; color: #666; margin-top: 5px;">🕐 ${appointmentTime}</div>
            </div>
            <p>Please contact the clinic or book a new appointment.</p>
          `}
          
          <p style="margin-top: 30px;">
            Warm regards,<br>
            <strong>Dr. Neelam Pandey</strong>
          </p>
        </div>
        <div class="footer">
          <p>🌿 Healing Naturally, One Patient at a Time</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [patientEmail],
      subject: isConfirmed 
        ? `✅ Appointment Confirmed - ${appointmentDate} at ${appointmentTime}`
        : `❌ Appointment Update - ${appointmentDate}`,
      html: htmlContent
    });

    if (error) {
      console.error('❌ Error sending status email:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Status update email sent (${status}):`, data.id);
    return { success: true, messageId: data.id };
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

const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Send registration invite email
exports.sendRegistrationInvite = async ({ email, firstName, lastName, token, visitCount, isFirstVisit }) => {
    const registrationUrl = `${process.env.CLIENT_URL}/complete-registration?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: isFirstVisit
            ? `Welcome to ${process.env.CHURCH_NAME}!`
            : `Complete Your Registration - ${process.env.CHURCH_NAME}`,
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .highlight { background: #dbeafe; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isFirstVisit ? '🎉 Welcome!' : '👋 Welcome Back!'}</h1>
            <p>RCCG He Reigns Assembly</p>
          </div>
          <div class="content">
            <h2>Hi ${firstName}!</h2>
            
            ${isFirstVisit ? `
              <p>Thank you for visiting us today! We're thrilled to have you as part of our church family.</p>
              <p>We noticed this was your <strong>first visit</strong> to our church. We'd love to get to know you better!</p>
            ` : `
              <p>We're so glad to see you again! This is your <strong>${visitCount}${getOrdinalSuffix(visitCount)} visit</strong> with us.</p>
              <p>Since you've been back, we'd love for you to complete your registration and unlock member benefits!</p>
            `}
            
            <div class="highlight">
              <strong>🎁 Member Benefits Include:</strong>
              <ul>
                <li>Personal QR code for quick check-in</li>
                <li>Track your attendance history</li>
                <li>Birthday and anniversary greetings</li>
                <li>Join departments and ministries</li>
                <li>Receive important church updates</li>
                <li>Access to members-only events</li>
              </ul>
            </div>

            <p>Complete your registration to join our family:</p>
            
            <center>
              <a href="${registrationUrl}" class="button">Complete Registration</a>
            </center>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This link will expire in 7 days. If you have any questions, feel free to contact us.
            </p>
          </div>
          <div class="footer">
            <p><strong>${process.env.CHURCH_NAME}</strong></p>
            <p>${process.env.CHURCH_LOCATION}</p>
            <p>You received this email because you checked in at our service.</p>
          </div>
        </div>
      </body>
      </html>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Registration invite sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send registration invite:', error);
        throw error;
    }
};

// Send welcome email to new registered user
exports.sendWelcomeEmail = async ({ email, name, membershipId, qrCode }) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `Welcome to the Family - ${process.env.CHURCH_NAME}`,
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .qr-box { background: white; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0; }
          .info-box { background: #dbeafe; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎊 Registration Complete!</h1>
            <p>Welcome to RCCG He Reigns Assembly</p>
          </div>
          <div class="content">
            <h2>Congratulations, ${name}!</h2>
            
            <p>Your registration has been completed successfully. You are now an official member of our church family!</p>

            <div class="info-box">
              <strong>Your Membership Details:</strong><br>
              <strong>Name:</strong> ${name}<br>
              <strong>Membership ID:</strong> ${membershipId}<br>
              <strong>Status:</strong> Active Member
            </div>

            <div class="qr-box">
              <h3>Your Personal QR Code</h3>
              <p>Use this QR code for quick check-in at all services:</p>
              <img src="${qrCode}" alt="Your QR Code" style="max-width: 200px; margin: 10px auto;"/>
              <p style="color: #6b7280; font-size: 12px;">Save this QR code or show it from your phone</p>
            </div>

            <h3>Next Steps:</h3>
            <ul>
              <li>Login to your account to update your profile</li>
              <li>Join a department or ministry</li>
              <li>Connect with other members</li>
              <li>Attend new members' class (check schedule)</li>
            </ul>

            <p>We're excited to have you as part of our family! See you at the next service.</p>
          </div>
          <div class="footer">
            <p><strong>${process.env.CHURCH_NAME}</strong></p>
            <p>${process.env.CHURCH_LOCATION}</p>
          </div>
        </div>
      </body>
      </html>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Welcome email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send welcome email:', error);
        throw error;
    }
};

// Send check-in confirmation
exports.sendCheckInConfirmation = async ({ email, name, serviceName, checkInTime }) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `Check-in Confirmed - ${serviceName}`,
        html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h2>✅ Check-in Confirmed</h2>
          </div>
          <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px;">
            <p>Hi ${name},</p>
            <p>Your attendance has been recorded for <strong>${serviceName}</strong></p>
            <p><strong>Check-in Time:</strong> ${new Date(checkInTime).toLocaleString()}</p>
            <p>Thank you for being part of our service today!</p>
          </div>
        </div>
      </body>
      </html>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Failed to send check-in confirmation:', error);
        throw error;
    }
};

// Helper function
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}
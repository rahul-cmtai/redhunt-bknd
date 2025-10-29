import nodemailer from 'nodemailer';

// Direct SMTP configuration - modify these values as needed
const host = 'smtp.hostinger.com';
const port = 465;
const user = 'rahul.kumar@completrix.com';  // Replace with your Gmail
const pass = 'Cmtai@123';     // Replace with your Gmail App Password
const from = 'rahul.kumar@completrix.com';

let transporter;

function maskSecret(value) {
  if (!value) return '(missing)';
  const visibleTail = String(value).slice(-2);
  return `${'*'.repeat(Math.max(4, String(value).length - 2))}${visibleTail}`;
}

function logSmtpEnv() {
  console.log('🔧 SMTP ENV', {
    SMTP_HOST: host || '(missing)',
    SMTP_PORT: port,
    SMTP_USER: user || '(missing)',
    SMTP_PASS: maskSecret(pass),
    MAIL_FROM: from || '(missing)'
  });
}

export function getTransporter() {
  if (transporter) return transporter;
  // Ensure we log what env values are visible to this module
  logSmtpEnv();
  
  // Check if SMTP is configured
  if (!host || !user || !pass || user === 'your-email@gmail.com' || pass === 'your-app-password') {
    console.warn('⚠️ SMTP not configured. Please update the credentials in mailer.js file.');
    // Return a dummy transporter for development
    return {
      sendMail: async (mailOptions) => {
        console.log('📧 [DEV MODE] Email would be sent:');
        console.log(`   To: ${mailOptions.to}`);
        console.log(`   Subject: ${mailOptions.subject}`);
        console.log(`   OTP: ${mailOptions.html.match(/(\d{6})/)?.[0] || 'N/A'}`);
        return { messageId: 'dev-mode-no-email' };
      }
    };
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  // Proactively verify SMTP connectivity/auth; log outcome without throwing
  transporter
    .verify()
    .then(() => console.log('✅ SMTP connection verified'))
    .catch((err) => console.error('❌ SMTP verify failed:', err?.message || err));
  return transporter;
}

export async function sendOtpEmail(to, otp, role = 'user') {
  const transport = getTransporter();
  const subject = 'Your RedHunt OTP Code';
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
      <h2>Verify your email</h2>
      <p>Hello ${role === 'employer' ? 'Employer' : role === 'candidate' ? 'Candidate' : 'User'},</p>
      <p>Your One-Time Password (OTP) is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p>
      <p>This code will expire in 10 minutes. If you did not request this, you can ignore this email.</p>
      <p>— RedHunt</p>
    </div>
  `;
  console.log('📨 Preparing OTP email:', { to, role, otp, from, subject });
  try {
    const info = await transport.sendMail({ from, to, subject, html });
    console.log('📧 Email sent. messageId:', info?.messageId);
    if (info?.response) console.log('SMTP response:', info.response);
    return info;
  } catch (err) {
    console.error('❌ Failed to send OTP email:', err?.response || err?.message || err);
    // Log helpful hints for common cases
    if (String(err?.message || '').includes('Invalid login')) {
      console.error('Hint: Check SMTP_USER/SMTP_PASS and app-password settings.');
    }
    if (String(err?.message || '').includes('self signed certificate')) {
      console.error('Hint: You may need proper TLS certs or a different port.');
    }
    throw err;
  }
}

export function generateOtp(length = 6) {
  const digits = '0123456789';
  let out = '';
  for (let i = 0; i < length; i++) out += digits[Math.floor(Math.random() * 10)];
  return out;
}

export async function sendCandidateInvitationEmail(to, candidateName, employerName, companyName, registrationUrl) {
  const transport = getTransporter();
  const subject = `Invitation to Join ${companyName} - RedHunt Platform`;
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">RedHunt</h1>
          <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 16px;">Trust & Verification Platform</p>
        </div>
        
        <!-- Main Content -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">You're Invited to Join Our Platform!</h2>
          
          <p style="color: #34495e; font-size: 16px; margin-bottom: 20px;">
            Hello <strong>${candidateName}</strong>,
          </p>
          
          <p style="color: #34495e; font-size: 16px; margin-bottom: 20px;">
            <strong>${employerName}</strong> from <strong>${companyName}</strong> has invited you to join the RedHunt platform. 
            This platform helps maintain trust and verification in the hiring process.
          </p>
          
          <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">What is RedHunt?</h3>
            <ul style="color: #34495e; margin: 0; padding-left: 20px;">
              <li>Verify your employment history and joining status</li>
              <li>Build trust with future employers</li>
              <li>Maintain a verified professional record</li>
              <li>Secure and confidential platform</li>
            </ul>
          </div>
          
          <p style="color: #34495e; font-size: 16px; margin-bottom: 25px;">
            To get started, please register on our platform using the link below:
          </p>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${registrationUrl}" 
               style="background-color: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
              Register Now
            </a>
          </div>
          
          <p style="color: #7f8c8d; font-size: 14px; margin-top: 25px;">
            If the button doesn't work, you can copy and paste this link into your browser:<br>
            <a href="${registrationUrl}" style="color: #3498db; word-break: break-all;">${registrationUrl}</a>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; text-align: center;">
          <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
            This invitation was sent by ${companyName} through RedHunt platform.<br>
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <p style="color: #95a5a6; font-size: 12px; margin: 10px 0 0 0;">
            © 2024 RedHunt. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;
  
  console.log('📨 Preparing candidate invitation email:', { to, candidateName, employerName, companyName });
  try {
    const info = await transport.sendMail({ from, to, subject, html });
    console.log('📧 Candidate invitation email sent. messageId:', info?.messageId);
    if (info?.response) console.log('SMTP response:', info.response);
    return info;
  } catch (err) {
    console.error('❌ Failed to send candidate invitation email:', err?.response || err?.message || err);
    throw err;
  }
}



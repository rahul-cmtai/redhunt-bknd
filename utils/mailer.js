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
  const subject = 'Red-Flagged | Email Verification Code';
  const html = `
    <div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#2d3436;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.08);overflow:hidden;">
              <tr>
                <td style="background:#8e0000;background:linear-gradient(135deg,#b71c1c 0%, #8e0000 100%);padding:20px 24px;color:#ffffff;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:22px;font-weight:700;letter-spacing:0.3px;">Red-Flagged</td>
                      <td align="right" style="font-size:12px;opacity:0.9;">Trust & Verification Platform</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 28px 8px 28px;">
                  <h2 style="margin:0 0 12px 0;color:#1e272e;font-size:20px;">Verify your email</h2>
                  <p style="margin:0 0 16px 0;font-size:14px;color:#4a4a4a;">Hello ${role === 'employer' ? 'Employer' : role === 'candidate' ? 'Candidate' : 'User'},</p>
                  <p style="margin:0 0 16px 0;font-size:14px;color:#4a4a4a;">Use the following One-Time Password (OTP) to verify your email. This code is valid for <strong>10 minutes</strong>.</p>
                  <div style="text-align:center;margin:22px 0 8px 0;">
                    <div style="display:inline-block;background:#fff5f5;border:1px solid #ffcdd2;border-radius:10px;padding:14px 22px;">
                      <div style="font-size:28px;font-weight:800;letter-spacing:6px;color:#b71c1c;font-family:'Courier New',monospace;">${otp}</div>
                    </div>
                  </div>
                  <div style="text-align:center;margin-top:8px;margin-bottom:18px;">
                    <a href="#" style="background:#b71c1c;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:700;font-size:14px;display:inline-block;">Verify Email</a>
                  </div>
                  <p style="margin:0 0 10px 0;font-size:12px;color:#6b6b6b;">Didn’t request this code? You can safely ignore this email.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 28px 24px 28px;border-top:1px solid #f0f0f0;background:#fafafa;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:12px;color:#8b8b8b;">© ${new Date().getFullYear()} Red-Flagged</td>
                      <td align="right" style="font-size:12px;color:#8b8b8b;">This email was intended for account verification only.</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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
  const subject = `Invitation to Join ${companyName} - Red-Flagged Platform`;
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Red-Flagged</h1>
          <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 16px;">Trust & Verification Platform</p>
        </div>
        
        <!-- Main Content -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">You're Invited to Join Our Platform!</h2>
          
          <p style="color: #34495e; font-size: 16px; margin-bottom: 20px;">
            Hello <strong>${candidateName}</strong>,
          </p>
          
          <p style="color: #34495e; font-size: 16px; margin-bottom: 20px;">
            <strong>${employerName}</strong> from <strong>${companyName}</strong> has invited you to join the Red-Flagged platform. 
            This platform helps maintain trust and verification in the hiring process.
          </p>
          
          <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">What is Red-Flagged?</h3>
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
            This invitation was sent by ${companyName} through Red-Flagged platform.<br>
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <p style="color: #95a5a6; font-size: 12px; margin: 10px 0 0 0;">
            © 2024 Red-Flagged. All rights reserved.
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


export async function sendCandidateWelcomeEmail(to, candidateName, employerName, companyName, siteUrl) {
  const transport = getTransporter();
  const subject = `Welcome to Red-Flagged — You’ve been added by ${companyName}`;
  const html = `
    <div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#2d3436;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.08);overflow:hidden;">
              <tr>
                <td style="background:#8e0000;background:linear-gradient(135deg,#b71c1c 0%, #8e0000 100%);padding:20px 24px;color:#ffffff;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:22px;font-weight:700;letter-spacing:0.3px;">Red-Flagged</td>
                      <td align="right" style="font-size:12px;opacity:0.9;">Trust & Verification Platform</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 28px 8px 28px;">
                  <h2 style="margin:0 0 12px 0;color:#1e272e;font-size:20px;">Welcome, ${candidateName || 'Candidate'}!</h2>
                  <p style="margin:0 0 12px 0;font-size:14px;color:#4a4a4a;">
                    <strong>${employerName || companyName || 'Your employer'}</strong> from <strong>${companyName || ''}</strong> has added you to the Red-Flagged platform.
                  </p>
                  <p style="margin:0 0 16px 0;font-size:14px;color:#4a4a4a;">
                    Red-Flagged helps you maintain a verified professional record and build trust with future employers.
                  </p>
                  <div style="background:#fff5f5;border:1px solid #ffcdd2;border-radius:10px;padding:14px 16px;margin:18px 0;">
                    <ul style="margin:0;padding-left:18px;color:#4a4a4a;font-size:14px;">
                      <li>Securely manage your verified details</li>
                      <li>Track updates from employers/admins</li>
                      <li>Keep your information current</li>
                    </ul>
                  </div>
                  <div style="text-align:center;margin:18px 0 8px 0;">
                    <a href="${siteUrl}" style="background:#b71c1c;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">
                      Visit Red-Flagged
                    </a>
                  </div>
                  <p style="margin:12px 0 10px 0;font-size:12px;color:#6b6b6b;text-align:center;">
                    If the button doesn’t work, copy and paste this link into your browser:<br/>
                    <a href="${siteUrl}" style="color:#b71c1c;word-break:break-all;">${siteUrl}</a>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 28px 24px 28px;border-top:1px solid #f0f0f0;background:#fafafa;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:12px;color:#8b8b8b;">© ${new Date().getFullYear()} Red-Flagged</td>
                      <td align="right" style="font-size:12px;color:#8b8b8b;">You are receiving this email because ${companyName || 'an employer'} added you on Red-Flagged.</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  console.log('📨 Preparing candidate welcome email:', { to, candidateName, employerName, companyName });
  try {
    const info = await transport.sendMail({ from, to, subject, html });
    console.log('📧 Candidate welcome email sent. messageId:', info?.messageId);
    if (info?.response) console.log('SMTP response:', info.response);
    return info;
  } catch (err) {
    console.error('❌ Failed to send candidate welcome email:', err?.response || err?.message || err);
    throw err;
  }
}



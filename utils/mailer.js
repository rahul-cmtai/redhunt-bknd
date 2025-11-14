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
  const subject = `Welcome to Red-Flagged — You've been added by ${companyName}`;
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
                    If the button doesn't work, copy and paste this link into your browser:<br/>
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

export async function sendEmployerWelcomeEmail(to, hrName, companyName, siteUrl) {
  const transport = getTransporter();
  const subject = `🎉 Welcome to Red-Flagged, ${companyName}!`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%);background-size:400% 400%;animation:gradient 15s ease infinite;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <style>
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      </style>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:50px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;border:3px solid rgba(183,28,28,0.2);">
              
              <!-- Premium Hero Header -->
              <tr>
                <td style="background:linear-gradient(135deg, #b71c1c 0%, #8e0000 30%, #c62828 60%, #d32f2f 100%);padding:60px 40px;text-align:center;position:relative;overflow:hidden;">
                  <!-- Animated Background Elements -->
                  <div style="position:absolute;top:-80px;right:-80px;width:300px;height:300px;background:rgba(255,255,255,0.15);border-radius:50%;animation:float 6s ease-in-out infinite;"></div>
                  <div style="position:absolute;bottom:-60px;left:-60px;width:250px;height:250px;background:rgba(255,255,255,0.12);border-radius:50%;animation:float 8s ease-in-out infinite;"></div>
                  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;background:rgba(255,255,255,0.05);border-radius:50%;"></div>
                  
                  <div style="position:relative;z-index:10;">
                    <!-- Red-Flagged Logo/Brand -->
                    <div style="margin-bottom:25px;">
                      <div style="display:inline-block;background:rgba(255,255,255,0.2);backdrop-filter:blur(10px);padding:15px 30px;border-radius:50px;border:2px solid rgba(255,255,255,0.3);">
                        <h1 style="margin:0;color:#ffffff;font-size:48px;font-weight:900;letter-spacing:2px;text-shadow:0 4px 15px rgba(0,0,0,0.3);font-family:'Arial Black',Arial,sans-serif;">
                          🚩 Red-Flagged
                        </h1>
                      </div>
                    </div>
                    
                    <div style="margin-bottom:20px;">
                      <h2 style="margin:0 0 10px 0;color:#ffffff;font-size:36px;font-weight:800;letter-spacing:1px;text-shadow:0 3px 12px rgba(0,0,0,0.25);">
                        🎉 Welcome Aboard!
                      </h2>
                      <p style="margin:0;color:#ffebee;font-size:18px;font-weight:600;letter-spacing:0.8px;text-shadow:0 2px 8px rgba(0,0,0,0.2);">
                        Trust & Verification Platform
                      </p>
                    </div>
                    
                    <!-- Decorative Line -->
                    <div style="width:100px;height:4px;background:rgba(255,255,255,0.6);margin:20px auto;border-radius:2px;"></div>
                  </div>
                </td>
              </tr>

              <!-- Main Content Section -->
              <tr>
                <td style="padding:55px 45px;background:#ffffff;">
                  <!-- Personalized Greeting -->
                  <div style="text-align:center;margin-bottom:35px;">
                    <h2 style="margin:0 0 15px 0;color:#1a1a1a;font-size:32px;font-weight:800;line-height:1.2;">
                      Hello ${hrName || 'Valued Employer'}! 👋
                    </h2>
                    <div style="display:inline-block;background:linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%);padding:12px 25px;border-radius:30px;border:2px solid #ffcdd2;">
                      <p style="margin:0;color:#b71c1c;font-size:16px;font-weight:700;">
                        ${companyName}
                      </p>
                    </div>
                  </div>
                  
                  <!-- Welcome Message -->
                  <div style="background:linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);border-radius:16px;padding:30px;margin-bottom:30px;border-left:6px solid #b71c1c;box-shadow:0 4px 15px rgba(0,0,0,0.08);">
                    <p style="margin:0 0 18px 0;color:#2d3436;font-size:18px;line-height:1.8;text-align:center;">
                      We're absolutely <strong style="color:#b71c1c;font-size:20px;">thrilled</strong> to welcome <strong style="color:#b71c1c;font-size:20px;">${companyName}</strong> to the <strong style="color:#b71c1c;font-size:20px;">Red-Flagged</strong> family! 🚀
                    </p>
                    <p style="margin:0;color:#495057;font-size:16px;line-height:1.8;text-align:center;">
                      Your registration with <strong style="color:#b71c1c;">Red-Flagged</strong> has been successfully completed. You're now part of India's most trusted network revolutionizing how companies verify and track candidate information.
                    </p>
                  </div>

                  <!-- Red-Flagged Features Box -->
                  <div style="background:linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%);border:3px solid #b71c1c;border-radius:18px;padding:35px;margin:35px 0;box-shadow:0 8px 25px rgba(183,28,28,0.15);">
                    <div style="text-align:center;margin-bottom:25px;">
                      <h3 style="margin:0;color:#b71c1c;font-size:26px;font-weight:800;letter-spacing:0.5px;">
                        ✨ What You Can Do with Red-Flagged:
                      </h3>
                      <p style="margin:8px 0 0 0;color:#8e0000;font-size:14px;font-weight:600;">
                        Empowering Your Hiring Process
                      </p>
                    </div>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                      <tr>
                        <td style="padding:18px 0;border-bottom:1px solid rgba(183,28,28,0.1);">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="50" valign="top">
                                <div style="width:40px;height:40px;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(183,28,28,0.3);">
                                  <span style="color:#ffffff;font-size:20px;font-weight:bold;">1</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:15px;">
                                <p style="margin:0;color:#1a1a1a;font-size:17px;line-height:1.6;">
                                  <strong style="color:#b71c1c;font-size:18px;">Invite Candidates:</strong> Add candidates to your <strong>Red-Flagged</strong> dashboard and track their status in real-time
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:18px 0;border-bottom:1px solid rgba(183,28,28,0.1);">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="50" valign="top">
                                <div style="width:40px;height:40px;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(183,28,28,0.3);">
                                  <span style="color:#ffffff;font-size:20px;font-weight:bold;">2</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:15px;">
                                <p style="margin:0;color:#1a1a1a;font-size:17px;line-height:1.6;">
                                  <strong style="color:#b71c1c;font-size:18px;">Verify Information:</strong> Access verified candidate profiles and employment history through <strong>Red-Flagged</strong>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:18px 0;border-bottom:1px solid rgba(183,28,28,0.1);">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="50" valign="top">
                                <div style="width:40px;height:40px;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(183,28,28,0.3);">
                                  <span style="color:#ffffff;font-size:20px;font-weight:bold;">3</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:15px;">
                                <p style="margin:0;color:#1a1a1a;font-size:17px;line-height:1.6;">
                                  <strong style="color:#b71c1c;font-size:18px;">Track Updates:</strong> Monitor candidate status changes and remarks in real-time on <strong>Red-Flagged</strong>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:18px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="50" valign="top">
                                <div style="width:40px;height:40px;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(183,28,28,0.3);">
                                  <span style="color:#ffffff;font-size:20px;font-weight:bold;">4</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:15px;">
                                <p style="margin:0;color:#1a1a1a;font-size:17px;line-height:1.6;">
                                  <strong style="color:#b71c1c;font-size:18px;">Build Trust:</strong> Maintain a high trust score on <strong>Red-Flagged</strong> by providing accurate information
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Next Steps with Red-Flagged Branding -->
                  <div style="background:linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);border-radius:18px;padding:35px;margin:35px 0;border:3px solid #dee2e6;box-shadow:0 6px 20px rgba(0,0,0,0.08);">
                    <div style="text-align:center;margin-bottom:25px;">
                      <h3 style="margin:0;color:#495057;font-size:24px;font-weight:800;">
                        📋 Your Next Steps with Red-Flagged:
                      </h3>
                    </div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:15px 0;border-bottom:1px solid #dee2e6;">
                          <div style="display:flex;align-items:flex-start;">
                            <div style="width:35px;height:35px;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(183,28,28,0.3);">
                              <span style="color:#ffffff;font-size:16px;font-weight:bold;">1</span>
                            </div>
                            <div style="padding-left:15px;flex:1;">
                              <p style="margin:0;color:#2d3436;font-size:16px;line-height:1.8;">
                                <strong style="color:#b71c1c;">Verify Your Email:</strong> Check your inbox for the OTP code from <strong>Red-Flagged</strong> to verify your corporate email address
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:15px 0;border-bottom:1px solid #dee2e6;">
                          <div style="display:flex;align-items:flex-start;">
                            <div style="width:35px;height:35px;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(183,28,28,0.3);">
                              <span style="color:#ffffff;font-size:16px;font-weight:bold;">2</span>
                            </div>
                            <div style="padding-left:15px;flex:1;">
                              <p style="margin:0;color:#2d3436;font-size:16px;line-height:1.8;">
                                <strong style="color:#b71c1c;">Wait for Admin Approval:</strong> The <strong>Red-Flagged</strong> team will review your registration and approve your account (usually within 24-48 hours)
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:15px 0;">
                          <div style="display:flex;align-items:flex-start;">
                            <div style="width:35px;height:35px;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(183,28,28,0.3);">
                              <span style="color:#ffffff;font-size:16px;font-weight:bold;">3</span>
                            </div>
                            <div style="padding-left:15px;flex:1;">
                              <p style="margin:0;color:#2d3436;font-size:16px;line-height:1.8;">
                                <strong style="color:#b71c1c;">Start Using Red-Flagged:</strong> Once approved, you'll receive a confirmation email from <strong>Red-Flagged</strong> and can start inviting candidates!
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Premium CTA Button -->
                  <div style="text-align:center;margin:45px 0 35px 0;">
                    <a href="${siteUrl}/employer/login" 
                       style="display:inline-block;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 50%, #c62828 100%);color:#ffffff;text-decoration:none;padding:22px 50px;border-radius:50px;font-weight:800;font-size:18px;letter-spacing:0.5px;box-shadow:0 8px 25px rgba(183,28,28,0.5);text-transform:uppercase;border:2px solid rgba(255,255,255,0.2);transition:all 0.3s;">
                      🚀 Access Red-Flagged Dashboard →
                    </a>
                  </div>

                  <!-- Trust & Security Message -->
                  <div style="background:linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);border-radius:16px;padding:25px;margin:35px 0;text-align:center;border:3px solid #81c784;box-shadow:0 6px 20px rgba(46,125,50,0.15);">
                    <p style="margin:0;color:#1b5e20;font-size:17px;font-weight:700;line-height:1.7;">
                      🔒 <strong>Red-Flagged</strong> Security Promise
                    </p>
                    <p style="margin:10px 0 0 0;color:#2e7d32;font-size:15px;font-weight:600;line-height:1.6;">
                      Your data is encrypted and secure. Only verified HR professionals can access candidate information on <strong>Red-Flagged</strong>.
                    </p>
                  </div>

                  <!-- Support Message -->
                  <div style="text-align:center;margin-top:35px;padding:25px;background:#f8f9fa;border-radius:16px;border:2px solid #e9ecef;">
                    <p style="margin:0;color:#495057;font-size:16px;line-height:1.8;">
                      If you have any questions or need assistance with <strong style="color:#b71c1c;">Red-Flagged</strong>, feel free to reach out to our support team. We're here to help! 💪
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Premium Footer with Red-Flagged Branding -->
              <tr>
                <td style="background:linear-gradient(135deg, #1a1a1a 0%, #2d3436 50%, #1a1a1a 100%);padding:45px 40px;text-align:center;position:relative;overflow:hidden;">
                  <!-- Footer Background Pattern -->
                  <div style="position:absolute;top:0;left:0;right:0;bottom:0;opacity:0.05;background-image:repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px);"></div>
                  
                  <div style="position:relative;z-index:1;">
                    <!-- Red-Flagged Brand -->
                    <div style="margin-bottom:20px;">
                      <h3 style="margin:0 0 10px 0;color:#ffffff;font-size:32px;font-weight:900;letter-spacing:2px;text-shadow:0 2px 10px rgba(0,0,0,0.3);">
                        🚩 Red-Flagged
                      </h3>
                      <p style="margin:0;color:#bdc3c7;font-size:16px;font-weight:600;letter-spacing:1px;">
                        Trust & Verification Platform
                      </p>
                    </div>
                    
                    <!-- Tagline -->
                    <div style="margin:25px 0;padding:15px 0;border-top:1px solid rgba(255,255,255,0.1);border-bottom:1px solid rgba(255,255,255,0.1);">
                      <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;line-height:1.6;font-style:italic;">
                        "Building trust in the hiring process, one verification at a time."
                      </p>
                    </div>
                    
                    <!-- Copyright -->
                    <div style="margin-top:25px;">
                      <p style="margin:0 0 12px 0;color:#95a5a6;font-size:13px;font-weight:600;">
                        © ${new Date().getFullYear()} <strong style="color:#ffffff;">Red-Flagged</strong>. All rights reserved.
                      </p>
                      <p style="margin:0;color:#7f8c8d;font-size:12px;">
                        This email was sent to <strong style="color:#bdc3c7;">${to}</strong> because you registered on <strong style="color:#b71c1c;">Red-Flagged</strong>.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  console.log('📨 Preparing employer welcome email:', { to, hrName, companyName, siteUrl });
  
  // Validate inputs
  if (!to || !companyName) {
    const errorMsg = `Missing required parameters: to=${to}, companyName=${companyName}`;
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }
  
  try {
    const mailOptions = {
      from: from,
      to: to,
      subject: subject,
      html: html
    };
    
    console.log('📧 Sending welcome email with options:', { 
      from: mailOptions.from, 
      to: mailOptions.to, 
      subject: mailOptions.subject,
      htmlLength: mailOptions.html?.length 
    });
    
    const info = await transport.sendMail(mailOptions);
    console.log('✅ Employer welcome email sent successfully. messageId:', info?.messageId);
    if (info?.response) console.log('SMTP response:', info.response);
    if (info?.accepted) console.log('Accepted recipients:', info.accepted);
    if (info?.rejected) console.log('Rejected recipients:', info.rejected);
    return info;
  } catch (err) {
    console.error('❌ Failed to send employer welcome email');
    console.error('Error details:', {
      message: err?.message,
      response: err?.response,
      code: err?.code,
      command: err?.command,
      responseCode: err?.responseCode
    });
    throw err;
  }
}



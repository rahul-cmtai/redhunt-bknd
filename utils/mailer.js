import nodemailer from 'nodemailer';

// Directly set SMTP config (don't use process.env here)
const host = 'smtpout.secureserver.net';
const port = 465;
const user = 'contact@red-flagged.com';
const pass = 'Redflagged@2025';
const from = 'contact@red-flagged.com';


let transporter;

export function getTransporter() {
  if (transporter) return transporter;

  // Check if SMTP is configured
  if (!host || !user || !pass || user === 'your-email@gmail.com' || pass === 'your-app-password') {
    console.warn('⚠️ SMTP not configured. Please update the credentials in mailer.js file.');
    // Return a dummy transporter for development
    return {
      sendMail: async (mailOptions) => {
        console.warn('📧 [DEV MODE] Email send skipped (transporter not configured).');
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
  // Proactively verify SMTP connectivity/auth; log only on failure
  transporter.verify().catch((err) => console.error('❌ SMTP verify failed:', err?.message || err));
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
  try {
    const info = await transport.sendMail({ from, to, subject, html });
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
  
  try {
    const info = await transport.sendMail({ from, to, subject, html });
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

  try {
    const info = await transport.sendMail({ from, to, subject, html });
    return info;
  } catch (err) {
    console.error('❌ Failed to send candidate welcome email:', err?.response || err?.message || err);
    throw err;
  }
}

export async function sendContactFormConfirmationEmail(to, name) {
  const transport = getTransporter();
  const subject = 'Thank You for Contacting Red-Flagged - We\'ll Connect Soon!';
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
                  <h2 style="margin:0 0 12px 0;color:#1e272e;font-size:20px;">Thank You for Reaching Out, ${name || 'Valued Customer'}! 👋</h2>
                  <p style="margin:0 0 16px 0;font-size:14px;color:#4a4a4a;">Hello ${name || 'there'},</p>
                  <p style="margin:0 0 16px 0;font-size:14px;color:#4a4a4a;line-height:1.6;">
                    We've received your message and we're excited to connect with you! Our team is already reviewing your inquiry and will get back to you soon.
                  </p>
                  
                  <!-- Confirmation Box -->
                  <div style="background:linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%);border:2px solid #ffcdd2;border-radius:10px;padding:20px;margin:22px 0;">
                    <div style="text-align:center;">
                      <div style="font-size:48px;margin-bottom:10px;">✅</div>
                      <h3 style="margin:0 0 10px 0;color:#b71c1c;font-size:18px;font-weight:700;">We Will Connect You Soon!</h3>
                      <p style="margin:0;color:#4a4a4a;font-size:14px;line-height:1.6;">
                        Our team typically responds within <strong style="color:#b71c1c;">12-24 hours</strong> during business days. We'll make sure to address all your questions and provide you with the information you need.
                      </p>
                    </div>
                  </div>

                  <!-- What Happens Next -->
                  <div style="background:#f8f9fa;border-radius:10px;padding:20px;margin:20px 0;">
                    <h3 style="margin:0 0 15px 0;color:#1e272e;font-size:16px;font-weight:700;">What Happens Next?</h3>
                    <ul style="margin:0;padding-left:20px;color:#4a4a4a;font-size:14px;line-height:1.8;">
                      <li style="margin-bottom:8px;">Our team will review your inquiry</li>
                      <li style="margin-bottom:8px;">We'll prepare a personalized response</li>
                      <li style="margin-bottom:8px;">You'll receive an email from one of our specialists</li>
                      <li>We'll help you with demos, pricing, or any other questions</li>
                    </ul>
                  </div>

                  <p style="margin:20px 0 10px 0;font-size:12px;color:#6b6b6b;text-align:center;">
                    We appreciate your interest in Red-Flagged and look forward to helping you!
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 28px 24px 28px;border-top:1px solid #f0f0f0;background:#fafafa;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:12px;color:#8b8b8b;">© ${new Date().getFullYear()} Red-Flagged</td>
                      <td align="right" style="font-size:12px;color:#8b8b8b;">This is an automated confirmation email.</td>
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
  
  try {
    const info = await transport.sendMail({ from, to, subject, html });
    return info;
  } catch (err) {
    console.error('❌ Failed to send contact form confirmation email:', err?.response || err?.message || err);
    throw err;
  }
}

export async function sendCandidateWelcomeEmailOnApproval(to, candidateName, siteUrl) {
  const transport = getTransporter();
  const subject = `Welcome to Red-flagged.com – Your Bridge to Transparent Hiring`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f6f7fb;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.1);overflow:hidden;">
              
              <!-- Hero Header -->
              <tr>
                <td style="background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);padding:50px 40px;text-align:center;">
                  <h1 style="margin:0 0 10px 0;color:#ffffff;font-size:36px;font-weight:800;letter-spacing:1px;">
                    🚩 Red-flagged.com
                  </h1>
                  <p style="margin:0;color:#ffebee;font-size:16px;font-weight:500;">
                    Your Bridge to Transparent Hiring
                  </p>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding:45px 40px;background:#ffffff;">
                  <!-- Greeting -->
                  <div style="margin-bottom:30px;">
                    <h2 style="margin:0 0 15px 0;color:#1a1a1a;font-size:28px;font-weight:700;line-height:1.3;">
                      Dear ${candidateName || 'Candidate'},
                    </h2>
                    <p style="margin:0;color:#2d3436;font-size:16px;line-height:1.8;">
                      Welcome to <strong style="color:#b71c1c;">Red-flagged.com</strong>, the first‑of‑its‑kind platform that connects employers and candidates through open dialogue. We're thrilled you've joined a community that values honesty and mutual respect, helping you turn a single "no‑show" into an opportunity to explain and rebuild trust.
                    </p>
                  </div>

                  <!-- Why Red-flagged.com Section -->
                  <div style="background:linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%);border-left:5px solid #b71c1c;border-radius:12px;padding:30px;margin:30px 0;box-shadow:0 4px 15px rgba(183,28,28,0.1);">
                    <h3 style="margin:0 0 20px 0;color:#b71c1c;font-size:22px;font-weight:700;">
                      Why Red-flagged.com?
                    </h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:15px 0;border-bottom:1px solid rgba(183,28,28,0.1);">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="40" valign="top">
                                <div style="width:32px;height:32px;background:#b71c1c;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                                  <span style="color:#ffffff;font-size:18px;font-weight:bold;">✓</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:15px;">
                                <p style="margin:0;color:#1a1a1a;font-size:16px;line-height:1.7;">
                                  A pioneering space where employers can flag a withdrawn offer and you can respond with your side of the story.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:15px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="40" valign="top">
                                <div style="width:32px;height:32px;background:#b71c1c;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                                  <span style="color:#ffffff;font-size:18px;font-weight:bold;">✓</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:15px;">
                                <p style="margin:0;color:#1a1a1a;font-size:16px;line-height:1.7;">
                                  It removes guesswork, letting future employers see the context behind any red flag.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- How Does It Work Section -->
                  <div style="background:#f8f9fa;border-radius:12px;padding:30px;margin:30px 0;border:2px solid #e9ecef;">
                    <h3 style="margin:0 0 20px 0;color:#1a1a1a;font-size:22px;font-weight:700;">
                      How Does It Work?
                    </h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #dee2e6;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="35" valign="top">
                                <div style="width:28px;height:28px;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(183,28,28,0.3);">
                                  <span style="color:#ffffff;font-size:14px;font-weight:bold;">1</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:12px;">
                                <p style="margin:0;color:#2d3436;font-size:15px;line-height:1.7;">
                                  You receive a brief notification whenever a flag is added to your profile.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #dee2e6;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="35" valign="top">
                                <div style="width:28px;height:28px;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(183,28,28,0.3);">
                                  <span style="color:#ffffff;font-size:14px;font-weight:bold;">2</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:12px;">
                                <p style="margin:0;color:#2d3436;font-size:15px;line-height:1.7;">
                                  Log in to read the employer's note.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #dee2e6;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="35" valign="top">
                                <div style="width:28px;height:28px;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(183,28,28,0.3);">
                                  <span style="color:#ffffff;font-size:14px;font-weight:bold;">3</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:12px;">
                                <p style="margin:0;color:#2d3436;font-size:15px;line-height:1.7;">
                                  Add a short justification (e.g., changed circumstances, another offer).
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="35" valign="top">
                                <div style="width:28px;height:28px;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(183,28,28,0.3);">
                                  <span style="color:#ffffff;font-size:14px;font-weight:bold;">4</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:12px;">
                                <p style="margin:0;color:#2d3436;font-size:15px;line-height:1.7;">
                                  Your explanation becomes part of your record, visible to any prospective employer.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Your Voice Matters Section -->
                  <div style="background:linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);border-left:4px solid #4caf50;border-radius:12px;padding:25px;margin:30px 0;">
                    <h3 style="margin:0 0 15px 0;color:#1b5e20;font-size:20px;font-weight:700;">
                      Your Voice Matters
                    </h3>
                    <p style="margin:0;color:#2e7d32;font-size:16px;line-height:1.7;">
                      By sharing your perspective you protect your reputation, prevent missed opportunities, and demonstrate professionalism—turning a potential setback into a testament to your integrity.
                    </p>
                  </div>

                  <!-- Support Section -->
                  <div style="background:#fff5f5;border-left:4px solid #b71c1c;border-radius:8px;padding:20px;margin:30px 0;">
                    <p style="margin:0;color:#1a1a1a;font-size:15px;line-height:1.7;">
                      <strong style="color:#b71c1c;">Need Assistance?</strong><br/>
                      Our support team is just a click away at <a href="mailto:support@redflag.com" style="color:#b71c1c;text-decoration:none;font-weight:600;">support@redflag.com</a>.
                    </p>
                  </div>

                  <!-- Closing Message -->
                  <div style="text-align:center;margin:35px 0 25px 0;padding:25px;background:linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%);border-radius:12px;">
                    <p style="margin:0 0 10px 0;color:#b71c1c;font-size:20px;font-weight:700;">
                      Welcome Aboard
                    </p>
                    <p style="margin:0;color:#2d3436;font-size:16px;line-height:1.7;">
                      – let's make hiring transparent together!
                    </p>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align:center;margin:30px 0;">
                    <a href="${siteUrl}/candidate/login" 
                       style="display:inline-block;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(183,28,28,0.3);">
                      Access Your Dashboard →
                    </a>
                  </div>

                  <!-- Sign Off -->
                  <div style="margin-top:35px;padding-top:25px;border-top:1px solid #e9ecef;">
                    <p style="margin:0 0 5px 0;color:#2d3436;font-size:15px;font-weight:600;">
                      Warm regards,
                    </p>
                    <p style="margin:0;color:#b71c1c;font-size:16px;font-weight:700;">
                      Team Red-Flagged.com
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Disclaimer Footer -->
              <tr>
                <td style="background:#1a1a1a;padding:30px 40px;color:#bdc3c7;font-size:11px;line-height:1.6;">
                  <p style="margin:0 0 12px 0;color:#95a5a6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                    Disclaimer
                  </p>
                  <p style="margin:0;color:#95a5a6;line-height:1.7;">
                    This E-Mail may contain confidential and/or legally privileged information and is meant for the intended recipient/s only. If you have received this e-mail in error and are not the intended recipient/s, kindly notify the sender immediately and then delete this e-mail immediately from your system. You are also hereby notified that any use, any form of reproduction, dissemination, copying, disclosure, modification, distribution and/or publication of this e-mail, its contents or its attachment/s other than by its intended recipient/s is strictly prohibited and may be unlawful. Internet communications cannot be guaranteed to be secure or error-free as information could be delayed, intercepted, corrupted, lost, or contain viruses. Red-flagged.com does not accept any liability for any errors, omissions, viruses or computer problems experienced by any recipient as a result of this e-mail. The contents of this email do not necessarily represent the views or policies of Red-flagged.com
                  </p>
                  <p style="margin:15px 0 0 0;color:#7f8c8d;font-size:10px;text-align:center;">
                    © ${new Date().getFullYear()} Red-flagged.com. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Validate inputs
  if (!to) {
    const errorMsg = `Missing required parameters: to=${to}`;
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
    
    const info = await transport.sendMail(mailOptions);
    return info;
  } catch (err) {
    console.error('❌ Failed to send candidate welcome email');
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

export async function sendEmployerWelcomeEmail(to, hrName, companyName, siteUrl) {
  const transport = getTransporter();
  const subject = `Welcome to Red-flagged.com – The First‑of‑Its‑Kind Bridge Between Employers & Candidates`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f6f7fb;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.1);overflow:hidden;">
              
              <!-- Hero Header -->
              <tr>
                <td style="background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);padding:50px 40px;text-align:center;">
                  <h1 style="margin:0 0 10px 0;color:#ffffff;font-size:36px;font-weight:800;letter-spacing:1px;">
                    🚩 Red-flagged.com
                  </h1>
                  <p style="margin:0;color:#ffebee;font-size:16px;font-weight:500;">
                    Creating Transparent Bridges Between Employers and Candidates
                  </p>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding:45px 40px;background:#ffffff;">
                  <!-- Greeting -->
                  <div style="margin-bottom:30px;">
                    <h2 style="margin:0 0 15px 0;color:#1a1a1a;font-size:28px;font-weight:700;line-height:1.3;">
                      Dear ${hrName || 'Employer'},
                    </h2>
                    <p style="margin:0;color:#2d3436;font-size:16px;line-height:1.8;">
                      We're delighted to welcome you to <strong style="color:#b71c1c;">Red-flagged.com</strong>, the pioneering platform that creates a transparent bridge between employers and candidates. By joining, you gain a trusted partner that helps reduce last‑minute offer withdrawals and builds a more reliable hiring ecosystem.
                    </p>
                  </div>

                  <!-- Why Red-flagged.com Section -->
                  <div style="background:linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%);border-left:5px solid #b71c1c;border-radius:12px;padding:30px;margin:30px 0;box-shadow:0 4px 15px rgba(183,28,28,0.1);">
                    <h3 style="margin:0 0 20px 0;color:#b71c1c;font-size:22px;font-weight:700;">
                      Why Red-flagged.com?
                    </h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:15px 0;border-bottom:1px solid rgba(183,28,28,0.1);">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="40" valign="top">
                                <div style="width:32px;height:32px;background:#b71c1c;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                                  <span style="color:#ffffff;font-size:18px;font-weight:bold;">✓</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:15px;">
                                <p style="margin:0;color:#1a1a1a;font-size:16px;line-height:1.7;">
                                  <strong style="color:#b71c1c;">First in the market</strong> – the only service that lets you flag a candidate who declined an offer and gives them a chance to explain.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:15px 0;border-bottom:1px solid rgba(183,28,28,0.1);">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="40" valign="top">
                                <div style="width:32px;height:32px;background:#b71c1c;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                                  <span style="color:#ffffff;font-size:18px;font-weight:bold;">✓</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:15px;">
                                <p style="margin:0;color:#1a1a1a;font-size:16px;line-height:1.7;">
                                  <strong style="color:#b71c1c;">Improves reliability</strong> – see the context behind a withdrawal before you extend your next offer, saving time and cost.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:15px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="40" valign="top">
                                <div style="width:32px;height:32px;background:#b71c1c;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                                  <span style="color:#ffffff;font-size:18px;font-weight:bold;">✓</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:15px;">
                                <p style="margin:0;color:#1a1a1a;font-size:16px;line-height:1.7;">
                                  <strong style="color:#b71c1c;">Fosters fairness</strong> – both sides can share their side of the story, strengthening trust in the talent market.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- How It Works Section -->
                  <div style="background:#f8f9fa;border-radius:12px;padding:30px;margin:30px 0;border:2px solid #e9ecef;">
                    <h3 style="margin:0 0 20px 0;color:#1a1a1a;font-size:22px;font-weight:700;">
                      How It Works for You
                    </h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #dee2e6;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="35" valign="top">
                                <div style="width:28px;height:28px;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(183,28,28,0.3);">
                                  <span style="color:#ffffff;font-size:14px;font-weight:bold;">1</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:12px;">
                                <p style="margin:0;color:#2d3436;font-size:15px;line-height:1.7;">
                                  Flag a candidate, when an offer is declined.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #dee2e6;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="35" valign="top">
                                <div style="width:28px;height:28px;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(183,28,28,0.3);">
                                  <span style="color:#ffffff;font-size:14px;font-weight:bold;">2</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:12px;">
                                <p style="margin:0;color:#2d3436;font-size:15px;line-height:1.7;">
                                  The candidate receives a notification and can submit a brief justification.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="35" valign="top">
                                <div style="width:28px;height:28px;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(183,28,28,0.3);">
                                  <span style="color:#ffffff;font-size:14px;font-weight:bold;">3</span>
                                </div>
                              </td>
                              <td valign="top" style="padding-left:12px;">
                                <p style="margin:0;color:#2d3436;font-size:15px;line-height:1.7;">
                                  Your dashboard displays a clear record, helping you make informed hiring decisions.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Support Section -->
                  <div style="background:#e8f5e9;border-left:4px solid #4caf50;border-radius:8px;padding:20px;margin:30px 0;">
                    <p style="margin:0;color:#1b5e20;font-size:15px;line-height:1.7;">
                      If you have any questions or need assistance, our support team is just a click away at <a href="mailto:support@redflagged.com" style="color:#b71c1c;text-decoration:none;font-weight:600;">support@redflagged.com</a>.
                    </p>
                  </div>

                  <!-- Closing Message -->
                  <div style="text-align:center;margin:35px 0 25px 0;padding:25px;background:linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%);border-radius:12px;">
                    <p style="margin:0 0 10px 0;color:#b71c1c;font-size:20px;font-weight:700;">
                      Welcome Aboard
                    </p>
                    <p style="margin:0;color:#2d3436;font-size:16px;line-height:1.7;">
                      – let's make hiring more transparent together!
                    </p>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align:center;margin:30px 0;">
                    <a href="${siteUrl}/employer/login" 
                       style="display:inline-block;background:linear-gradient(135deg, #b71c1c 0%, #8e0000 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(183,28,28,0.3);">
                      Access Your Dashboard →
                    </a>
                  </div>

                  <!-- Sign Off -->
                  <div style="margin-top:35px;padding-top:25px;border-top:1px solid #e9ecef;">
                    <p style="margin:0 0 5px 0;color:#2d3436;font-size:15px;font-weight:600;">
                      Best regards,
                    </p>
                    <p style="margin:0;color:#b71c1c;font-size:16px;font-weight:700;">
                      Team Red-Flagged.com
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Disclaimer Footer -->
              <tr>
                <td style="background:#1a1a1a;padding:30px 40px;color:#bdc3c7;font-size:11px;line-height:1.6;">
                  <p style="margin:0 0 12px 0;color:#95a5a6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                    Disclaimer
                  </p>
                  <p style="margin:0;color:#95a5a6;line-height:1.7;">
                    This E-Mail may contain confidential and/or legally privileged information and is meant for the intended recipient/s only. If you have received this e-mail in error and are not the intended recipient/s, kindly notify the sender immediately and then delete this e-mail immediately from your system. You are also hereby notified that any use, any form of reproduction, dissemination, copying, disclosure, modification, distribution and/or publication of this e-mail, its contents or its attachment/s other than by its intended recipient/s is strictly prohibited and may be unlawful. Internet communications cannot be guaranteed to be secure or error-free as information could be delayed, intercepted, corrupted, lost, or contain viruses. Red-flagged.com does not accept any liability for any errors, omissions, viruses or computer problems experienced by any recipient as a result of this e-mail. The contents of this email do not necessarily represent the views or policies of Red-flagged.com
                  </p>
                  <p style="margin:15px 0 0 0;color:#7f8c8d;font-size:10px;text-align:center;">
                    © ${new Date().getFullYear()} Red-flagged.com. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

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
    
    const info = await transport.sendMail(mailOptions);
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



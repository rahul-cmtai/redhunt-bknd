import bcrypt from 'bcrypt';
import Employer from '../models/Employer.js';
import Admin from '../models/Admin.js';
import { signJwt } from '../utils/jwt.js';
import CandidateUser from '../models/CandidateUser.js';
import { generateOtp, sendOtpEmail } from '../utils/mailer.js';

export async function employerRegister(req, res) {
  const { 
    companyName, 
    address, 
    panNumber, 
    hrName, 
    designation, 
    contactNumber, 
    email, 
    password 
  } = req.body;
  
  // Validation
  const missing = [];
  if (!companyName) missing.push('companyName');
  if (!address) missing.push('address');
  if (!panNumber) missing.push('panNumber');
  if (!hrName) missing.push('hrName');
  if (!designation) missing.push('designation');
  if (!contactNumber) missing.push('contactNumber');
  if (!email) missing.push('email');
  if (!password) missing.push('password');
  
  if (missing.length) {
    return res.status(400).json({ 
      message: 'Missing required fields', 
      fields: missing 
    });
  }
  
  // PAN validation
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
    return res.status(400).json({ message: 'Invalid PAN format' });
  }
  
  // Mobile validation
  if (!/^[0-9]{10}$/.test(contactNumber)) {
    return res.status(400).json({ message: 'Invalid mobile number format' });
  }
  
  // Email validation
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  
  // Password validation
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  
  // Check for existing employer
  const existing = await Employer.findOne({
    $or: [
      { email: email.toLowerCase() },
      { panNumber: panNumber.toUpperCase() },
      { contactNumber: contactNumber }
    ]
  });
  
  if (existing) {
    const conflicts = [];
    if (existing.email === email.toLowerCase()) conflicts.push('email');
    if (existing.panNumber === panNumber.toUpperCase()) conflicts.push('panNumber');
    if (existing.contactNumber === contactNumber) conflicts.push('contactNumber');
    return res.status(409).json({ 
      message: 'Employer already registered', 
      conflicts 
    });
  }
  
  try {
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Create employer
    const employer = await Employer.create({
      companyName: companyName.trim(),
      address: address.trim(),
      panNumber: panNumber.trim().toUpperCase(),
      hrName: hrName.trim(),
      designation: designation.trim(),
      contactNumber: contactNumber.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      otp: otp,
      otpExpiry: otpExpiry,
      status: 'pending',
      role: 'employer',
      emailVerified: false
    });
    
    try {
      await sendOtpEmail(email, otp, 'employer');
    } catch (_e) {
      // ignore mail failure; user can request resend
    }
    
    return res.status(201).json({ 
      id: employer.id, 
      status: employer.status, 
      emailVerified: employer.emailVerified,
      message: 'Employer registered successfully. Please verify your email.'
    });
  } catch (error) {
    console.error('Employer registration error:', error);
    return res.status(500).json({ 
      message: 'Error registering employer', 
      error: error.message 
    });
  }
}

export async function employerLogin(req, res) {
  const { email, password } = req.body;
  const employer = await Employer.findOne({ email: email.toLowerCase() });
  if (!employer) return res.status(401).json({ message: 'Invalid credentials' });
  
  // Check password (handle both old passwordHash and new password field)
  const passwordToCheck = employer.passwordHash || employer.password;
  const ok = await bcrypt.compare(password, passwordToCheck);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  
  if (!employer.emailVerified) {
    return res.status(403).json({ message: 'Email not verified' });
  }
  if (employer.status !== 'approved') {
    return res.status(403).json({ message: `Account ${employer.status}` });
  }
  
  const token = signJwt({ id: employer.id, role: 'employer' });
  res.json({ 
    token, 
    role: 'employer', 
    companyName: employer.companyName,
    hrName: employer.hrName,
    trustScore: employer.trustScore
  });
}

export async function adminRegister(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }
  const existing = await Admin.findOne({ email });
  if (existing) return res.status(409).json({ message: 'Email already registered' });
  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await Admin.create({ name, email, passwordHash });
  return res.status(201).json({ id: admin.id, name: admin.name, role: admin.role });
}

export async function adminLogin(req, res) {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = signJwt({ id: admin.id, role: 'admin' });
  res.json({ token, role: 'admin', name: admin.name });
}

export async function candidateRegister(req, res) {
  const body = req.body || {};
  
  // Extract all required fields
  const {
    // Basic info
    fullName, name, email, password, confirmPassword,
    // Personal info
    fathersName, gender, dob, permanentAddress, currentAddress,
    mobileNumber, phone, primaryEmail, secondaryEmail,
    // Professional info
    panNumber, pan, uanNumber, uan, highestQualification,
    workExperience, sector, presentCompany, designation,
    workLocation, openToRelocation, currentCtc, expectedHikePercentage,
    noticePeriod, negotiableDays, skillSets
  } = body;

  // Normalize field names and values
  const normalizedData = {
    fullName: (fullName || name || '').trim(),
    email: (email || '').trim().toLowerCase(),
    password: password || '',
    phone: (phone || mobileNumber || '').trim(),
    pan: (pan || panNumber || '').trim().toUpperCase(),
    uan: (uan || uanNumber || '').trim(),
    fathersName: (fathersName || '').trim(),
    gender: (gender || '').trim(),
    dob: dob ? new Date(dob) : null,
    permanentAddress: (permanentAddress || '').trim(),
    currentAddress: (currentAddress || '').trim(),
    mobileNumber: (mobileNumber || phone || '').trim(),
    primaryEmail: (primaryEmail || email || '').trim().toLowerCase(),
    secondaryEmail: (secondaryEmail || '').trim().toLowerCase(),
    panNumber: (panNumber || pan || '').trim().toUpperCase(),
    uanNumber: (uanNumber || uan || '').trim(),
    highestQualification: (highestQualification || '').trim(),
    workExperience: parseInt(workExperience) || 0,
    sector: (sector || '').trim(),
    presentCompany: (presentCompany || '').trim(),
    designation: (designation || '').trim(),
    workLocation: (workLocation || '').trim(),
    openToRelocation: (openToRelocation || '').trim(),
    currentCtc: (currentCtc || '').trim(),
    expectedHikePercentage: (expectedHikePercentage || '').trim(),
    noticePeriod: parseInt(noticePeriod) || 0,
    negotiableDays: parseInt(negotiableDays) || 0,
    skillSets: Array.isArray(skillSets) ? skillSets : []
  };

  // Validation
  const missing = [];
  if (!normalizedData.fullName) missing.push('fullName');
  if (!normalizedData.email) missing.push('email');
  if (!normalizedData.password) missing.push('password');
  if (!confirmPassword) missing.push('confirmPassword');
  if (!normalizedData.pan) missing.push('pan');
  if (!normalizedData.fathersName) missing.push('fathersName');
  if (!normalizedData.gender) missing.push('gender');
  if (!normalizedData.dob) missing.push('dob');
  if (!normalizedData.permanentAddress) missing.push('permanentAddress');
  if (!normalizedData.currentAddress) missing.push('currentAddress');
  if (!normalizedData.mobileNumber) missing.push('mobileNumber');
  if (!normalizedData.primaryEmail) missing.push('primaryEmail');
  if (!normalizedData.panNumber) missing.push('panNumber');
  if (!normalizedData.highestQualification) missing.push('highestQualification');
  if (!normalizedData.workExperience) missing.push('workExperience');
  if (!normalizedData.sector) missing.push('sector');
  if (!normalizedData.presentCompany) missing.push('presentCompany');
  if (!normalizedData.designation) missing.push('designation');
  if (!normalizedData.workLocation) missing.push('workLocation');
  if (!normalizedData.openToRelocation) missing.push('openToRelocation');
  if (!normalizedData.currentCtc) missing.push('currentCtc');
  if (!normalizedData.expectedHikePercentage) missing.push('expectedHikePercentage');
  if (!normalizedData.noticePeriod) missing.push('noticePeriod');
  if (!normalizedData.negotiableDays) missing.push('negotiableDays');

  if (missing.length) {
    return res.status(400).json({ 
      message: 'Missing required fields', 
      fields: missing,
      note: 'Please provide all required candidate information'
    });
  }

  if (normalizedData.password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }
  if (normalizedData.password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  // PAN validation
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(normalizedData.pan)) {
    return res.status(400).json({ message: 'Invalid PAN format' });
  }

  // UAN validation (if provided)
  if (normalizedData.uanNumber && !/^[0-9]{12}$/.test(normalizedData.uanNumber)) {
    return res.status(400).json({ message: 'Invalid UAN format (must be 12 digits)' });
  }

  // Check for existing candidates
  const existing = await CandidateUser.findOne({
    $or: [
      { email: normalizedData.email },
      { primaryEmail: normalizedData.primaryEmail },
      { pan: normalizedData.pan },
      { panNumber: normalizedData.panNumber },
      normalizedData.uan ? { uan: normalizedData.uan } : null,
      normalizedData.uanNumber ? { uanNumber: normalizedData.uanNumber } : null,
    ].filter(Boolean),
  });
  
  if (existing) {
    const conflicts = [];
    if (existing.email === normalizedData.email) conflicts.push('email');
    if (existing.primaryEmail === normalizedData.primaryEmail) conflicts.push('primaryEmail');
    if (existing.pan === normalizedData.pan) conflicts.push('pan');
    if (existing.panNumber === normalizedData.panNumber) conflicts.push('panNumber');
    if (normalizedData.uan && existing.uan === normalizedData.uan) conflicts.push('uan');
    if (normalizedData.uanNumber && existing.uanNumber === normalizedData.uanNumber) conflicts.push('uanNumber');
    return res.status(409).json({ message: 'Already registered', conflicts });
  }

  try {
    const passwordHash = await bcrypt.hash(normalizedData.password, 10);
    const otp = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    
    // Create candidate with all required fields
    const candidate = await CandidateUser.create({
      ...normalizedData,
      passwordHash: passwordHash,
      emailOtpCode: otp,
      emailOtpExpiresAt: expires,
      emailVerified: false,
      status: 'pending' // Admin needs to verify
    });

    try {
      await sendOtpEmail(normalizedData.email, otp, 'candidate');
    } catch (_e) {
      // ignore mail failure; user can request resend
    }
    
    return res.status(201).json({ 
      id: candidate.id, 
      status: candidate.status, 
      emailVerified: candidate.emailVerified,
      profileCompleteness: candidate.profileCompleteness,
      message: 'Candidate registered successfully. Please verify your email and wait for admin approval.'
    });
  } catch (error) {
    console.error('Candidate registration error:', error);
    return res.status(500).json({ 
      message: 'Error registering candidate', 
      error: error.message 
    });
  }
}

export async function candidateLogin(req, res) {
  const { email, password } = req.body;
  const candidate = await CandidateUser.findOne({ email });
  if (!candidate) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, candidate.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  if (!candidate.emailVerified) {
    return res.status(403).json({ message: 'Email not verified' });
  }
  if (candidate.status !== 'approved') {
    return res.status(403).json({ message: `Account ${candidate.status}` });
  }
  const token = signJwt({ id: candidate.id, role: 'candidate' });
  res.json({ token, role: 'candidate', name: candidate.fullName });
}

export async function verifyEmailOtp(req, res) {
  const { role, email, otp, id } = req.body || {};
  if (!role || (!email && !id) || !otp) return res.status(400).json({ message: 'role, email or id, and otp are required' });
  
  const isEmployer = role === 'employer';
  const Model = isEmployer ? Employer : role === 'candidate' ? CandidateUser : null;
  if (!Model) return res.status(400).json({ message: 'Invalid role' });
  
  const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
  const user = id
    ? await Model.findById(id)
    : await Model.findOne({ email: normalizedEmail });
    
  if (!user) return res.status(404).json({ message: 'Not found' });
  if (user.emailVerified) return res.json({ emailVerified: true });
  
  // Handle different OTP field names for different models
  let otpCode, otpExpires;
  if (isEmployer) {
    otpCode = user.otp || user.emailOtpCode;
    otpExpires = user.otpExpiry || user.emailOtpExpiresAt;
  } else {
    otpCode = user.emailOtpCode;
    otpExpires = user.emailOtpExpiresAt;
  }
  
  if (!otpCode || !otpExpires) {
    return res.status(400).json({ message: 'OTP not requested' });
  }
  if (new Date(otpExpires).getTime() < Date.now()) {
    return res.status(400).json({ message: 'OTP expired' });
  }
  if (String(otpCode) !== String(otp)) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }
  
  // Update verification status
  user.emailVerified = true;
  if (isEmployer) {
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.emailOtpCode = undefined;
    user.emailOtpExpiresAt = undefined;
  } else {
    user.emailOtpCode = undefined;
    user.emailOtpExpiresAt = undefined;
  }
  
  await user.save();
  return res.json({ emailVerified: true });
}

export async function resendEmailOtp(req, res) {
  const { role, email, id } = req.body || {};
  if (!role || (!email && !id)) return res.status(400).json({ message: 'role and email or id are required' });
  
  const isEmployer = role === 'employer';
  const Model = isEmployer ? Employer : role === 'candidate' ? CandidateUser : null;
  if (!Model) return res.status(400).json({ message: 'Invalid role' });
  
  const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
  const user = id
    ? await Model.findById(id)
    : await Model.findOne({ email: normalizedEmail });
    
  if (!user) return res.status(404).json({ message: 'Not found' });
  if (user.emailVerified) return res.json({ emailVerified: true });
  
  const otp = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000);
  
  // Update OTP fields based on model
  if (isEmployer) {
    user.otp = otp;
    user.otpExpiry = expires;
    user.emailOtpCode = otp; // Keep for backward compatibility
    user.emailOtpExpiresAt = expires; // Keep for backward compatibility
  } else {
    user.emailOtpCode = otp;
    user.emailOtpExpiresAt = expires;
  }
  
  await user.save();
  try {
    await sendOtpEmail(user.email, otp, role);
  } catch (_e) {}
  return res.json({ sent: true });
}

// ----- Candidate dashboard endpoints -----
export async function candidateMe(req, res) {
  const id = req.user.id;
  const me = await CandidateUser.findById(id)
    .select('-passwordHash -emailOtpCode -emailOtpExpiresAt');
  if (!me) return res.status(404).json({ message: 'Not found' });
  return res.json(me);
}

export async function getCandidateUpdateHistory(req, res) {
  const id = req.user.id;
  const me = await CandidateUser.findById(id).select('updateHistory');
  if (!me) return res.status(404).json({ message: 'Not found' });
  return res.json({ updateHistory: me.updateHistory || [] });
}

export async function updateCandidateProfile(req, res) {
  const id = req.user.id;
  const allowed = ['phone', 'secondaryEmail', 'currentAddress'];
  const update = {};
  for (const k of allowed) if (k in req.body) update[k] = req.body[k];
  if (Object.keys(update).length === 0) {
    return res.status(400).json({ message: 'No allowed fields to update' });
  }
  if (update.secondaryEmail && !/^\S+@\S+\.\S+$/.test(update.secondaryEmail)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  const updated = await CandidateUser.findByIdAndUpdate(id, update, { new: true })
    .select('-passwordHash -emailOtpCode -emailOtpExpiresAt');
  if (!updated) return res.status(404).json({ message: 'Not found' });
  return res.json(updated);
}

export async function changeCandidatePassword(req, res) {
  const id = req.user.id;
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword and newPassword are required' });
  }
  const user = await CandidateUser.findById(id).select('+passwordHash');
  if (!user) return res.status(404).json({ message: 'Not found' });
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Current password incorrect' });
  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  return res.json({ changed: true });
}
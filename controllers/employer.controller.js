import Candidate from '../models/Candidate.js';
import CandidateUser from '../models/CandidateUser.js';
import Employer from '../models/Employer.js';
import AuditLog from '../models/AuditLog.js';
import { computeTrustScore } from '../utils/scoring.js';
import { sendCandidateInvitationEmail, sendCandidateWelcomeEmail } from '../utils/mailer.js';
import mongoose from 'mongoose';

// --- हेल्पर फ़ंक्शंस ---

// यह joiningStatus की गणना करता है (यह सही था)
function normalizeOfferToJoiningStatus(offerStatus) {
  const s = (offerStatus || '').toLowerCase();
  if (s === 'joined') return 'joined';
  if (s === 'not joined') return 'not_joined';
  return 'pending';
}

// *** नया हेल्पर फ़ंक्शन: यह offerStatus को साफ़ और मान्य करता है ***
const VALID_OFFER_STATUSES = ['Offered', 'Accepted', 'Rejected', 'Joined', 'Not Joined', ''];
function sanitizeOfferStatus(status) {
  if (!status) return ''; // null, undefined, या खाली स्ट्रिंग को हैंडल करें
  // केस-असंवेदनशील मिलान करके सही केस वाली वैल्यू ढूंढें
  const foundStatus = VALID_OFFER_STATUSES.find(valid => valid.toLowerCase() === status.trim().toLowerCase());
  return foundStatus !== undefined ? foundStatus : ''; // अगर मान्य है तो उसे लौटाएं, वरना खाली स्ट्र`''`
}


// --- API नियंत्रक ---

export async function addCandidate(req, res) {
  const employerId = req.user.id;
  const { 
    name, 
    email, 
    mobile, 
    position, 
    offerDate, 
    offerStatus, 
    reason,
    // Optional fields
    uan, 
    panNumber, 
    designation, 
    currentCompany, 
    joiningDate, 
    notes 
  } = req.body;
  
  // Validation for required fields
  const missing = [];
  if (!name) missing.push('name');
  if (!email) missing.push('email');
  if (!mobile) missing.push('mobile');
  if (!position) missing.push('position');
  if (!offerDate) missing.push('offerDate');
  if (!offerStatus) missing.push('offerStatus');
  if (!reason) missing.push('reason');
  
  if (missing.length > 0) {
    return res.status(400).json({ 
      message: 'Missing required fields', 
      fields: missing 
    });
  }
  
  // Email validation
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  
  // Mobile validation
  const mobileRegex = /^[0-9+\-\s()]{10,15}$/;
  if (!mobileRegex.test(mobile)) {
    return res.status(400).json({ message: 'Invalid mobile number format' });
  }
  
  // PAN validation (if provided)
  if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
    return res.status(400).json({ message: 'Invalid PAN format' });
  }
  
  // UAN validation (if provided)
  if (uan && !/^[0-9]{12}$/.test(uan)) {
    return res.status(400).json({ message: 'Invalid UAN format' });
  }
  
  // Check for existing candidate with same email
  const existingCandidate = await Candidate.findOne({ email: email.toLowerCase() });
  if (existingCandidate) {
    return res.status(409).json({ 
      message: 'Candidate with this email already exists',
      conflict: 'email'
    });
  }
  
  // Check for existing candidate with same UAN (if provided)
  if (uan) {
    const existingUan = await Candidate.findOne({ uan: uan.toUpperCase() });
    if (existingUan) {
      return res.status(409).json({ 
        message: 'Candidate with this UAN already exists',
        conflict: 'uan'
      });
    }
  }
  
  // Check for existing candidate with same PAN (if provided)
  if (panNumber) {
    const existingPan = await Candidate.findOne({ panNumber: panNumber.toUpperCase() });
    if (existingPan) {
      return res.status(409).json({ 
        message: 'Candidate with this PAN already exists',
        conflict: 'panNumber'
      });
    }
  }
  
  try {
    // Get employer details for employerName
    const employer = await Employer.findById(employerId);
    
    const candidate = await Candidate.create({
      employer: employerId,
      employerName: employer?.companyName || 'Unknown Company',
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      position: position.trim(),
      offerDate: new Date(offerDate),
      offerStatus: offerStatus.trim(),
      reason: reason.trim(),
      // Optional fields
      uan: uan ? uan.trim().toUpperCase() : undefined,
      panNumber: panNumber ? panNumber.trim().toUpperCase() : undefined,
      designation: designation ? designation.trim() : undefined,
      currentCompany: currentCompany ? currentCompany.trim() : undefined,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      notes: notes ? notes.trim() : undefined,
      verified: false
    });
    
    // Send welcome email to candidate (if employer exists)
    if (employer) {
      try {
        const siteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}`;
        await sendCandidateWelcomeEmail(
          email,
          name,
          employer.hrName || employer.companyName,
          employer.companyName,
          siteUrl
        );
        
        console.log(`📧 Welcome email sent to candidate: ${email}`);
      } catch (emailError) {
        console.error('❌ Failed to send welcome email:', emailError.message);
        // Don't fail the entire operation if email fails
        // You might want to log this to a separate error tracking system
      }
    }
    
    // Create audit log
    await AuditLog.create({
      actorType: 'employer', 
      actorId: employerId, 
      action: 'add_candidate',
      targetType: 'candidate', 
      targetId: candidate._id, 
      metadata: { 
        email, 
        offerStatus, 
        reason,
        position 
      },
    });
    
    res.status(201).json({
      success: true,
      message: 'Candidate added successfully',
      candidate: {
        id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        mobile: candidate.mobile,
        position: candidate.position,
        offerStatus: candidate.offerStatus,
        reason: candidate.reason,
        joiningStatus: candidate.joiningStatus,
        createdAt: candidate.createdAt
      }
    });
  } catch (error) {
    console.error('Error adding candidate:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ 
        message: `Candidate with this ${field} already exists`,
        conflict: field
      });
    }
    
    res.status(500).json({ 
      message: 'Error adding candidate', 
      error: error.message 
    });
  }
}

// Bulk upload removed as per requirements



export async function verifyCandidate(req, res) {
  const employerId = req.user.id;
  const { uan, email, mobile } = req.query;
  const query = { employer: employerId };
  if (uan) query.uan = uan;
  if (email) query.email = email;
  if (mobile) query.mobile = mobile;
  if (!uan && !email && !mobile) return res.status(400).json({ message: 'Provide uan or email or mobile' });
  const candidate = await Candidate.findOne(query);
  if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
  await AuditLog.create({
    actorType: 'employer', actorId: employerId, action: 'verify_candidate', targetType: 'candidate',
    targetId: candidate._id, metadata: { joiningStatus: candidate.joiningStatus, verified: candidate.verified },
  });
  const [total, joined] = await Promise.all([
    Candidate.countDocuments({ employer: employerId }),
    Candidate.countDocuments({ employer: employerId, joiningStatus: 'joined' }),
  ]);
  const trustScore = computeTrustScore(total, joined);
  await Employer.findByIdAndUpdate(employerId, { trustScore });
  res.json(candidate);
}

export async function listAllCandidates(req, res) {
  const employerId = req.user.id;
  const { search, type } = req.query;
  
  try {
    let candidates = [];
    let candidateUsers = [];
    
    // Search query setup
    const searchRegex = search ? new RegExp(search, 'i') : null;
    
    // Get regular candidates (invited by this employer)
    const candidateQuery = { employer: employerId };
    if (searchRegex) {
      candidateQuery.$or = [
        { email: searchRegex },
        { uan: searchRegex },
        { name: searchRegex }
      ];
    }
    
    // Get candidate users (verified candidates)
    const candidateUserQuery = { status: 'approved' };
    if (searchRegex) {
      candidateUserQuery.$or = [
        { email: searchRegex },
        { primaryEmail: searchRegex },
        { fullName: searchRegex },
        { pan: searchRegex },
        { uan: searchRegex }
      ];
    }
    
    // Fetch based on type parameter
    if (!type || type === 'all') {
      // Get both types
      [candidates, candidateUsers] = await Promise.all([
        Candidate.find(candidateQuery).sort({ createdAt: -1 }),
        CandidateUser.find(candidateUserQuery).sort({ createdAt: -1 })
      ]);
    } else if (type === 'invited') {
      // Only invited candidates
      candidates = await Candidate.find(candidateQuery).sort({ createdAt: -1 });
    } else if (type === 'verified') {
      // Only verified candidate users
      candidateUsers = await CandidateUser.find(candidateUserQuery).sort({ createdAt: -1 });
    }
    
    // Format response
    const formattedCandidates = candidates.map(candidate => ({
      id: candidate._id,
      type: 'invited',
      name: candidate.name,
      email: candidate.email,
      mobile: candidate.mobile,
      uan: candidate.uan,
      position: candidate.position,
      offerDate: candidate.offerDate,
      offerStatus: candidate.offerStatus,
      joiningDate: candidate.joiningDate,
      joiningStatus: candidate.joiningStatus,
      verified: candidate.verified,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt
    }));
    
    const formattedCandidateUsers = candidateUsers.map(candidate => ({
      id: candidate._id,
      type: 'verified',
      name: candidate.fullName,
      email: candidate.email,
      primaryEmail: candidate.primaryEmail,
      mobile: candidate.mobileNumber,
      uan: candidate.uan,
      pan: candidate.pan,
      fathersName: candidate.fathersName,
      gender: candidate.gender,
      dob: candidate.dob,
      highestQualification: candidate.highestQualification,
      workExperience: candidate.workExperience,
      sector: candidate.sector,
      presentCompany: candidate.presentCompany,
      designation: candidate.designation,
      workLocation: candidate.workLocation,
      openToRelocation: candidate.openToRelocation,
      currentCtc: candidate.currentCtc,
      expectedHikePercentage: candidate.expectedHikePercentage,
      noticePeriod: candidate.noticePeriod,
      negotiableDays: candidate.negotiableDays,
      skillSets: candidate.skillSets,
      profileCompleteness: candidate.profileCompleteness,
      verifiedBy: candidate.verifiedBy,
      verifiedAt: candidate.verifiedAt,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt
    }));
    
    // Combine and sort by creation date
    const allCandidates = [...formattedCandidates, ...formattedCandidateUsers]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      total: allCandidates.length,
      invited: formattedCandidates.length,
      verified: formattedCandidateUsers.length,
      candidates: allCandidates
    });
    
  } catch (error) {
    console.error('Error listing all candidates:', error);
    res.status(500).json({ 
      message: 'Error fetching candidates', 
      error: error.message 
    });
  }
}

export async function listCandidates(req, res) {
  const employerId = req.user.id;
  const { search } = req.query;
  
  let query = { employer: employerId };
  
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    query.$or = [
      { email: searchRegex },
      { uan: searchRegex }
    ];
  }
  
  const candidates = await Candidate.find(query).sort({ createdAt: -1 });
  res.json(candidates);
}

// Employer: read a verified candidate user's update history (read-only, includes comments)
export async function getCandidateUserUpdateHistoryByEmployer(req, res) {
  const { id } = req.params;
  // Only allow viewing approved candidate users
  const user = await CandidateUser.findById(id).select('status updateHistory');
  if (!user) return res.status(404).json({ message: 'Candidate user not found' });
  if (user.status !== 'approved') {
    return res.status(403).json({ message: 'Candidate not approved' });
  }
  return res.json({ updateHistory: user.updateHistory || [] });
}

export async function searchCandidates(req, res) {
  const employerId = req.user.id;
  const { q } = req.query;
  
  if (!q || q.trim() === '') {
    return res.status(400).json({ message: 'Search query is required' });
  }
  
  const searchRegex = new RegExp(q.trim(), 'i');
  const query = {
    employer: employerId,
    $or: [
      { email: searchRegex },
      { uan: searchRegex }
    ]
  };
  
  try {
    const candidates = await Candidate.find(query).sort({ createdAt: -1 });
    await AuditLog.create({
      actorType: 'employer', 
      actorId: employerId, 
      action: 'search_candidates', 
      targetType: 'candidate', 
      targetId: employerId, 
      metadata: { searchQuery: q, resultsCount: candidates.length }
    });
    res.json({ 
      success: true, 
      query: q, 
      count: candidates.length, 
      candidates 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error searching candidates', error: error.message });
  }
}

export async function employerMetrics(req, res) {
  const employerId = req.user.id;
  const [totalCandidatesAdded, nonJoiningCases, verifiedRecords, employer] = await Promise.all([
    Candidate.countDocuments({ employer: employerId }),
    Candidate.countDocuments({ employer: employerId, joiningStatus: 'not_joined' }),
    Candidate.countDocuments({ employer: employerId, verified: true }),
    Employer.findById(employerId),
  ]);
  res.json({
    totalCandidatesAdded, nonJoiningCases, verifiedRecords,
    companyTrustScore: Number((employer?.trustScore || 8.5).toFixed(1)),
  });
}

export async function employerReports(req, res) {
  const employerId = req.user.id;
  const totalOffers = await Candidate.countDocuments({ employer: employerId });
  const joined = await Candidate.countDocuments({ employer: employerId, joiningStatus: 'joined' });
  const notJoined = await Candidate.countDocuments({ employer: employerId, joiningStatus: 'not_joined' });
  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  const pipeline = [
    { $match: { employer: new mongoose.Types.ObjectId(employerId), offerDate: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$offerDate' } }, joined: { $sum: { $cond: [{ $eq: ['$joiningStatus', 'joined'] }, 1, 0] } }, total: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ];
  const trendAgg = await Candidate.aggregate(pipeline);
  const trends = trendAgg.map((t) => ({ month: t._id, joined: t.joined, total: t.total }));
  const joinedPct = totalOffers ? Number(((joined / totalOffers) * 100).toFixed(2)) : 0;
  const notJoinedPct = totalOffers ? Number(((notJoined / totalOffers) * 100).toFixed(2)) : 0;
  res.json({ totalOffers, joinedPct, notJoinedPct, trends });
}

export async function employerProfile(req, res) {
  const employerId = req.user.id;
  const employer = await Employer.findById(employerId).select('-passwordHash -password -otp -otpExpiry -emailOtpCode -emailOtpExpiresAt');
  if (!employer) return res.status(404).json({ message: 'Not found' });
  res.json(employer);
}

export async function updateEmployerProfile(req, res) {
  const employerId = req.user.id;
  const { 
    companyName, 
    address, 
    panNumber, 
    hrName, 
    designation, 
    contactNumber, 
    email, 
    industry, 
    companyCode 
  } = req.body;
  
  // Validation for required fields if updating
  if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
    return res.status(400).json({ message: 'Invalid PAN format' });
  }
  
  if (contactNumber && !/^[0-9]{10}$/.test(contactNumber)) {
    return res.status(400).json({ message: 'Invalid mobile number format' });
  }
  
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  
  // Check for conflicts if updating unique fields
  if (email || panNumber || contactNumber) {
    const conflictQuery = { _id: { $ne: employerId } };
    const conflicts = [];
    
    if (email) {
      const emailConflict = await Employer.findOne({ ...conflictQuery, email: email.toLowerCase() });
      if (emailConflict) conflicts.push('email');
    }
    
    if (panNumber) {
      const panConflict = await Employer.findOne({ ...conflictQuery, panNumber: panNumber.toUpperCase() });
      if (panConflict) conflicts.push('panNumber');
    }
    
    if (contactNumber) {
      const contactConflict = await Employer.findOne({ ...conflictQuery, contactNumber: contactNumber });
      if (contactConflict) conflicts.push('contactNumber');
    }
    
    if (conflicts.length > 0) {
      return res.status(409).json({ 
        message: 'Update conflicts with existing data', 
        conflicts 
      });
    }
  }
  
  const update = { 
    companyName, 
    address, 
    panNumber: panNumber ? panNumber.toUpperCase() : undefined,
    hrName, 
    designation, 
    contactNumber, 
    email: email ? email.toLowerCase() : undefined,
    industry, 
    companyCode 
  };
  
  // Remove undefined values
  Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);
  
  const employer = await Employer.findByIdAndUpdate(employerId, update, { new: true })
    .select('-passwordHash -password -otp -otpExpiry -emailOtpCode -emailOtpExpiresAt');
    
  if (!employer) return res.status(404).json({ message: 'Not found' });
  res.json(employer);
}

// Allow employer to update limited fields on a verified candidate user and record history
export async function updateCandidateUserByEmployer(req, res) {
  const employerId = req.user.id;
  const { id } = req.params;
  const allowedFields = [
    'presentCompany', 'designation', 'workLocation', 'currentCtc', 'expectedHikePercentage',
    'noticePeriod', 'negotiableDays', 'skillSets', 'verificationNotes'
  ];
  const updates = {};
  for (const key of allowedFields) {
    if (key in req.body) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No allowed fields to update' });
  }

  const [candidateUser, employer] = await Promise.all([
    CandidateUser.findById(id),
    Employer.findById(employerId).select('companyName hrName')
  ]);
  if (!candidateUser) return res.status(404).json({ message: 'Candidate user not found' });

  // Apply updates
  Object.assign(candidateUser, updates);
  await candidateUser.save();

  // Append update history on candidate user
  try {
    await candidateUser.appendUpdateHistory({
      role: 'employer',
      name: employer?.hrName || employer?.companyName || 'Employer',
      companyName: employer?.companyName || null,
      employerId: employerId,
      notes: req.body?.notes || null
    });
  } catch (_) {}

  // Create audit log
  try {
    await AuditLog.create({
      actorType: 'employer',
      actorId: employerId,
      action: 'update_candidate_user',
      targetType: 'candidate_user',
      targetId: candidateUser._id,
      metadata: { updatedFields: Object.keys(updates) }
    });
  } catch (_) {}

  res.json({
    success: true,
    id: candidateUser.id,
    updatedFields: Object.keys(updates),
    updateHistoryCount: candidateUser.updateHistory?.length || 0
  });
}

// Employer can update their own updateHistory entry (only entries created by this employer)
export async function updateCandidateUserHistoryByEmployer(req, res) {
  const employerId = req.user.id;
  const { id, entryId } = req.params;
  const { date, notes } = req.body || {};
  const user = await CandidateUser.findById(id);
  if (!user) return res.status(404).json({ message: 'Candidate user not found' });
  const entry = (user.updateHistory || []).find((e) => String(e._id) === String(entryId));
  if (!entry) return res.status(404).json({ message: 'History entry not found' });
  if (String(entry.employer) !== String(employerId) || entry.updatedByRole !== 'employer') {
    return res.status(403).json({ message: 'Not allowed to modify this entry' });
  }
  if (date) entry.date = new Date(date);
  if (typeof notes === 'string') entry.notes = notes;
  user.resequenceUpdateHistory();
  await user.save();
  return res.json({ updated: true });
}

// Employer can delete their own updateHistory entry
export async function deleteCandidateUserHistoryByEmployer(req, res) {
  const employerId = req.user.id;
  const { id, entryId } = req.params;
  const user = await CandidateUser.findById(id);
  if (!user) return res.status(404).json({ message: 'Candidate user not found' });
  const target = (user.updateHistory || []).find((e) => String(e._id) === String(entryId));
  if (!target) return res.status(404).json({ message: 'History entry not found' });
  if (String(target.employer) !== String(employerId) || target.updatedByRole !== 'employer') {
    return res.status(403).json({ message: 'Not allowed to delete this entry' });
  }
  user.updateHistory = (user.updateHistory || []).filter((e) => String(e._id) !== String(entryId));
  user.resequenceUpdateHistory();
  await user.save();
  return res.json({ deleted: true });
}
import Employer from '../models/Employer.js';
import Candidate from '../models/Candidate.js';
import CandidateUser from '../models/CandidateUser.js';
import Admin from '../models/Admin.js';

export async function listEmployers(_req, res) {
  const employers = await Employer.find().sort({ createdAt: -1 }).select('-passwordHash');
  res.json(employers);
}

export async function approveEmployer(req, res) {
  const { id } = req.params;
  const employer = await Employer.findByIdAndUpdate(id, { status: 'approved' }, { new: true });
  if (!employer) return res.status(404).json({ message: 'Employer not found' });
  res.json({ id: employer.id, status: employer.status });
}

export async function rejectEmployer(req, res) {
  const { id } = req.params;
  const employer = await Employer.findByIdAndUpdate(id, { status: 'rejected' }, { new: true });
  if (!employer) return res.status(404).json({ message: 'Employer not found' });
  res.json({ id: employer.id, status: employer.status });
}

export async function suspendEmployer(req, res) {
  const { id } = req.params;
  const employer = await Employer.findByIdAndUpdate(id, { status: 'suspended' }, { new: true });
  if (!employer) return res.status(404).json({ message: 'Employer not found' });
  res.json({ id: employer.id, status: employer.status });
}

export async function unsuspendEmployer(req, res) {
  const { id } = req.params;
  const employer = await Employer.findById(id);
  if (!employer) return res.status(404).json({ message: 'Employer not found' });
  // Restore to approved if previously approved, otherwise keep as pending
  const nextStatus = employer.status === 'approved' || employer.status === 'suspended' ? 'approved' : 'pending';
  const updated = await Employer.findByIdAndUpdate(id, { status: nextStatus }, { new: true });
  res.json({ id: updated.id, status: updated.status });
}

export async function adminMetrics(_req, res) {
  const [totalEmployers, totalCandidates, verifiedRecords, pendingVerifications] = await Promise.all([
    Employer.countDocuments({}),
    Candidate.countDocuments({}),
    Candidate.countDocuments({ verified: true }),
    Candidate.countDocuments({ joiningStatus: 'pending' }),
  ]);
  res.json({ totalEmployers, totalCandidates, verifiedRecords, pendingVerifications });
}

export async function adminReports(_req, res) {
  const totalOffers = await Candidate.countDocuments();
  const joined = await Candidate.countDocuments({ joiningStatus: 'joined' });
  const notJoined = await Candidate.countDocuments({ joiningStatus: 'not_joined' });
  const acceptanceRate = totalOffers ? (joined / totalOffers) * 100 : 0;
  res.json({ totalOffers, joined, notJoined, acceptanceRate: Number(acceptanceRate.toFixed(2)) });
}

export async function listAllCandidates(req, res) {
  const { employerId } = req.query;
  const filter = employerId ? { employer: employerId } : {};
  const candidates = await Candidate.find(filter)
    .populate({ path: 'employer', select: 'companyName email status' })
    .sort({ createdAt: -1 });
  res.json(candidates);
}

export async function listCandidateUsers(_req, res) {
  const users = await CandidateUser.find().sort({ createdAt: -1 }).select('-passwordHash');
  res.json(users);
}

export async function approveCandidateUser(req, res) {
  const { id } = req.params;
  const { notes } = req.body;
  const adminId = req.user.id;
  
  const user = await CandidateUser.findById(id);
  if (!user) return res.status(404).json({ message: 'Candidate user not found' });
  
  // Use the model method for verification
  await user.verifyUser(adminId, notes);
  // Append update history
  try {
    const admin = await Admin.findById(adminId).select('name');
    await user.appendUpdateHistory({
      role: 'admin',
      name: admin?.name || 'Admin',
      adminId: adminId,
      notes: notes || 'approved'
    });
  } catch (_) {}
  
  res.json({ 
    id: user.id, 
    status: user.status,
    verifiedBy: user.verifiedBy,
    verifiedAt: user.verifiedAt,
    verificationNotes: user.verificationNotes
  });
}

// Update a specific updateHistory entry (admin)
export async function updateCandidateUserHistoryEntry(req, res) {
  const { id, entryId } = req.params;
  const { date, notes } = req.body || {};
  const user = await CandidateUser.findById(id);
  if (!user) return res.status(404).json({ message: 'Candidate user not found' });
  const entry = (user.updateHistory || []).find((e) => String(e._id) === String(entryId));
  if (!entry) return res.status(404).json({ message: 'History entry not found' });
  if (date) entry.date = new Date(date);
  if (typeof notes === 'string') entry.notes = notes;
  user.resequenceUpdateHistory();
  await user.save();
  return res.json({ updated: true });
}

// Delete a specific updateHistory entry (admin)
export async function deleteCandidateUserHistoryEntry(req, res) {
  const { id, entryId } = req.params;
  const user = await CandidateUser.findById(id);
  if (!user) return res.status(404).json({ message: 'Candidate user not found' });
  const before = user.updateHistory?.length || 0;
  user.updateHistory = (user.updateHistory || []).filter((e) => String(e._id) !== String(entryId));
  if (user.updateHistory.length === before) {
    return res.status(404).json({ message: 'History entry not found' });
  }
  user.resequenceUpdateHistory();
  await user.save();
  return res.json({ deleted: true });
}

export async function rejectCandidateUser(req, res) {
  const { id } = req.params;
  const { notes } = req.body;
  const adminId = req.user.id;
  
  const user = await CandidateUser.findById(id);
  if (!user) return res.status(404).json({ message: 'Candidate user not found' });
  
  // Use the model method for rejection
  await user.rejectUser(adminId, notes);
  // Append update history
  try {
    const admin = await Admin.findById(adminId).select('name');
    await user.appendUpdateHistory({
      role: 'admin',
      name: admin?.name || 'Admin',
      adminId: adminId,
      notes: notes || 'rejected'
    });
  } catch (_) {}
  
  res.json({ 
    id: user.id, 
    status: user.status,
    verifiedBy: user.verifiedBy,
    verifiedAt: user.verifiedAt,
    verificationNotes: user.verificationNotes
  });
}

export async function suspendCandidateUser(req, res) {
  const { id } = req.params;
  const user = await CandidateUser.findByIdAndUpdate(id, { status: 'suspended' }, { new: true });
  if (!user) return res.status(404).json({ message: 'Candidate user not found' });
  res.json({ id: user.id, status: user.status });
}

export async function unsuspendCandidateUser(req, res) {
  const { id } = req.params;
  const user = await CandidateUser.findById(id);
  if (!user) return res.status(404).json({ message: 'Candidate user not found' });
  const nextStatus = user.status === 'approved' || user.status === 'suspended' ? 'approved' : 'pending';
  const updated = await CandidateUser.findByIdAndUpdate(id, { status: nextStatus }, { new: true });
  res.json({ id: updated.id, status: updated.status });
}

// New functions for candidate user management
export async function getPendingCandidateUsers(_req, res) {
  const users = await CandidateUser.findPendingUsers()
    .populate('verifiedBy', 'name email')
    .select('-passwordHash')
    .sort({ createdAt: -1 });
  res.json(users);
}

export async function getVerifiedCandidateUsers(_req, res) {
  const users = await CandidateUser.findVerifiedUsers()
    .populate('verifiedBy', 'name email')
    .select('-passwordHash')
    .sort({ verifiedAt: -1 });
  res.json(users);
}

export async function getCandidateUserDetails(req, res) {
  const { id } = req.params;
  const user = await CandidateUser.findById(id)
    .populate('verifiedBy', 'name email')
    .populate('createdBy', 'companyName email')
    .select('-passwordHash');
  
  if (!user) return res.status(404).json({ message: 'Candidate user not found' });
  res.json(user);
}

export async function updateCandidateUserStatus(req, res) {
  const { id } = req.params;
  const { status, notes } = req.body;
  const adminId = req.user.id;
  
  if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  
  const user = await CandidateUser.findById(id);
  if (!user) return res.status(404).json({ message: 'Candidate user not found' });
  
  user.status = status;
  user.verifiedBy = adminId;
  user.verifiedAt = new Date();
  if (notes) {
    user.verificationNotes = notes;
  }
  
  await user.save();
  // Append update history
  try {
    const admin = await Admin.findById(adminId).select('name');
    await user.appendUpdateHistory({
      role: 'admin',
      name: admin?.name || 'Admin',
      adminId: adminId,
      notes: notes || `status: ${status}`
    });
  } catch (_) {}
  
  res.json({ 
    id: user.id, 
    status: user.status,
    verifiedBy: user.verifiedBy,
    verifiedAt: user.verifiedAt,
    verificationNotes: user.verificationNotes
  });
}



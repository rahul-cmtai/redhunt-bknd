import ContactLead from '../models/ContactLead.js';
import { sendContactFormConfirmationEmail } from '../utils/mailer.js';

// Create a new contact lead (public endpoint)
export async function createContactLead(req, res) {
  try {
    const { name, email, company, phone, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        message: 'Name, email, subject, and message are required' 
      });
    }

    // Validate subject is not empty and has reasonable length
    if (typeof subject !== 'string' || subject.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Subject cannot be empty' 
      });
    }

    if (subject.trim().length > 200) {
      return res.status(400).json({ 
        message: 'Subject must be 200 characters or less' 
      });
    }

    const contactLead = new ContactLead({
      name,
      email,
      company: company || '',
      phone: phone || '',
      subject,
      message,
      status: 'new'
    });

    await contactLead.save();

    // Send confirmation email to the user
    try {
      await sendContactFormConfirmationEmail(email, name);
      console.log(`✅ Contact form confirmation email sent to: ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send contact form confirmation email:', emailError?.message || emailError);
      // Don't fail the request if email fails, but log it
    }

    res.status(201).json({
      message: 'Contact form submitted successfully',
      id: contactLead._id
    });
  } catch (error) {
    console.error('Error creating contact lead:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to submit contact form' 
    });
  }
}

// Get all contact leads (admin only)
export async function getAllContactLeads(req, res) {
  try {
    const { status, subject, search, page = 1, limit = 20 } = req.query;
    
    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (subject) {
      query.subject = subject;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [leads, total] = await Promise.all([
      ContactLead.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ContactLead.countDocuments(query)
    ]);

    res.json({
      leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching contact leads:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to fetch contact leads' 
    });
  }
}

// Get a single contact lead by ID (admin only)
export async function getContactLeadById(req, res) {
  try {
    const { id } = req.params;
    
    const lead = await ContactLead.findById(id);
    
    if (!lead) {
      return res.status(404).json({ message: 'Contact lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Error fetching contact lead:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to fetch contact lead' 
    });
  }
}

// Update contact lead status (admin only)
export async function updateContactLeadStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['new', 'read', 'replied', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be one of: new, read, replied, archived' 
      });
    }

    const lead = await ContactLead.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ message: 'Contact lead not found' });
    }

    res.json({
      message: 'Status updated successfully',
      lead
    });
  } catch (error) {
    console.error('Error updating contact lead status:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to update contact lead status' 
    });
  }
}

// Add admin notes to contact lead (admin only)
export async function addAdminNotes(req, res) {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    if (!adminNotes) {
      return res.status(400).json({ message: 'Admin notes are required' });
    }

    const lead = await ContactLead.findByIdAndUpdate(
      id,
      { adminNotes },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ message: 'Contact lead not found' });
    }

    res.json({
      message: 'Admin notes updated successfully',
      lead
    });
  } catch (error) {
    console.error('Error adding admin notes:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to add admin notes' 
    });
  }
}

// Get contact leads statistics (admin only)
export async function getContactLeadsStats(req, res) {
  try {
    const [total, newLeads, readLeads, repliedLeads, archivedLeads] = await Promise.all([
      ContactLead.countDocuments({}),
      ContactLead.countDocuments({ status: 'new' }),
      ContactLead.countDocuments({ status: 'read' }),
      ContactLead.countDocuments({ status: 'replied' }),
      ContactLead.countDocuments({ status: 'archived' })
    ]);

    const statsBySubject = await ContactLead.aggregate([
      {
        $group: {
          _id: '$subject',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      total,
      byStatus: {
        new: newLeads,
        read: readLeads,
        replied: repliedLeads,
        archived: archivedLeads
      },
      bySubject: statsBySubject.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching contact leads stats:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to fetch contact leads statistics' 
    });
  }
}


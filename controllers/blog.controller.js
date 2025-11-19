import Blog from '../models/Blog.js';

// Get all blogs (public - only published)
export async function getBlogs(req, res) {
  try {
    // Public route - only show published blogs
    const blogs = await Blog.find({ status: 'published' })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ date: -1 });
    
    res.json(blogs);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ message: 'Error fetching blogs', error: error.message });
  }
}

// Get blog by slug (public - only published unless admin)
export async function getBlogBySlug(req, res) {
  try {
    const { slug } = req.params;
    
    let query = { slug };
    
    // If user is not admin, only show published blogs
    if (!req.user || req.user.role !== 'admin') {
      query.status = 'published';
    }
    
    const blog = await Blog.findOne(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog post not found' });
    }
    
    res.json(blog);
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ message: 'Error fetching blog', error: error.message });
  }
}

// Get blog by ID (admin only)
export async function getBlogById(req, res) {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog post not found' });
    }
    
    res.json(blog);
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ message: 'Error fetching blog', error: error.message });
  }
}

// Create blog (admin only)
export async function createBlog(req, res) {
  try {
    const { title, slug, description, content, date, readTime, points, status } = req.body;
    
    // Validation
    if (!title || !description || !content) {
      return res.status(400).json({ message: 'Title, description, and content are required' });
    }
    
    if (!points || !Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ message: 'At least one key point is required' });
    }
    
    // Generate slug from title if not provided
    let blogSlug = slug;
    if (!blogSlug) {
      blogSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    
    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug: blogSlug });
    if (existingBlog) {
      return res.status(400).json({ message: 'A blog with this slug already exists' });
    }
    
    const blog = new Blog({
      title,
      slug: blogSlug,
      description,
      content,
      date: date ? new Date(date) : new Date(),
      readTime: readTime || '5 min read',
      points,
      status: status || 'draft',
      createdBy: req.user.id
    });
    
    await blog.save();
    
    const populatedBlog = await Blog.findById(blog._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    res.status(201).json(populatedBlog);
  } catch (error) {
    console.error('Error creating blog:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A blog with this slug already exists' });
    }
    res.status(500).json({ message: 'Error creating blog', error: error.message });
  }
}

// Update blog (admin only)
export async function updateBlog(req, res) {
  try {
    const { id } = req.params;
    const { title, slug, description, content, date, readTime, points, status } = req.body;
    
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog post not found' });
    }
    
    // Update fields
    if (title) blog.title = title;
    if (slug) {
      // Check if new slug already exists (excluding current blog)
      const existingBlog = await Blog.findOne({ slug, _id: { $ne: id } });
      if (existingBlog) {
        return res.status(400).json({ message: 'A blog with this slug already exists' });
      }
      blog.slug = slug;
    }
    if (description) blog.description = description;
    if (content) blog.content = content;
    if (date) blog.date = new Date(date);
    if (readTime) blog.readTime = readTime;
    if (points && Array.isArray(points)) {
      if (points.length === 0) {
        return res.status(400).json({ message: 'At least one key point is required' });
      }
      blog.points = points;
    }
    if (status && ['draft', 'published', 'archived'].includes(status)) {
      blog.status = status;
    }
    
    blog.updatedBy = req.user.id;
    
    await blog.save();
    
    const populatedBlog = await Blog.findById(blog._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    res.json(populatedBlog);
  } catch (error) {
    console.error('Error updating blog:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A blog with this slug already exists' });
    }
    res.status(500).json({ message: 'Error updating blog', error: error.message });
  }
}

// Delete blog (admin only)
export async function deleteBlog(req, res) {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog post not found' });
    }
    
    res.json({ message: 'Blog post deleted successfully', id: blog._id });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ message: 'Error deleting blog', error: error.message });
  }
}

// Get blogs with filters (admin only)
export async function getBlogsWithFilters(req, res) {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    // Status filter
    if (status && ['draft', 'published', 'archived'].includes(status)) {
      query.status = status;
    }
    
    // Search filter (title or description)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Blog.countDocuments(query)
    ]);
    
    res.json({
      blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching blogs with filters:', error);
    res.status(500).json({ message: 'Error fetching blogs', error: error.message });
  }
}


const prisma = require('../config/database');
const { AppError } = require('../middleware/error.middleware');

// ─── GET /api/careers  (public) ───────────────────────────────────────────────
const getJobs = async (req, res, next) => {
  try {
    const { department, location } = req.query;

    const where = {
      status: 'OPEN',
      ...(department && { department: { contains: department, mode: 'insensitive' } }),
      ...(location && { location: { contains: location, mode: 'insensitive' } }),
    };

    const jobs = await prisma.job.findMany({
      where,
      select: { id: true, title: true, department: true, location: true, type: true, description: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/careers/:id  (public) ───────────────────────────────────────────
const getJob = async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job || job.status !== 'OPEN') return next(new AppError('Job not found.', 404));
    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/careers/:id/apply  (public) ────────────────────────────────────
const applyForJob = async (req, res, next) => {
  try {
    const { fullName, email, phone, coverLetter, cvUrl } = req.body;
    if (!fullName || !email) return next(new AppError('Full name and email are required.', 400));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return next(new AppError('Invalid email address.', 400));

    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job || job.status !== 'OPEN') return next(new AppError('This position is no longer available.', 404));

    const application = await prisma.jobApplication.create({
      data: {
        jobId: req.params.id,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim(),
        coverLetter,
        cvUrl,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Your application has been submitted. We will be in touch.',
      data: { id: application.id },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Admin CRUD ────────────────────────────────────────────────────────────────

const getAllJobs = async (req, res, next) => {
  try {
    const jobs = await prisma.job.findMany({
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
};

const createJob = async (req, res, next) => {
  try {
    const { title, department, location, type, description, requirements, status } = req.body;
    if (!title || !department || !location || !type || !description) {
      return next(new AppError('Title, department, location, type, and description are required.', 400));
    }

    const job = await prisma.job.create({
      data: { title, department, location, type, description, requirements, status: status || 'OPEN' },
    });

    res.status(201).json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};

const updateJob = async (req, res, next) => {
  try {
    const { title, department, location, type, description, requirements, status } = req.body;

    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return next(new AppError('Job not found.', 404));

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(department !== undefined && { department }),
        ...(location !== undefined && { location }),
        ...(type !== undefined && { type }),
        ...(description !== undefined && { description }),
        ...(requirements !== undefined && { requirements }),
        ...(status !== undefined && { status }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const deleteJob = async (req, res, next) => {
  try {
    await prisma.job.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Job deleted.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/careers/:id/applications
const getApplications = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      jobId: req.params.id,
      ...(status && { status }),
    };

    const [applications, total] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.jobApplication.count({ where }),
    ]);

    res.json({
      success: true,
      data: applications,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/applications/:id  (update application status)
const updateApplication = async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await prisma.jobApplication.update({
      where: { id: req.params.id },
      data: { ...(status !== undefined && { status }) },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getJobs, getJob, applyForJob,
  getAllJobs, createJob, updateJob, deleteJob,
  getApplications, updateApplication,
};

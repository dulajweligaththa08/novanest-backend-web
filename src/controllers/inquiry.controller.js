const prisma = require('../config/database');
const { AppError } = require('../middleware/error.middleware');
const { sendInquiryEmail } = require('../utils/email');

// ─── POST /api/inquiries  (public) ────────────────────────────────────────────
const submitInquiry = async (req, res, next) => {
  try {
    const { customerName, email, phone, projectId, apartmentId, message } = req.body;

    if (!customerName || !email || !message) {
      return next(new AppError('Name, email, and message are required.', 400));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return next(new AppError('Invalid email address.', 400));

    // Validate project/apartment exist if provided
    let project = null;
    let apartment = null;

    if (projectId) {
      project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return next(new AppError('Project not found.', 404));
    }

    if (apartmentId) {
      apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
      if (!apartment) return next(new AppError('Apartment not found.', 404));
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        customerName: customerName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim(),
        projectId: projectId || null,
        apartmentId: apartmentId || null,
        message: message.trim(),
        status: 'NEW',
      },
    });

    // Fire-and-forget email — don't fail the request if email fails
    sendInquiryEmail({
      customerName: customerName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim(),
      projectName: project?.name,
      apartmentUnit: apartment?.unitNumber,
      message: message.trim(),
    }).catch((err) => console.error('Inquiry email failed:', err.message));

    res.status(201).json({
      success: true,
      message: 'Your inquiry has been submitted. We will contact you shortly.',
      data: { id: inquiry.id },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/inquiries  (admin) ────────────────────────────────────────
const getInquiries = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { customerName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          apartment: { select: { id: true, unitNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.inquiry.count({ where }),
    ]);

    res.json({
      success: true,
      data: inquiries,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/inquiries/:id  (admin) ────────────────────────────────────
const getInquiry = async (req, res, next) => {
  try {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
        apartment: { include: { floor: { include: { building: { include: { project: true } } } } } },
      },
    });
    if (!inquiry) return next(new AppError('Inquiry not found.', 404));
    res.json({ success: true, data: inquiry });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/admin/inquiries/:id  (update status + notes) ───────────────────
const updateInquiry = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;

    const inquiry = await prisma.inquiry.findUnique({ where: { id: req.params.id } });
    if (!inquiry) return next(new AppError('Inquiry not found.', 404));

    const updated = await prisma.inquiry.update({
      where: { id: req.params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(adminNotes !== undefined && { adminNotes }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/admin/inquiries/:id  (admin) ─────────────────────────────────
const deleteInquiry = async (req, res, next) => {
  try {
    await prisma.inquiry.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Inquiry deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { submitInquiry, getInquiries, getInquiry, updateInquiry, deleteInquiry };

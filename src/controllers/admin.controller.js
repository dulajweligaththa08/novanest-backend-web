const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { AppError } = require('../middleware/error.middleware');
const { sendCustomerWelcomeEmail } = require('../utils/email');

// ─── CUSTOMERS ─────────────────────────────────────────────────────────────────

// GET /api/admin/customers
const getCustomers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, isActive: true, createdAt: true } },
          customerApartments: {
            include: {
              apartment: {
                include: {
                  floor: { include: { building: { include: { project: { select: { name: true } } } } } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/customers/:id
const getCustomer = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, isActive: true, createdAt: true } },
        customerApartments: {
          include: {
            apartment: {
              include: {
                floor: { include: { building: { include: { project: true } } } },
                apartmentType: true,
              },
            },
            updates: { orderBy: { publishedAt: 'desc' }, take: 5 },
            documents: { orderBy: { uploadedAt: 'desc' } },
          },
        },
      },
    });

    if (!customer) return next(new AppError('Customer not found.', 404));
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/customers
const createCustomer = async (req, res, next) => {
  try {
    const { fullName, email, phone, address, nationalId, password, sendWelcomeEmail } = req.body;

    if (!fullName || !email || !password) {
      return next(new AppError('Full name, email, and password are required.', 400));
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return next(new AppError('A user with this email already exists.', 409));

    const passwordHash = await bcrypt.hash(password, 12);

    const customer = await prisma.customer.create({
      data: {
        fullName,
        phone,
        address,
        nationalId,
        user: {
          create: {
            email: email.toLowerCase().trim(),
            passwordHash,
            role: 'CUSTOMER',
            isActive: true,
          },
        },
      },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });

    if (sendWelcomeEmail) {
      try {
        await sendCustomerWelcomeEmail({ fullName, email: email.toLowerCase().trim(), temporaryPassword: password });
      } catch (emailErr) {
        console.error('Welcome email failed:', emailErr.message);
      }
    }

    res.status(201).json({ success: true, message: 'Customer account created.', data: customer });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/customers/:id
const updateCustomer = async (req, res, next) => {
  try {
    const { fullName, phone, address, nationalId, isActive } = req.body;

    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) return next(new AppError('Customer not found.', 404));

    const updated = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...(fullName !== undefined && { fullName }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(nationalId !== undefined && { nationalId }),
        ...(isActive !== undefined && {
          user: { update: { isActive } },
        }),
      },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });

    res.json({ success: true, message: 'Customer updated.', data: updated });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/customers/:id/reset-password
const resetCustomerPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return next(new AppError('New password must be at least 8 characters.', 400));
    }

    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    if (!customer) return next(new AppError('Customer not found.', 404));

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: customer.userId }, data: { passwordHash } });

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── APARTMENT ASSIGNMENT ───────────────────────────────────────────────────────

// POST /api/admin/customers/:id/apartments
const assignApartment = async (req, res, next) => {
  try {
    const { apartmentId, bookingDate, agreedPrice, notes, isPrimary } = req.body;
    if (!apartmentId) return next(new AppError('Apartment ID is required.', 400));

    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) return next(new AppError('Customer not found.', 404));

    const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
    if (!apartment) return next(new AppError('Apartment not found.', 404));

    const assignment = await prisma.customerApartment.create({
      data: {
        customerId: req.params.id,
        apartmentId,
        bookingDate: bookingDate ? new Date(bookingDate) : null,
        agreedPrice: agreedPrice ? parseFloat(agreedPrice) : null,
        notes,
        isPrimary: isPrimary ?? true,
      },
      include: {
        apartment: {
          include: { floor: { include: { building: { include: { project: true } } } } },
        },
      },
    });

    // Update apartment status to RESERVED
    await prisma.apartment.update({ where: { id: apartmentId }, data: { status: 'RESERVED' } });

    res.status(201).json({ success: true, message: 'Apartment assigned to customer.', data: assignment });
  } catch (err) {
    next(err);
  }
};

// ─── CUSTOMER UPDATES ──────────────────────────────────────────────────────────

// GET /api/admin/assignments/:assignmentId/updates
const getUpdates = async (req, res, next) => {
  try {
    const updates = await prisma.apartmentUpdate.findMany({
      where: { customerApartmentId: req.params.assignmentId },
      orderBy: { publishedAt: 'desc' },
    });
    res.json({ success: true, data: updates });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/assignments/:assignmentId/updates
const createUpdate = async (req, res, next) => {
  try {
    const { title, description, updateType } = req.body;
    if (!title || !description) return next(new AppError('Title and description are required.', 400));

    const assignment = await prisma.customerApartment.findUnique({
      where: { id: req.params.assignmentId },
      include: { customer: true },
    });
    if (!assignment) return next(new AppError('Assignment not found.', 404));

    const update = await prisma.apartmentUpdate.create({
      data: {
        customerApartmentId: req.params.assignmentId,
        title,
        description,
        updateType: updateType || 'GENERAL',
      },
    });

    // Create notification for the customer
    await prisma.notification.create({
      data: {
        customerId: assignment.customerId,
        title: `New Update: ${title}`,
        message: description.substring(0, 120),
        updateId: update.id,
      },
    });

    res.status(201).json({ success: true, message: 'Update published.', data: update });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/updates/:id
const editUpdate = async (req, res, next) => {
  try {
    const { title, description, updateType } = req.body;
    const update = await prisma.apartmentUpdate.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(updateType !== undefined && { updateType }),
      },
    });
    res.json({ success: true, data: update });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/updates/:id
const deleteUpdate = async (req, res, next) => {
  try {
    await prisma.apartmentUpdate.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Update deleted.' });
  } catch (err) {
    next(err);
  }
};

// ─── DOCUMENTS ─────────────────────────────────────────────────────────────────

// POST /api/admin/assignments/:assignmentId/documents
const uploadDocument = async (req, res, next) => {
  try {
    const { title, fileUrl, documentType, description } = req.body;
    if (!title || !fileUrl) return next(new AppError('Title and file URL are required.', 400));

    const assignment = await prisma.customerApartment.findUnique({
      where: { id: req.params.assignmentId },
    });
    if (!assignment) return next(new AppError('Assignment not found.', 404));

    const doc = await prisma.document.create({
      data: {
        customerApartmentId: req.params.assignmentId,
        title,
        fileUrl,
        documentType: documentType || 'OTHER',
        description,
      },
    });

    await prisma.notification.create({
      data: {
        customerId: assignment.customerId,
        title: `New Document: ${title}`,
        message: `A new document has been shared with you.`,
        documentId: doc.id,
      },
    });

    res.status(201).json({ success: true, message: 'Document uploaded.', data: doc });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/documents/:id
const deleteDocument = async (req, res, next) => {
  try {
    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Document deleted.' });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN ACCOUNTS ────────────────────────────────────────────────────────────

// GET /api/admin/admins
const getAdmins = async (req, res, next) => {
  try {
    const admins = await prisma.adminProfile.findMany({
      include: { user: { select: { id: true, email: true, isActive: true, createdAt: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: admins });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/admins
const createAdmin = async (req, res, next) => {
  try {
    const { fullName, email, phone, password } = req.body;
    if (!fullName || !email || !password) return next(new AppError('Full name, email, and password are required.', 400));

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return next(new AppError('A user with this email already exists.', 409));

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.adminProfile.create({
      data: {
        fullName,
        phone,
        user: {
          create: {
            email: email.toLowerCase().trim(),
            passwordHash,
            role: 'ADMIN',
            isActive: true,
          },
        },
      },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });

    res.status(201).json({ success: true, message: 'Admin account created.', data: admin });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/admins/:id  (deactivate — never hard delete)
const deactivateAdmin = async (req, res, next) => {
  try {
    const profile = await prisma.adminProfile.findUnique({ where: { id: req.params.id } });
    if (!profile) return next(new AppError('Admin not found.', 404));
    if (profile.userId === req.user.id) return next(new AppError('You cannot deactivate your own account.', 400));

    await prisma.user.update({ where: { id: profile.userId }, data: { isActive: false } });
    res.json({ success: true, message: 'Admin deactivated.' });
  } catch (err) {
    next(err);
  }
};

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────

// GET /api/admin/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const [
      totalProjects,
      availableApartments,
      reservedApartments,
      soldApartments,
      totalCustomers,
      newInquiries,
      recentInquiries,
      recentUpdates,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.apartment.count({ where: { status: 'AVAILABLE' } }),
      prisma.apartment.count({ where: { status: 'RESERVED' } }),
      prisma.apartment.count({ where: { status: 'SOLD' } }),
      prisma.customer.count(),
      prisma.inquiry.count({ where: { status: 'NEW' } }),
      prisma.inquiry.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { project: { select: { name: true } } },
      }),
      prisma.apartmentUpdate.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 5,
        include: {
          customerApartment: {
            include: { customer: { select: { fullName: true } } },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        stats: { totalProjects, availableApartments, reservedApartments, soldApartments, totalCustomers, newInquiries },
        recentInquiries,
        recentUpdates,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCustomers, getCustomer, createCustomer, updateCustomer, resetCustomerPassword,
  assignApartment,
  getUpdates, createUpdate, editUpdate, deleteUpdate,
  uploadDocument, deleteDocument,
  getAdmins, createAdmin, deactivateAdmin,
  getDashboard,
};

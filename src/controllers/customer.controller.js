const prisma = require('../config/database');
const { AppError } = require('../middleware/error.middleware');

// ─── GET /api/customer/apartment ──────────────────────────────────────────────
const getMyApartment = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { userId: req.user.id } });
    if (!customer) return next(new AppError('Customer profile not found.', 404));

    const assignment = await prisma.customerApartment.findFirst({
      where: { customerId: customer.id, isPrimary: true },
      include: {
        apartment: {
          include: {
            apartmentType: true,
            floor: {
              include: {
                building: {
                  include: {
                    project: {
                      include: {
                        gallery: { where: { category: 'EXTERIOR' }, take: 1 },
                        projectFacilities: { include: { facility: true } },
                      },
                    },
                  },
                },
              },
            },
            gallery: { orderBy: { sortOrder: 'asc' } },
            floorPlans: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });

    if (!assignment) return next(new AppError('No apartment assigned to your account yet.', 404));
    res.json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/customer/updates ────────────────────────────────────────────────
const getMyUpdates = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { userId: req.user.id } });
    if (!customer) return next(new AppError('Customer profile not found.', 404));

    const { page = 1, limit = 20, updateType } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const assignments = await prisma.customerApartment.findMany({
      where: { customerId: customer.id },
      select: { id: true },
    });

    const assignmentIds = assignments.map((a) => a.id);

    const where = {
      customerApartmentId: { in: assignmentIds },
      ...(updateType && { updateType }),
    };

    const [updates, total] = await Promise.all([
      prisma.apartmentUpdate.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.apartmentUpdate.count({ where }),
    ]);

    // Mark fetched updates as read
    await prisma.apartmentUpdate.updateMany({
      where: { id: { in: updates.map((u) => u.id) }, isRead: false },
      data: { isRead: true },
    });

    res.json({
      success: true,
      data: updates,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/customer/documents ─────────────────────────────────────────────
const getMyDocuments = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { userId: req.user.id } });
    if (!customer) return next(new AppError('Customer profile not found.', 404));

    const assignments = await prisma.customerApartment.findMany({
      where: { customerId: customer.id },
      select: { id: true },
    });

    const documents = await prisma.document.findMany({
      where: { customerApartmentId: { in: assignments.map((a) => a.id) } },
      orderBy: { uploadedAt: 'desc' },
    });

    // Mark as read
    await prisma.document.updateMany({
      where: { id: { in: documents.map((d) => d.id) }, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true, data: documents });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/customer/notifications ─────────────────────────────────────────
const getMyNotifications = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { userId: req.user.id } });
    if (!customer) return next(new AppError('Customer profile not found.', 404));

    const notifications = await prisma.notification.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { customerId: customer.id, isRead: false },
    });

    res.json({ success: true, data: notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/customer/notifications/read-all ───────────────────────────────
const markNotificationsRead = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { userId: req.user.id } });
    if (!customer) return next(new AppError('Customer profile not found.', 404));

    await prisma.notification.updateMany({
      where: { customerId: customer.id, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};

// ─── GET/PUT /api/customer/profile ───────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id },
      include: { user: { select: { email: true, createdAt: true } } },
    });
    if (!customer) return next(new AppError('Profile not found.', 404));
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    // Customers may only update their phone — everything else is admin-managed
    const { phone } = req.body;

    const customer = await prisma.customer.findUnique({ where: { userId: req.user.id } });
    if (!customer) return next(new AppError('Profile not found.', 404));

    const updated = await prisma.customer.update({
      where: { userId: req.user.id },
      data: { ...(phone !== undefined && { phone }) },
      include: { user: { select: { email: true } } },
    });

    res.json({ success: true, message: 'Profile updated.', data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyApartment,
  getMyUpdates,
  getMyDocuments,
  getMyNotifications,
  markNotificationsRead,
  getProfile,
  updateProfile,
};

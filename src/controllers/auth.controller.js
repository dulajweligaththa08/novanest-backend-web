const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { signToken } = require('../utils/jwt');
const { AppError } = require('../middleware/error.middleware');

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Email and password are required.', 400));
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        adminProfile: true,
        customer: true,
      },
    });

    if (!user) return next(new AppError('Invalid email or password.', 401));
    if (!user.isActive) return next(new AppError('Your account has been deactivated. Please contact support.', 403));

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) return next(new AppError('Invalid email or password.', 401));

    const token = signToken({ userId: user.id, role: user.role });

    const profile = user.role === 'ADMIN' ? user.adminProfile : user.customer;

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: profile?.fullName || null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/auth/me ──────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        adminProfile: req.user.role === 'ADMIN',
        customer: req.user.role === 'CUSTOMER'
          ? {
              include: {
                customerApartments: {
                  where: { isPrimary: true },
                  include: {
                    apartment: {
                      include: {
                        floor: {
                          include: {
                            building: {
                              include: { project: true },
                            },
                          },
                        },
                      },
                    },
                  },
                  take: 1,
                },
              },
            }
          : false,
      },
    });

    if (!user) return next(new AppError('User not found.', 404));

    const profile = user.role === 'ADMIN' ? user.adminProfile : user.customer;

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        fullName: profile?.fullName || null,
        phone: profile?.phone || null,
        ...(user.role === 'CUSTOMER' && {
          customer: user.customer,
        }),
        ...(user.role === 'ADMIN' && {
          adminProfile: user.adminProfile,
        }),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/change-password ───────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new AppError('Current password and new password are required.', 400));
    }

    if (newPassword.length < 8) {
      return next(new AppError('New password must be at least 8 characters.', 400));
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) return next(new AppError('Current password is incorrect.', 401));

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getMe, changePassword };

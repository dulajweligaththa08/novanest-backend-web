const prisma = require('../config/database');
const { AppError } = require('../middleware/error.middleware');

// ─── PUBLIC APARTMENT LISTING ──────────────────────────────────────────────────

// GET /api/apartments  — searchable, filterable
const getApartments = async (req, res, next) => {
  try {
    const {
      projectId, city, apartmentTypeId,
      bedrooms, minPrice, maxPrice,
      status = 'AVAILABLE',
      page = 1, limit = 12,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isPublished: true,
      ...(status && { status }),
      ...(bedrooms && { bedrooms: parseInt(bedrooms) }),
      ...(apartmentTypeId && { apartmentTypeId }),
      ...(minPrice || maxPrice
        ? {
            price: {
              ...(minPrice && { gte: parseFloat(minPrice) }),
              ...(maxPrice && { lte: parseFloat(maxPrice) }),
            },
          }
        : {}),
      ...(projectId || city
        ? {
            floor: {
              building: {
                project: {
                  ...(projectId && { id: projectId }),
                  ...(city && { city: { contains: city, mode: 'insensitive' } }),
                },
              },
            },
          }
        : {}),
    };

    const [apartments, total] = await Promise.all([
      prisma.apartment.findMany({
        where,
        include: {
          apartmentType: true,
          floor: {
            include: {
              building: {
                include: { project: { select: { id: true, name: true, slug: true, location: true, city: true } } },
              },
            },
          },
          gallery: { orderBy: { sortOrder: 'asc' }, take: 1 },
          floorPlans: { take: 1 },
        },
        orderBy: { price: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.apartment.count({ where }),
    ]);

    res.json({
      success: true,
      data: apartments,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/apartments/:id  (public)
const getApartment = async (req, res, next) => {
  try {
    const apartment = await prisma.apartment.findUnique({
      where: { id: req.params.id },
      include: {
        apartmentType: true,
        floor: {
          include: {
            building: {
              include: { project: true },
            },
          },
        },
        gallery: { orderBy: { sortOrder: 'asc' } },
        floorPlans: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!apartment || !apartment.isPublished) return next(new AppError('Apartment not found.', 404));
    res.json({ success: true, data: apartment });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN APARTMENT MANAGEMENT ───────────────────────────────────────────────

// GET /api/admin/apartments  (all, including unpublished)
const getAllApartments = async (req, res, next) => {
  try {
    const { floorId, status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(floorId && { floorId }),
      ...(status && { status }),
    };

    const [apartments, total] = await Promise.all([
      prisma.apartment.findMany({
        where,
        include: {
          apartmentType: true,
          floor: { include: { building: { include: { project: { select: { name: true } } } } } },
        },
        orderBy: { unitNumber: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.apartment.count({ where }),
    ]);

    res.json({
      success: true,
      data: apartments,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/floors/:floorId/apartments
const createApartment = async (req, res, next) => {
  try {
    const { unitNumber, apartmentTypeId, bedrooms, bathrooms, areaSqft, price, status, description, isPublished } = req.body;
    if (!unitNumber || bedrooms === undefined || bathrooms === undefined) {
      return next(new AppError('Unit number, bedrooms, and bathrooms are required.', 400));
    }

    const apartment = await prisma.apartment.create({
      data: {
        floorId: req.params.floorId,
        unitNumber,
        apartmentTypeId: apartmentTypeId || null,
        bedrooms: parseInt(bedrooms),
        bathrooms: parseInt(bathrooms),
        areaSqft: areaSqft ? parseFloat(areaSqft) : null,
        price: price ? parseFloat(price) : null,
        status: status || 'AVAILABLE',
        description,
        isPublished: isPublished ?? false,
      },
      include: { apartmentType: true },
    });

    res.status(201).json({ success: true, data: apartment });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/apartments/:id
const updateApartment = async (req, res, next) => {
  try {
    const { unitNumber, apartmentTypeId, bedrooms, bathrooms, areaSqft, price, status, description, isPublished } = req.body;

    const apartment = await prisma.apartment.findUnique({ where: { id: req.params.id } });
    if (!apartment) return next(new AppError('Apartment not found.', 404));

    const updated = await prisma.apartment.update({
      where: { id: req.params.id },
      data: {
        ...(unitNumber !== undefined && { unitNumber }),
        ...(apartmentTypeId !== undefined && { apartmentTypeId }),
        ...(bedrooms !== undefined && { bedrooms: parseInt(bedrooms) }),
        ...(bathrooms !== undefined && { bathrooms: parseInt(bathrooms) }),
        ...(areaSqft !== undefined && { areaSqft: parseFloat(areaSqft) }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(status !== undefined && { status }),
        ...(description !== undefined && { description }),
        ...(isPublished !== undefined && { isPublished }),
      },
      include: { apartmentType: true },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/apartments/:id
const deleteApartment = async (req, res, next) => {
  try {
    await prisma.apartment.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Apartment deleted.' });
  } catch (err) {
    next(err);
  }
};

// ─── APARTMENT TYPES ───────────────────────────────────────────────────────────

// GET /api/apartment-types  (public)
const getApartmentTypes = async (req, res, next) => {
  try {
    const types = await prisma.apartmentType.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: types });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/apartment-types
const createApartmentType = async (req, res, next) => {
  try {
    const { name, bedrooms, bathrooms, minAreaSqft, maxAreaSqft, description } = req.body;
    if (!name) return next(new AppError('Type name is required.', 400));

    const type = await prisma.apartmentType.create({
      data: {
        name,
        bedrooms: bedrooms !== undefined ? parseInt(bedrooms) : null,
        bathrooms: bathrooms !== undefined ? parseInt(bathrooms) : null,
        minAreaSqft: minAreaSqft ? parseFloat(minAreaSqft) : null,
        maxAreaSqft: maxAreaSqft ? parseFloat(maxAreaSqft) : null,
        description,
      },
    });
    res.status(201).json({ success: true, data: type });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/apartment-types/:id
const updateApartmentType = async (req, res, next) => {
  try {
    const { name, bedrooms, bathrooms, minAreaSqft, maxAreaSqft, description } = req.body;
    const type = await prisma.apartmentType.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(bedrooms !== undefined && { bedrooms: parseInt(bedrooms) }),
        ...(bathrooms !== undefined && { bathrooms: parseInt(bathrooms) }),
        ...(minAreaSqft !== undefined && { minAreaSqft: parseFloat(minAreaSqft) }),
        ...(maxAreaSqft !== undefined && { maxAreaSqft: parseFloat(maxAreaSqft) }),
        ...(description !== undefined && { description }),
      },
    });
    res.json({ success: true, data: type });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/apartment-types/:id
const deleteApartmentType = async (req, res, next) => {
  try {
    await prisma.apartmentType.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Apartment type deleted.' });
  } catch (err) {
    next(err);
  }
};

// ─── FLOOR PLANS ───────────────────────────────────────────────────────────────

// POST /api/admin/apartments/:apartmentId/floor-plans
const addFloorPlan = async (req, res, next) => {
  try {
    const { imageUrl, caption, sortOrder } = req.body;
    if (!imageUrl) return next(new AppError('Image URL is required.', 400));

    const fp = await prisma.floorPlan.create({
      data: {
        apartmentId: req.params.apartmentId,
        imageUrl, caption,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      },
    });
    res.status(201).json({ success: true, data: fp });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/floor-plans/:id
const deleteFloorPlan = async (req, res, next) => {
  try {
    await prisma.floorPlan.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Floor plan deleted.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/apartments/:apartmentId/gallery
const addApartmentImage = async (req, res, next) => {
  try {
    const { imageUrl, caption, category, sortOrder } = req.body;
    if (!imageUrl) return next(new AppError('Image URL is required.', 400));

    const image = await prisma.gallery.create({
      data: {
        apartmentId: req.params.apartmentId,
        imageUrl, caption,
        category: category || 'INTERIOR',
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      },
    });
    res.status(201).json({ success: true, data: image });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getApartments, getApartment,
  getAllApartments, createApartment, updateApartment, deleteApartment,
  getApartmentTypes, createApartmentType, updateApartmentType, deleteApartmentType,
  addFloorPlan, deleteFloorPlan,
  addApartmentImage,
};

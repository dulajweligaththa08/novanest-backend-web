const slugify = require('slugify');
const prisma = require('../config/database');
const { AppError } = require('../middleware/error.middleware');

const makeSlug = (name) => slugify(name, { lower: true, strict: true });

// ─── PROJECTS ──────────────────────────────────────────────────────────────────

// GET /api/projects  (public — published only)
const getProjects = async (req, res, next) => {
  try {
    const { status, city, page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isPublished: true,
      ...(status && { status }),
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          projectFacilities: { include: { facility: true } },
          gallery: { where: { category: 'EXTERIOR' }, orderBy: { sortOrder: 'asc' }, take: 1 },
          _count: { select: { buildings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.project.count({ where }),
    ]);

    res.json({
      success: true,
      data: projects,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/projects/:slug  (public)
const getProjectBySlug = async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { slug: req.params.slug },
      include: {
        projectFacilities: { include: { facility: true } },
        gallery: { orderBy: { sortOrder: 'asc' } },
        buildings: {
          include: {
            floors: {
              include: {
                apartments: {
                  where: { isPublished: true },
                  include: { apartmentType: true, floorPlans: { take: 1 } },
                },
              },
              orderBy: { floorNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!project || !project.isPublished) return next(new AppError('Project not found.', 404));
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/projects  (admin — all)
const getAllProjects = async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        _count: { select: { buildings: true } },
        projectFacilities: { include: { facility: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/projects
const createProject = async (req, res, next) => {
  try {
    const { name, location, city, description, highlights, status, startingPrice, mainImage, brochureUrl, mapUrl, isPublished, completionDate } = req.body;
    if (!name || !location) return next(new AppError('Name and location are required.', 400));

    const slug = makeSlug(name);
    const existing = await prisma.project.findUnique({ where: { slug } });
    if (existing) return next(new AppError('A project with this name already exists.', 409));

    const project = await prisma.project.create({
      data: {
        name, slug, location, city, description, highlights,
        status: status || 'ONGOING',
        startingPrice: startingPrice ? parseFloat(startingPrice) : null,
        mainImage, brochureUrl, mapUrl,
        isPublished: isPublished ?? false,
        completionDate: completionDate ? new Date(completionDate) : null,
      },
    });

    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/projects/:id
const updateProject = async (req, res, next) => {
  try {
    const { name, location, city, description, highlights, status, startingPrice, mainImage, brochureUrl, mapUrl, isPublished, completionDate } = req.body;

    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return next(new AppError('Project not found.', 404));

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name, slug: makeSlug(name) }),
        ...(location !== undefined && { location }),
        ...(city !== undefined && { city }),
        ...(description !== undefined && { description }),
        ...(highlights !== undefined && { highlights }),
        ...(status !== undefined && { status }),
        ...(startingPrice !== undefined && { startingPrice: parseFloat(startingPrice) }),
        ...(mainImage !== undefined && { mainImage }),
        ...(brochureUrl !== undefined && { brochureUrl }),
        ...(mapUrl !== undefined && { mapUrl }),
        ...(isPublished !== undefined && { isPublished }),
        ...(completionDate !== undefined && { completionDate: completionDate ? new Date(completionDate) : null }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/projects/:id
const deleteProject = async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Project deleted.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/projects/:id/facilities
const setProjectFacilities = async (req, res, next) => {
  try {
    const { facilityIds } = req.body; // array of facility IDs
    if (!Array.isArray(facilityIds)) return next(new AppError('facilityIds must be an array.', 400));

    // Replace all facilities for this project
    await prisma.projectFacility.deleteMany({ where: { projectId: req.params.id } });
    await prisma.projectFacility.createMany({
      data: facilityIds.map((facilityId) => ({ projectId: req.params.id, facilityId })),
    });

    res.json({ success: true, message: 'Facilities updated.' });
  } catch (err) {
    next(err);
  }
};

// ─── BUILDINGS ─────────────────────────────────────────────────────────────────

// GET /api/admin/projects/:projectId/buildings
const getBuildings = async (req, res, next) => {
  try {
    const buildings = await prisma.building.findMany({
      where: { projectId: req.params.projectId },
      include: {
        floors: {
          include: { _count: { select: { apartments: true } } },
          orderBy: { floorNumber: 'asc' },
        },
      },
    });
    res.json({ success: true, data: buildings });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/projects/:projectId/buildings
const createBuilding = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return next(new AppError('Building name is required.', 400));

    const building = await prisma.building.create({
      data: { name, description, projectId: req.params.projectId },
    });
    res.status(201).json({ success: true, data: building });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/buildings/:id
const updateBuilding = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const building = await prisma.building.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(description !== undefined && { description }) },
    });
    res.json({ success: true, data: building });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/buildings/:id
const deleteBuilding = async (req, res, next) => {
  try {
    await prisma.building.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Building deleted.' });
  } catch (err) {
    next(err);
  }
};

// ─── FLOORS ────────────────────────────────────────────────────────────────────

// GET /api/admin/buildings/:buildingId/floors
const getFloors = async (req, res, next) => {
  try {
    const floors = await prisma.floor.findMany({
      where: { buildingId: req.params.buildingId },
      include: { _count: { select: { apartments: true } } },
      orderBy: { floorNumber: 'asc' },
    });
    res.json({ success: true, data: floors });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/buildings/:buildingId/floors
const createFloor = async (req, res, next) => {
  try {
    const { floorNumber, description } = req.body;
    if (floorNumber === undefined) return next(new AppError('Floor number is required.', 400));

    const floor = await prisma.floor.create({
      data: { floorNumber: parseInt(floorNumber), description, buildingId: req.params.buildingId },
    });
    res.status(201).json({ success: true, data: floor });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/floors/:id
const updateFloor = async (req, res, next) => {
  try {
    const { floorNumber, description } = req.body;
    const floor = await prisma.floor.update({
      where: { id: req.params.id },
      data: {
        ...(floorNumber !== undefined && { floorNumber: parseInt(floorNumber) }),
        ...(description !== undefined && { description }),
      },
    });
    res.json({ success: true, data: floor });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/floors/:id
const deleteFloor = async (req, res, next) => {
  try {
    await prisma.floor.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Floor deleted.' });
  } catch (err) {
    next(err);
  }
};

// ─── GALLERY ───────────────────────────────────────────────────────────────────

// POST /api/admin/projects/:projectId/gallery
const addProjectImage = async (req, res, next) => {
  try {
    const { imageUrl, caption, category, sortOrder } = req.body;
    if (!imageUrl) return next(new AppError('Image URL is required.', 400));

    const image = await prisma.gallery.create({
      data: {
        projectId: req.params.projectId,
        imageUrl, caption,
        category: category || 'OTHER',
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      },
    });
    res.status(201).json({ success: true, data: image });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/gallery/:id
const deleteGalleryImage = async (req, res, next) => {
  try {
    await prisma.gallery.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Image deleted.' });
  } catch (err) {
    next(err);
  }
};

// ─── FACILITIES ────────────────────────────────────────────────────────────────

// GET /api/facilities  (public)
const getFacilities = async (req, res, next) => {
  try {
    const facilities = await prisma.facility.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: facilities });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/facilities
const createFacility = async (req, res, next) => {
  try {
    const { name, icon, description } = req.body;
    if (!name) return next(new AppError('Facility name is required.', 400));

    const facility = await prisma.facility.create({ data: { name, icon, description } });
    res.status(201).json({ success: true, data: facility });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/facilities/:id
const deleteFacility = async (req, res, next) => {
  try {
    await prisma.facility.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Facility deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProjects, getProjectBySlug, getAllProjects, createProject, updateProject, deleteProject, setProjectFacilities,
  getBuildings, createBuilding, updateBuilding, deleteBuilding,
  getFloors, createFloor, updateFloor, deleteFloor,
  addProjectImage, deleteGalleryImage,
  getFacilities, createFacility, deleteFacility,
};

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding NovaNest database...');

  // ─── Default Admin User ────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@novanest.lk' },
    update: {},
    create: {
      email: 'admin@novanest.lk',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
      adminProfile: {
        create: {
          fullName: 'NovaNest Admin',
          phone: '+94 11 000 0000',
        },
      },
    },
  });

  console.log(`✅ Admin user created: ${adminUser.email}`);

  // ─── Facilities ────────────────────────────────────────────────────────────
  const facilities = [
    { name: 'Infinity Pool',    icon: 'pool'     },
    { name: 'Sky Lounge',       icon: 'lounge'   },
    { name: 'Fitness Center',   icon: 'gym'      },
    { name: 'Play Area',        icon: 'play'     },
    { name: 'Guest Parking',    icon: 'parking'  },
    { name: '24/7 Security',    icon: 'security' },
    { name: 'Rooftop Garden',   icon: 'garden'   },
    { name: 'Co-Working Space', icon: 'work'     },
  ];

  for (const f of facilities) {
    await prisma.facility.upsert({
      where: { name: f.name },
      update: {},
      create: f,
    });
  }

  console.log(`✅ ${facilities.length} facilities seeded`);

  // ─── Apartment Types ───────────────────────────────────────────────────────
  const types = [
    { name: 'Studio',    bedrooms: 0, bathrooms: 1, minAreaSqft: 350,  maxAreaSqft: 500  },
    { name: '1 Bedroom', bedrooms: 1, bathrooms: 1, minAreaSqft: 500,  maxAreaSqft: 750  },
    { name: '2 Bedroom', bedrooms: 2, bathrooms: 2, minAreaSqft: 750,  maxAreaSqft: 1100 },
    { name: '3 Bedroom', bedrooms: 3, bathrooms: 2, minAreaSqft: 1100, maxAreaSqft: 1600 },
    { name: 'Penthouse', bedrooms: 4, bathrooms: 3, minAreaSqft: 2000, maxAreaSqft: 4000 },
  ];

  for (const t of types) {
    await prisma.apartmentType.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }

  console.log(`✅ ${types.length} apartment types seeded`);

  console.log('\n🎉 Seeding complete!');
  console.log('──────────────────────────────');
  console.log('Admin login:');
  console.log('  Email:    admin@novanest.lk');
  console.log('  Password: Admin@123');
  console.log('  ⚠️  Change this password immediately after first login!');
  console.log('──────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

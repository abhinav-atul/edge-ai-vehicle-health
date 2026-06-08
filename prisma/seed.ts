import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default vehicle
  const vehicle = await prisma.vehicle.upsert({
    where: { vin: 'EDGE-AI-SIM-001' },
    update: {},
    create: {
      id: 'default-vehicle',
      name: 'Edge AI Fleet Unit 7',
      vin: 'EDGE-AI-SIM-001',
    },
  });

  console.log(`✅ Vehicle created: ${vehicle.name} (${vehicle.vin})`);

  // Seed initial maintenance records
  const components = [
    { component: 'Brake Pads', rulDays: 142 },
    { component: 'Engine Oil', rulDays: 28 },
    { component: 'Air Filter', rulDays: 67 },
    { component: 'Timing Belt', rulDays: 312 },
    { component: 'Battery', rulDays: 89 },
    { component: 'Spark Plugs', rulDays: 201 },
    { component: 'Transmission Fluid', rulDays: 45 },
    { component: 'Coolant', rulDays: 14 },
  ];

  for (const comp of components) {
    await prisma.maintenanceRecord.upsert({
      where: {
        id: `seed-${comp.component.toLowerCase().replace(/\s/g, '-')}`,
      },
      update: { rulDays: comp.rulDays },
      create: {
        id: `seed-${comp.component.toLowerCase().replace(/\s/g, '-')}`,
        vehicleId: vehicle.id,
        component: comp.component,
        rulDays: comp.rulDays,
      },
    });
  }

  console.log(`✅ Seeded ${components.length} maintenance records`);

  // Seed initial health snapshot
  await prisma.healthSnapshot.create({
    data: {
      vehicleId: vehicle.id,
      score: 90,
    },
  });

  console.log('✅ Initial health snapshot created');
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

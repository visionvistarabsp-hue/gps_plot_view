/**
 * Seed script for Neon PostgreSQL Database.
 * Populates Project and all 69 plots (Residential 1-59, LIG 1-4, EWS 1-6).
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const residentialFacings = (num) => {
  if (num >= 43 && num <= 51) return 'West';
  if (num >= 34 && num <= 42) return 'East';
  if (num >= 29 && num <= 33) return 'West';
  if (num >= 7 && num <= 9) return 'West';
  if (num >= 4 && num <= 6) return 'East';
  if (num >= 1 && num <= 3) return 'West';
  if (num >= 10 && num <= 28) return 'North';
  return 'East';
};

async function main() {
  console.log('Seeding Greenfield Meadows real-estate project into Neon PostgreSQL...');

  const project = await prisma.project.upsert({
    where: { code: 'GREENFIELD-MEADOWS' },
    update: {},
    create: {
      code: 'GREENFIELD-MEADOWS',
      name: 'Greenfield Meadows Estate',
      location: 'North Corridor, Silicon Valley Gateway',
      totalPlots: 69,
      description: 'Ultra-luxury plotted villa development featuring 69 master-planned plots, clubhouse, landscaped gardens, and wide asphalt avenues.'
    }
  });

  console.log(`Created/Verified Project: ${project.name} (${project.id})`);

  // Seed residential plots 1 to 59
  for (let num = 1; num <= 59; num++) {
    let status = 'available';
    if ([2, 8, 24, 31, 42, 45, 57].includes(num)) status = 'sold';
    else if ([5, 12, 28, 38, 54].includes(num)) status = 'reserved';
    else if ([10, 20, 29, 48].includes(num)) status = 'hold';
    else if ([35, 52].includes(num)) status = 'blocked';

    let area = 1500;
    if (num >= 52 && num <= 59) area = 1200 + (num % 5) * 150;
    else if (num >= 29 && num <= 33) area = 1800 + (num % 3) * 100;
    else if (num >= 10 && num <= 28) area = 1350 + (num % 4) * 100;
    else if (num >= 1 && num <= 9) area = 1650;

    const rate = 3650 + (num % 6) * 120;
    const price = Math.round(area * rate / 1000) * 1000;

    await prisma.property.upsert({
      where: { propertyNumber: String(num) },
      update: { status, price, areaSqFt: area },
      create: {
        projectId: project.id,
        propertyNumber: String(num),
        propertyType: 'residential',
        status,
        areaSqFt: area,
        price,
        pricePerSqFt: rate,
        facing: residentialFacings(num),
        geojsonId: `plot-${num < 10 ? '0' + num : num}`,
        modelObjectId: `PLOT_${num}`,
        notes: `RERA Sanctioned Villa Plot ${num}`
      }
    });
  }

  // Seed LIG plots 1 to 4
  const ligFacings = ['South', 'West', 'North', 'East'];
  for (let num = 1; num <= 4; num++) {
    await prisma.property.upsert({
      where: { propertyNumber: `LIG-${num}` },
      update: {},
      create: {
        projectId: project.id,
        propertyNumber: `LIG-${num}`,
        propertyType: 'lig',
        status: num === 3 ? 'reserved' : 'available',
        areaSqFt: 850,
        price: 2850000,
        pricePerSqFt: 3350,
        facing: ligFacings[num - 1],
        geojsonId: `lig-0${num}`,
        modelObjectId: `LIG_${num}`,
        notes: `Government approved LIG unit ${num}`
      }
    });
  }

  // Seed EWS plots 1 to 6
  for (let num = 1; num <= 6; num++) {
    await prisma.property.upsert({
      where: { propertyNumber: `EWS-${num}` },
      update: {},
      create: {
        projectId: project.id,
        propertyNumber: `EWS-${num}`,
        propertyType: 'ews',
        status: num === 2 ? 'sold' : (num === 5 ? 'hold' : 'available'),
        areaSqFt: 450,
        price: 1450000,
        pricePerSqFt: 3220,
        facing: 'South',
        geojsonId: `ews-0${num}`,
        modelObjectId: `EWS_${num}`,
        notes: `Economically Weaker Section (EWS) residential plot ${num}`
      }
    });
  }

  console.log('Seeding completed successfully! Total 69 plots created in Neon DB.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

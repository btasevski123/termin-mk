import { PrismaClient } from "@prisma/client";
import { HALL_SLUG } from "../src/lib/constants";
import { addDaysISO, todayInTimeZone } from "../src/lib/dates";

const prisma = new PrismaClient();

async function main() {
  const hall = await prisma.hall.upsert({
    where: { slug: HALL_SLUG },
    update: {
      name: "Спортска сала Зоран Стојановски",
      location: "Ресен, Северна Македонија",
    },
    create: {
      name: "Спортска сала Зоран Стојановски",
      location: "Ресен, Северна Македонија",
      slug: HALL_SLUG,
      timezone: "Europe/Skopje",
      slotStartHour: 17,
      slotEndHour: 23,
      slotDurationMinutes: 60,
    },
  });

  const today = todayInTimeZone();
  const tomorrow = addDaysISO(today, 1);

  const goran = await prisma.customer.upsert({
    where: { phone: "+38970111222" },
    update: { name: "Горан Николов" },
    create: { name: "Горан Николов", phone: "+38970111222" },
  });

  const ana = await prisma.customer.upsert({
    where: { phone: "+38976333444" },
    update: { name: "Ана Петрова" },
    create: { name: "Ана Петрова", phone: "+38976333444" },
  });

  const samples = [
    { date: today, startTime: "18:00", endTime: "19:00", customerId: goran.id, source: "PHONE" as const },
    { date: today, startTime: "20:00", endTime: "21:00", customerId: ana.id, source: "ONLINE" as const },
    { date: tomorrow, startTime: "19:00", endTime: "20:00", customerId: goran.id, source: "PHONE" as const },
  ];

  for (const sample of samples) {
    const existing = await prisma.booking.findFirst({
      where: {
        hallId: hall.id,
        date: new Date(`${sample.date}T00:00:00.000Z`),
        startTime: sample.startTime,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    if (existing) continue;

    await prisma.booking.create({
      data: {
        hallId: hall.id,
        customerId: sample.customerId,
        date: new Date(`${sample.date}T00:00:00.000Z`),
        startTime: sample.startTime,
        endTime: sample.endTime,
        status: "CONFIRMED",
        source: sample.source,
        notes: sample.source === "PHONE" ? "Резервација по телефон" : undefined,
        activeSlotKey: `${hall.id}:${sample.date}:${sample.startTime}`,
      },
    });
  }

  console.log(`Seeded hall ${hall.name} (${hall.id})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

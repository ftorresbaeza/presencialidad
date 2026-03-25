import { PrismaClient, PersonType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const internalPeople = [
  "Fabian Torres",
  "Felipe Lagno",
  "Silvia Donoso",
  "Gerardo Alvear",
  "Ma. Carolina Salhe",
  "Karin Schulz",
  "Felipe Merino",
  "José Miguel Celis",
  "Romela Marín",
  "Jorge Torres",
  "Bernardita Torres",
  "Gonzalo Ramírez",
  "Gonzalo Monsalve",
  "Mauricio Meléndez",
  "José Ramón Abatte",
  "Cristian Miranda",
  "Juan Carlos Villagrán",
  "Cristian Herrera",
  "Juan Hasche",
  "Manuel Valdes",
  "Magdalena Ribbeck",
  "Stephanie Salazar",
  "Javiera Corrales",
  "Alberto Laudadio",
  "Paulo Paillacar",
  "Aldo Bonomelli",
  "Camilo Manriquez",
  "Wladi Castro",
  "Jonathan Aqueveque",
  "Leonardo Andrades",
  "Mario Poblete",
  "Paul Vallejos",
  "Rodrigo Godoy",
  "Dario Ramirez",
  "Cristian Oyarzun",
  "Cesar Moyano",
  "Omeremeth Concha",
  "Claudia Merino",
  "Roxana Pinto",
];

const externalPeople = [
  "Yuri Henriquez",
  "Walter Garcia",
  "Andrea Flores",
  "Anais Carmona",
  "Leonel Mundaca",
  "Jonathan Barriga",
  "Julio Valdés",
  "Paulina Quinteros",
  "Luis Benito González",
  "Caterina Basso",
  "Ma. Inés Pérez",
];

async function main() {
  // Create config
  await prisma.config.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main", maxSeats: 30 },
  });

  // Create internal people
  for (const name of internalPeople) {
    await prisma.person.upsert({
      where: { id: name.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: {
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
        type: PersonType.INTERNAL,
        active: true,
      },
    });
  }

  // Create external people
  for (const name of externalPeople) {
    await prisma.person.upsert({
      where: { id: name.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: {
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
        type: PersonType.EXTERNAL,
        active: true,
      },
    });
  }

  console.log("Seed completed: ", internalPeople.length + externalPeople.length, "people");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

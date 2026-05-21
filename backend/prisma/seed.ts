import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL no está definida en el archivo .env");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Iniciando carga de datos iniciales...");

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
    },
  });

  const cashierRole = await prisma.role.upsert({
    where: { name: "CASHIER" },
    update: {},
    create: {
      name: "CASHIER",
    },
  });

  const adminPassword = await bcrypt.hash("admin123", 10);
  const cashierPassword = await bcrypt.hash("cajero123", 10);

  await prisma.user.upsert({
    where: { email: "admin@cafeteria.com" },
    update: {},
    create: {
      fullName: "Administrador Principal",
      email: "admin@cafeteria.com",
      passwordHash: adminPassword,
      roleId: adminRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "cajero@cafeteria.com" },
    update: {},
    create: {
      fullName: "Cajero Demo",
      email: "cajero@cafeteria.com",
      passwordHash: cashierPassword,
      roleId: cashierRole.id,
    },
  });

  const cafeCategory = await prisma.category.upsert({
    where: { slug: "cafes" },
    update: {},
    create: {
      name: "Cafés",
      slug: "cafes",
      description: "Bebidas calientes a base de café",
      displayOrder: 1,
    },
  });

  const bebidasFriasCategory = await prisma.category.upsert({
    where: { slug: "bebidas-frias" },
    update: {},
    create: {
      name: "Bebidas frías",
      slug: "bebidas-frias",
      description: "Jugos, frappés y bebidas embotelladas",
      displayOrder: 2,
    },
  });

  const postresCategory = await prisma.category.upsert({
    where: { slug: "postres" },
    update: {},
    create: {
      name: "Postres",
      slug: "postres",
      description: "Tortas, brownies y dulces",
      displayOrder: 3,
    },
  });

  const comidaCategory = await prisma.category.upsert({
    where: { slug: "comidas" },
    update: {},
    create: {
      name: "Comidas",
      slug: "comidas",
      description: "Sándwiches, empanadas y snacks",
      displayOrder: 4,
    },
  });

  const products = [
    {
      name: "Café americano",
      slug: "cafe-americano",
      sku: "CAF-001",
      description: "Café americano clásico",
      price: "10.00",
      cost: "4.00",
      stock: 0,
      minStock: 0,
      trackStock: false,
      categoryId: cafeCategory.id,
    },
    {
      name: "Capuchino",
      slug: "capuchino",
      sku: "CAF-002",
      description: "Café con leche vaporizada y espuma",
      price: "15.00",
      cost: "6.00",
      stock: 0,
      minStock: 0,
      trackStock: false,
      categoryId: cafeCategory.id,
    },
    {
      name: "Mocaccino",
      slug: "mocaccino",
      sku: "CAF-003",
      description: "Café con chocolate y leche",
      price: "17.00",
      cost: "7.00",
      stock: 0,
      minStock: 0,
      trackStock: false,
      categoryId: cafeCategory.id,
    },
    {
      name: "Frappé de café",
      slug: "frappe-de-cafe",
      sku: "FRI-001",
      description: "Bebida fría de café con hielo",
      price: "20.00",
      cost: "9.00",
      stock: 0,
      minStock: 0,
      trackStock: false,
      categoryId: bebidasFriasCategory.id,
    },
    {
      name: "Jugo natural",
      slug: "jugo-natural",
      sku: "FRI-002",
      description: "Jugo natural de temporada",
      price: "14.00",
      cost: "6.00",
      stock: 0,
      minStock: 0,
      trackStock: false,
      categoryId: bebidasFriasCategory.id,
    },
    {
      name: "Agua mineral",
      slug: "agua-mineral",
      sku: "FRI-003",
      description: "Botella de agua mineral",
      price: "7.00",
      cost: "3.00",
      stock: 40,
      minStock: 10,
      trackStock: true,
      categoryId: bebidasFriasCategory.id,
    },
    {
      name: "Brownie",
      slug: "brownie",
      sku: "POS-001",
      description: "Brownie de chocolate",
      price: "12.00",
      cost: "5.00",
      stock: 20,
      minStock: 5,
      trackStock: true,
      categoryId: postresCategory.id,
    },
    {
      name: "Cheesecake",
      slug: "cheesecake",
      sku: "POS-002",
      description: "Porción de cheesecake",
      price: "18.00",
      cost: "8.00",
      stock: 12,
      minStock: 4,
      trackStock: true,
      categoryId: postresCategory.id,
    },
    {
      name: "Sándwich de pollo",
      slug: "sandwich-de-pollo",
      sku: "COM-001",
      description: "Sándwich de pollo con verduras",
      price: "22.00",
      cost: "11.00",
      stock: 15,
      minStock: 5,
      trackStock: true,
      categoryId: comidaCategory.id,
    },
    {
      name: "Empanada de queso",
      slug: "empanada-de-queso",
      sku: "COM-002",
      description: "Empanada tradicional de queso",
      price: "8.00",
      cost: "3.50",
      stock: 30,
      minStock: 8,
      trackStock: true,
      categoryId: comidaCategory.id,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });
  }

  console.log("Datos iniciales cargados correctamente.");
  console.log("");
  console.log("Usuarios de prueba:");
  console.log("ADMIN  -> admin@cafeteria.com / admin123");
  console.log("CAJERO -> cajero@cafeteria.com / cajero123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error("Error cargando datos iniciales:");
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
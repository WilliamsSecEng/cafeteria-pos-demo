import { Router } from "express";
import { prisma } from "../config/prisma.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const rolesCount = await prisma.role.count();
    const productsCount = await prisma.product.count();

    res.json({
      ok: true,
      service: "cafeteria-api",
      database: "connected",
      roles: rolesCount,
      products: productsCount,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
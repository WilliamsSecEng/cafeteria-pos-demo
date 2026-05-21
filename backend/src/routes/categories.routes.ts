import { Router } from "express";
import { prisma } from "../config/prisma.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const onlyActive = req.query.active !== "false";

    const categories = await prisma.category.findMany({
      ...(onlyActive
        ? {
            where: {
              isActive: true,
            },
          }
        : {}),
      orderBy: [
        {
          displayOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        displayOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return res.json({
      ok: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
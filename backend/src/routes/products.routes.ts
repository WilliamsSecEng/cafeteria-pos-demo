import { Router } from "express";
import { prisma } from "../config/prisma.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const search = String(req.query.search ?? "").trim();
    const categoryId = String(req.query.categoryId ?? "").trim();
    const onlyActive = req.query.active !== "false";

    const products = await prisma.product.findMany({
      where: {
        ...(onlyActive ? { isActive: true } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  description: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  sku: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [
        {
          category: {
            displayOrder: "asc",
          },
        },
        {
          name: "asc",
        },
      ],
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return res.json({
      ok: true,
      products,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        ok: false,
        message: "Producto no encontrado",
      });
    }

    return res.json({
      ok: true,
      product,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
import { Router, type Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.middleware.js";

const router = Router();

const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede superar 100 caracteres"),
  description: z.string().trim().max(500).optional().nullable(),
  displayOrder: z.coerce
    .number()
    .int("El orden debe ser un número entero")
    .nonnegative("El orden no puede ser negativo")
    .default(0),
  isActive: z.boolean().default(true),
});

const updateCategorySchema = createCategorySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Debe enviar al menos un campo para actualizar",
  },
);

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function createBaseSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function generateUniqueSlug(name: string, currentCategoryId?: string) {
  const baseSlug = createBaseSlug(name);
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existingCategory = await prisma.category.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (!existingCategory || existingCategory.id === currentCategoryId) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function ensureAdmin(req: AuthRequest, res: Response) {
  if (!req.user) {
    res.status(401).json({
      ok: false,
      message: "Usuario no autenticado",
    });
    return false;
  }

  if (req.user.role !== "ADMIN") {
    res.status(403).json({
      ok: false,
      message: "No tienes permisos para realizar esta acción",
    });
    return false;
  }

  return true;
}

function isPrismaKnownError(error: unknown): error is { code: string; meta?: unknown } {
  return typeof error === "object" && error !== null && "code" in error;
}

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

router.get("/:id", async (req, res, next) => {
  try {
    const categoryIdParam = req.params.id;

    if (typeof categoryIdParam !== "string") {
      return res.status(400).json({
        ok: false,
        message: "ID de categoría inválido",
      });
    }

    const category = await prisma.category.findUnique({
      where: {
        id: categoryIdParam,
      },
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

    if (!category) {
      return res.status(404).json({
        ok: false,
        message: "Categoría no encontrada",
      });
    }

    return res.json({
      ok: true,
      category,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const validation = createCategorySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos de categoría inválidos",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const data = validation.data;
    const slug = await generateUniqueSlug(data.name);

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: normalizeText(data.description),
        displayOrder: data.displayOrder,
        isActive: data.isActive,
      },
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

    return res.status(201).json({
      ok: true,
      message: "Categoría creada correctamente",
      category,
    });
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === "P2002") {
      return res.status(409).json({
        ok: false,
        message: "Ya existe una categoría con ese nombre o slug",
      });
    }

    next(error);
  }
});

router.put("/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const categoryIdParam = req.params.id;

    if (typeof categoryIdParam !== "string") {
      return res.status(400).json({
        ok: false,
        message: "ID de categoría inválido",
      });
    }

    const validation = updateCategorySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos de categoría inválidos",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const existingCategory = await prisma.category.findUnique({
      where: {
        id: categoryIdParam,
      },
    });

    if (!existingCategory) {
      return res.status(404).json({
        ok: false,
        message: "Categoría no encontrada",
      });
    }

    const data = validation.data;

    const slug = data.name
      ? await generateUniqueSlug(data.name, existingCategory.id)
      : existingCategory.slug;

    const category = await prisma.category.update({
      where: {
        id: existingCategory.id,
      },
      data: {
        ...(data.name !== undefined ? { name: data.name, slug } : {}),
        ...(data.description !== undefined
          ? { description: normalizeText(data.description) }
          : {}),
        ...(data.displayOrder !== undefined
          ? { displayOrder: data.displayOrder }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
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
      message: "Categoría actualizada correctamente",
      category,
    });
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === "P2002") {
      return res.status(409).json({
        ok: false,
        message: "Ya existe otra categoría con ese nombre o slug",
      });
    }

    next(error);
  }
});

router.patch("/:id/status", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const categoryIdParam = req.params.id;

    if (typeof categoryIdParam !== "string") {
      return res.status(400).json({
        ok: false,
        message: "ID de categoría inválido",
      });
    }

    const validation = z
      .object({
        isActive: z.boolean(),
      })
      .safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        message: "Estado inválido",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const category = await prisma.category.update({
      where: {
        id: categoryIdParam,
      },
      data: {
        isActive: validation.data.isActive,
      },
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
      message: validation.data.isActive
        ? "Categoría activada correctamente"
        : "Categoría inactivada correctamente",
      category,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const categoryIdParam = req.params.id;

    if (typeof categoryIdParam !== "string") {
      return res.status(400).json({
        ok: false,
        message: "ID de categoría inválido",
      });
    }

    const productsCount = await prisma.product.count({
      where: {
        categoryId: categoryIdParam,
      },
    });

    if (productsCount > 0) {
      return res.status(400).json({
        ok: false,
        message:
          "No se puede eliminar esta categoría porque tiene productos asociados. Puedes inactivarla.",
      });
    }

    await prisma.category.delete({
      where: {
        id: categoryIdParam,
      },
    });

    return res.json({
      ok: true,
      message: "Categoría eliminada correctamente",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
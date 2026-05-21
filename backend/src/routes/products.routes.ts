import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.middleware.js";

const router = Router();

const createProductSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(120),
  description: z.string().trim().max(500).optional().nullable(),
  sku: z.string().trim().max(80).optional().nullable(),
  price: z.coerce.number().positive("El precio debe ser mayor a 0"),
  cost: z.coerce.number().nonnegative("El costo no puede ser negativo").optional().nullable(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  stock: z.coerce.number().int().nonnegative("El stock no puede ser negativo").default(0),
  minStock: z.coerce.number().int().nonnegative("El stock mínimo no puede ser negativo").default(0),
  trackStock: z.boolean().default(false),
  isActive: z.boolean().default(true),
  categoryId: z.string().uuid("Categoría inválida"),
});

const updateProductSchema = createProductSchema.partial().refine(
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

async function generateUniqueSlug(name: string, currentProductId?: string) {
  const baseSlug = createBaseSlug(name);
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existingProduct = await prisma.product.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (!existingProduct || existingProduct.id === currentProductId) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function ensureAdmin(req: AuthRequest, res: Parameters<Parameters<typeof router.post>[1]>[1]) {
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
    const productIdParam = req.params.id;

    if (typeof productIdParam !== "string") {
      return res.status(400).json({
        ok: false,
        message: "ID de producto inválido",
      });
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productIdParam,
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

router.post("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const validation = createProductSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos de producto inválidos",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const data = validation.data;

    const category = await prisma.category.findUnique({
      where: {
        id: data.categoryId,
      },
    });

    if (!category) {
      return res.status(400).json({
        ok: false,
        message: "La categoría seleccionada no existe",
      });
    }

    const slug = await generateUniqueSlug(data.name);

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        description: normalizeText(data.description),
        sku: normalizeText(data.sku),
        price: data.price.toFixed(2),
        cost: data.cost !== undefined && data.cost !== null ? data.cost.toFixed(2) : null,
        imageUrl: normalizeText(data.imageUrl),
        stock: data.stock,
        minStock: data.minStock,
        trackStock: data.trackStock,
        isActive: data.isActive,
        categoryId: data.categoryId,
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

    return res.status(201).json({
      ok: true,
      message: "Producto creado correctamente",
      product,
    });
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === "P2002") {
      return res.status(409).json({
        ok: false,
        message: "Ya existe un producto con ese SKU o slug",
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

    const productIdParam = req.params.id;

    if (typeof productIdParam !== "string") {
      return res.status(400).json({
        ok: false,
        message: "ID de producto inválido",
      });
    }

    const validation = updateProductSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos de producto inválidos",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const existingProduct = await prisma.product.findUnique({
      where: {
        id: productIdParam,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        ok: false,
        message: "Producto no encontrado",
      });
    }

    const data = validation.data;

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: {
          id: data.categoryId,
        },
      });

      if (!category) {
        return res.status(400).json({
          ok: false,
          message: "La categoría seleccionada no existe",
        });
      }
    }

    const slug = data.name
      ? await generateUniqueSlug(data.name, existingProduct.id)
      : existingProduct.slug;

    const product = await prisma.product.update({
      where: {
        id: existingProduct.id,
      },
      data: {
        ...(data.name !== undefined ? { name: data.name, slug } : {}),
        ...(data.description !== undefined
          ? { description: normalizeText(data.description) }
          : {}),
        ...(data.sku !== undefined ? { sku: normalizeText(data.sku) } : {}),
        ...(data.price !== undefined ? { price: data.price.toFixed(2) } : {}),
        ...(data.cost !== undefined
          ? {
              cost:
                data.cost !== null
                  ? data.cost.toFixed(2)
                  : null,
            }
          : {}),
        ...(data.imageUrl !== undefined
          ? { imageUrl: normalizeText(data.imageUrl) }
          : {}),
        ...(data.stock !== undefined ? { stock: data.stock } : {}),
        ...(data.minStock !== undefined ? { minStock: data.minStock } : {}),
        ...(data.trackStock !== undefined ? { trackStock: data.trackStock } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
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

    return res.json({
      ok: true,
      message: "Producto actualizado correctamente",
      product,
    });
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === "P2002") {
      return res.status(409).json({
        ok: false,
        message: "Ya existe otro producto con ese SKU o slug",
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

    const productIdParam = req.params.id;

    if (typeof productIdParam !== "string") {
      return res.status(400).json({
        ok: false,
        message: "ID de producto inválido",
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

    const product = await prisma.product.update({
      where: {
        id: productIdParam,
      },
      data: {
        isActive: validation.data.isActive,
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

    return res.json({
      ok: true,
      message: validation.data.isActive
        ? "Producto activado correctamente"
        : "Producto inactivado correctamente",
      product,
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

    const productIdParam = req.params.id;

    if (typeof productIdParam !== "string") {
      return res.status(400).json({
        ok: false,
        message: "ID de producto inválido",
      });
    }

    const saleItemsCount = await prisma.saleItem.count({
      where: {
        productId: productIdParam,
      },
    });

    if (saleItemsCount > 0) {
      return res.status(400).json({
        ok: false,
        message:
          "No se puede eliminar este producto porque ya tiene ventas registradas. Puedes inactivarlo.",
      });
    }

    await prisma.product.delete({
      where: {
        id: productIdParam,
      },
    });

    return res.json({
      ok: true,
      message: "Producto eliminado correctamente",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
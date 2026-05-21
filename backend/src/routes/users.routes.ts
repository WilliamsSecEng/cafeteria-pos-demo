import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.middleware.js";

const router = Router();

const createUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(120, "El nombre no puede superar 120 caracteres"),
  email: z.string().trim().email("Correo electrónico inválido").max(120),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  roleId: z.string().uuid("Rol inválido"),
  isActive: z.boolean().default(true),
});

const updateUserSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, "El nombre debe tener al menos 3 caracteres")
      .max(120, "El nombre no puede superar 120 caracteres")
      .optional(),
    email: z.string().trim().email("Correo electrónico inválido").max(120).optional(),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .optional(),
    roleId: z.string().uuid("Rol inválido").optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

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

router.get("/roles", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const roles = await prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return res.json({
      ok: true,
      roles,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const search = String(req.query.search ?? "").trim();
    const onlyActive = req.query.active !== "false";

    const users = await prisma.user.findMany({
      where: {
        ...(onlyActive ? { isActive: true } : {}),
        ...(search
          ? {
              OR: [
                {
                  fullName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  role: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sales: true,
            cashSessions: true,
          },
        },
      },
    });

    return res.json({
      ok: true,
      users,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const userIdParam = req.params.id;

    if (typeof userIdParam !== "string") {
      return res.status(400).json({
        ok: false,
        message: "ID de usuario inválido",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userIdParam,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sales: true,
            cashSessions: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado",
      });
    }

    return res.json({
      ok: true,
      user,
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

    const validation = createUserSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos de usuario inválidos",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const data = validation.data;

    const role = await prisma.role.findUnique({
      where: {
        id: data.roleId,
      },
    });

    if (!role) {
      return res.status(400).json({
        ok: false,
        message: "El rol seleccionado no existe",
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        passwordHash,
        roleId: data.roleId,
        isActive: data.isActive,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      ok: true,
      message: "Usuario creado correctamente",
      user,
    });
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === "P2002") {
      return res.status(409).json({
        ok: false,
        message: "Ya existe un usuario con ese correo electrónico",
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

    const userIdParam = req.params.id;

    if (typeof userIdParam !== "string") {
      return res.status(400).json({
        ok: false,
        message: "ID de usuario inválido",
      });
    }

    const validation = updateUserSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos de usuario inválidos",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id: userIdParam,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado",
      });
    }

    const data = validation.data;

    if (data.roleId) {
      const role = await prisma.role.findUnique({
        where: {
          id: data.roleId,
        },
      });

      if (!role) {
        return res.status(400).json({
          ok: false,
          message: "El rol seleccionado no existe",
        });
      }
    }

    const passwordHash =
      data.password !== undefined ? await bcrypt.hash(data.password, 10) : undefined;

    const user = await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.email !== undefined ? { email: data.email.toLowerCase() } : {}),
        ...(passwordHash !== undefined ? { passwordHash } : {}),
        ...(data.roleId !== undefined ? { roleId: data.roleId } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sales: true,
            cashSessions: true,
          },
        },
      },
    });

    return res.json({
      ok: true,
      message: "Usuario actualizado correctamente",
      user,
    });
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === "P2002") {
      return res.status(409).json({
        ok: false,
        message: "Ya existe otro usuario con ese correo electrónico",
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

    const userIdParam = req.params.id;

    if (typeof userIdParam !== "string") {
      return res.status(400).json({
        ok: false,
        message: "ID de usuario inválido",
      });
    }

    if (req.user?.userId === userIdParam) {
      return res.status(400).json({
        ok: false,
        message: "No puedes inactivar tu propio usuario desde esta pantalla",
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

    const user = await prisma.user.update({
      where: {
        id: userIdParam,
      },
      data: {
        isActive: validation.data.isActive,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sales: true,
            cashSessions: true,
          },
        },
      },
    });

    return res.json({
      ok: true,
      message: validation.data.isActive
        ? "Usuario activado correctamente"
        : "Usuario inactivado correctamente",
      user,
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

    const userIdParam = req.params.id;

    if (typeof userIdParam !== "string") {
      return res.status(400).json({
        ok: false,
        message: "ID de usuario inválido",
      });
    }

    if (req.user?.userId === userIdParam) {
      return res.status(400).json({
        ok: false,
        message: "No puedes eliminar tu propio usuario",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userIdParam,
      },
      include: {
        _count: {
          select: {
            sales: true,
            cashSessions: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado",
      });
    }

    if (user._count.sales > 0 || user._count.cashSessions > 0) {
      return res.status(400).json({
        ok: false,
        message:
          "No se puede eliminar este usuario porque tiene ventas o cajas asociadas. Puedes inactivarlo.",
      });
    }

    await prisma.user.delete({
      where: {
        id: userIdParam,
      },
    });

    return res.json({
      ok: true,
      message: "Usuario eliminado correctamente",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
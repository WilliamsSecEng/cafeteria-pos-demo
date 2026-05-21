import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.middleware.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

router.post("/login", async (req, res, next) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos de inicio de sesión inválidos",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales incorrectas",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        ok: false,
        message: "El usuario está inactivo",
      });
    }

    const passwordIsValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordIsValid) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales incorrectas",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role.name,
      },
      env.JWT_SECRET,
      {
        expiresIn: "8h",
      },
    );

    return res.json({
      ok: true,
      message: "Inicio de sesión correcto",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId,
      },
      include: {
        role: true,
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
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
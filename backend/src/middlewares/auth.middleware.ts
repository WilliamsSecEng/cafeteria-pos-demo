import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";

export type AuthUser = {
  userId: string;
  email: string;
  role: string;
};

export type AuthRequest = Request & {
  user?: AuthUser;
};

type TokenPayload = JwtPayload & AuthUser;

function isTokenPayload(payload: string | JwtPayload): payload is TokenPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof payload.userId === "string" &&
    typeof payload.email === "string" &&
    typeof payload.role === "string"
  );
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      ok: false,
      message: "Token de autenticación no enviado",
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      ok: false,
      message: "Token de autenticación vacío",
    });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (!isTokenPayload(decoded)) {
      return res.status(401).json({
        ok: false,
        message: "Token inválido",
      });
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch {
    return res.status(401).json({
      ok: false,
      message: "Token inválido o expirado",
    });
  }
}
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.middleware.js";
import {
  CashMovementType,
  CashSessionStatus,
  PaymentMethod,
  SaleStatus,
} from "../../generated/prisma/enums.js";

const router = Router();

const openCashSchema = z.object({
  openingAmount: z.number().nonnegative("El monto inicial no puede ser negativo"),
});

const createMovementSchema = z.object({
  type: z.nativeEnum(CashMovementType),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  reason: z.string().min(3, "El motivo es obligatorio").max(180, "El motivo es demasiado largo"),
});

const closeCashSchema = z.object({
  closingAmount: z.number().nonnegative("El monto de cierre no puede ser negativo"),
});

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

async function calculateExpectedAmount(cashSessionId: string) {
  const cashSession = await prisma.cashSession.findUnique({
    where: {
      id: cashSessionId,
    },
    include: {
      sales: {
        where: {
          status: SaleStatus.COMPLETED,
          paymentMethod: {
            in: [PaymentMethod.CASH, PaymentMethod.MIXED],
          },
        },
      },
      movements: true,
    },
  });

  if (!cashSession) {
    throw new Error("Caja no encontrada");
  }

  const openingAmount = Number(cashSession.openingAmount);

  const cashSalesAmount = cashSession.sales.reduce((sum, sale) => {
    return sum + Number(sale.total);
  }, 0);

  const incomeAmount = cashSession.movements
    .filter((movement) => movement.type === CashMovementType.INCOME)
    .reduce((sum, movement) => {
      return sum + Number(movement.amount);
    }, 0);

  const expenseAmount = cashSession.movements
    .filter((movement) => movement.type === CashMovementType.EXPENSE)
    .reduce((sum, movement) => {
      return sum + Number(movement.amount);
    }, 0);

  return roundMoney(openingAmount + cashSalesAmount + incomeAmount - expenseAmount);
}

router.get("/current", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado",
      });
    }

    const cashSession = await prisma.cashSession.findFirst({
      where: {
        userId: req.user.userId,
        status: CashSessionStatus.OPEN,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        movements: {
          orderBy: {
            createdAt: "desc",
          },
        },
        sales: {
          where: {
            status: SaleStatus.COMPLETED,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
      },
      orderBy: {
        openedAt: "desc",
      },
    });

    if (!cashSession) {
      return res.json({
        ok: true,
        cashSession: null,
        message: "No hay caja abierta",
      });
    }

    const expectedAmount = await calculateExpectedAmount(cashSession.id);

    return res.json({
      ok: true,
      cashSession,
      expectedAmount,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/open", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado",
      });
    }

    const validation = openCashSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos de apertura inválidos",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const existingOpenSession = await prisma.cashSession.findFirst({
      where: {
        userId: req.user.userId,
        status: CashSessionStatus.OPEN,
      },
    });

    if (existingOpenSession) {
      return res.status(400).json({
        ok: false,
        message: "Ya existe una caja abierta para este usuario",
      });
    }

    const cashSession = await prisma.cashSession.create({
      data: {
        openingAmount: validation.data.openingAmount.toFixed(2),
        userId: req.user.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      ok: true,
      message: "Caja abierta correctamente",
      cashSession,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/movements", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado",
      });
    }

    const validation = createMovementSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos de movimiento inválidos",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const openSession = await prisma.cashSession.findFirst({
      where: {
        userId: req.user.userId,
        status: CashSessionStatus.OPEN,
      },
    });

    if (!openSession) {
      return res.status(400).json({
        ok: false,
        message: "No hay una caja abierta para registrar movimientos",
      });
    }

    const movement = await prisma.cashMovement.create({
      data: {
        type: validation.data.type,
        amount: validation.data.amount.toFixed(2),
        reason: validation.data.reason,
        cashSessionId: openSession.id,
      },
    });

    const expectedAmount = await calculateExpectedAmount(openSession.id);

    return res.status(201).json({
      ok: true,
      message: "Movimiento registrado correctamente",
      movement,
      expectedAmount,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/close", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado",
      });
    }

    const validation = closeCashSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos de cierre inválidos",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const openSession = await prisma.cashSession.findFirst({
      where: {
        userId: req.user.userId,
        status: CashSessionStatus.OPEN,
      },
    });

    if (!openSession) {
      return res.status(400).json({
        ok: false,
        message: "No hay una caja abierta para cerrar",
      });
    }

    const expectedAmount = await calculateExpectedAmount(openSession.id);
    const closingAmount = roundMoney(validation.data.closingAmount);
    const difference = roundMoney(closingAmount - expectedAmount);

    const closedSession = await prisma.cashSession.update({
      where: {
        id: openSession.id,
      },
      data: {
        closingAmount: closingAmount.toFixed(2),
        expectedAmount: expectedAmount.toFixed(2),
        difference: difference.toFixed(2),
        status: CashSessionStatus.CLOSED,
        closedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        movements: true,
        sales: true,
      },
    });

    return res.json({
      ok: true,
      message: "Caja cerrada correctamente",
      cashSession: closedSession,
      summary: {
        expectedAmount,
        closingAmount,
        difference,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/history", authMiddleware, async (_req, res, next) => {
  try {
    const sessions = await prisma.cashSession.findMany({
      orderBy: {
        openedAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            sales: true,
            movements: true,
          },
        },
      },
      take: 50,
    });

    return res.json({
      ok: true,
      sessions,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
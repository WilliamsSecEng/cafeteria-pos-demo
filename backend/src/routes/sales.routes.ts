import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.middleware.js";
import {
  CashSessionStatus,
  PaymentMethod,
  SaleStatus,
} from "../../generated/prisma/enums.js";

const router = Router();

const saleItemSchema = z.object({
  productId: z.string().uuid("ID de producto inválido"),
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
});

const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "La venta debe tener al menos un producto"),
  paymentMethod: z.nativeEnum(PaymentMethod),
  amountPaid: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});
const cancelSaleSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

async function generateSaleNumber() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const dateCode = `${year}${month}${day}`;
  const prefix = `V-${dateCode}`;

  const salesToday = await prisma.sale.count({
    where: {
      saleNumber: {
        startsWith: prefix,
      },
    },
  });

  const sequence = String(salesToday + 1).padStart(4, "0");

  return `${prefix}-${sequence}`;
}

router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const status = String(req.query.status ?? "").trim();

    const sales = await prisma.sale.findMany({
      where: status ? { status: status as SaleStatus } : {},
      orderBy: {
        createdAt: "desc",
      },
      include: {
        cashier: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
      take: 100,
    });

    return res.json({
      ok: true,
      sales,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/today-summary", authMiddleware, async (_req, res, next) => {
  try {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: {
        status: SaleStatus.COMPLETED,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        items: true,
      },
    });

    const totalSales = sales.length;

    const totalAmount = sales.reduce((sum, sale) => {
      return sum + Number(sale.total);
    }, 0);

    const totalItems = sales.reduce((sum, sale) => {
      return (
        sum +
        sale.items.reduce((itemSum, item) => {
          return itemSum + item.quantity;
        }, 0)
      );
    }, 0);

    return res.json({
      ok: true,
      summary: {
        totalSales,
        totalAmount: roundMoney(totalAmount),
        totalItems,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const saleIdParam = req.params.id;

if (typeof saleIdParam !== "string") {
  return res.status(400).json({
    ok: false,
    message: "ID de venta inválido",
  });
}

const saleId = saleIdParam;

const sale = await prisma.sale.findUnique({
  where: {
    id: saleId,
  },
      include: {
        cashier: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({
        ok: false,
        message: "Venta no encontrada",
      });
    }

    return res.json({
      ok: true,
      sale,
    });
  } catch (error) {
    next(error);
  }
});
router.patch("/:id/cancel", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado",
      });
    }

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        ok: false,
        message: "Solo el administrador puede anular ventas",
      });
    }

    const saleIdParam = req.params.id;

    if (typeof saleIdParam !== "string") {
      return res.status(400).json({
        ok: false,
        message: "ID de venta inválido",
      });
    }

    const validation = cancelSaleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos de anulación inválidos",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const sale = await prisma.sale.findUnique({
      where: {
        id: saleIdParam,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                trackStock: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({
        ok: false,
        message: "Venta no encontrada",
      });
    }

    if (sale.status === SaleStatus.CANCELLED) {
      return res.status(400).json({
        ok: false,
        message: "La venta ya fue anulada anteriormente",
      });
    }

    const cancelReason = validation.data.reason?.trim();

    const cancelledSale = await prisma.$transaction(async (tx) => {
      const updatedSale = await tx.sale.update({
        where: {
          id: sale.id,
        },
        data: {
          status: SaleStatus.CANCELLED,
          notes: cancelReason
            ? `${sale.notes ? `${sale.notes}\n` : ""}ANULADA: ${cancelReason}`
            : `${sale.notes ? `${sale.notes}\n` : ""}ANULADA`,
        },
        include: {
          cashier: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
      });

      for (const item of sale.items) {
        if (item.product.trackStock) {
          await tx.product.update({
            where: {
              id: item.product.id,
            },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      return updatedSale;
    });

    return res.json({
      ok: true,
      message: "Venta anulada correctamente",
      sale: cancelledSale,
    });
  } catch (error) {
    next(error);
  }
});
router.post("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado",
      });
    }

    const validation = createSaleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos de venta inválidos",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { items, paymentMethod, amountPaid, notes } = validation.data;
    const discount = validation.data.discount ?? 0;

    const productIds = items.map((item) => item.productId);

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        isActive: true,
      },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        ok: false,
        message: "Uno o más productos no existen o están inactivos",
      });
    }

    const saleItemsData = items.map((item) => {
      const product = products.find((currentProduct) => currentProduct.id === item.productId);

      if (!product) {
        throw new Error("Producto no encontrado durante el cálculo de la venta");
      }

      if (product.trackStock && product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para el producto: ${product.name}`);
      }

      const unitPrice = Number(product.price);
      const subtotal = roundMoney(unitPrice * item.quantity);

      return {
        product,
        quantity: item.quantity,
        unitPrice,
        subtotal,
      };
    });

    const subtotal = roundMoney(
      saleItemsData.reduce((sum, item) => {
        return sum + item.subtotal;
      }, 0),
    );

    if (discount > subtotal) {
      return res.status(400).json({
        ok: false,
        message: "El descuento no puede ser mayor al subtotal",
      });
    }

    const total = roundMoney(subtotal - discount);
    const finalAmountPaid = amountPaid ?? total;

    if (finalAmountPaid < total) {
      return res.status(400).json({
        ok: false,
        message: "El monto pagado no puede ser menor al total",
      });
    }

    const changeAmount = roundMoney(finalAmountPaid - total);
    const saleNumber = await generateSaleNumber();

    const openCashSession = await prisma.cashSession.findFirst({
        where: {
            userId: req.user.userId,
            status: CashSessionStatus.OPEN,
        },
    });

    const createdSale = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
            saleNumber,
            subtotal: subtotal.toFixed(2),
            discount: discount.toFixed(2),
            total: total.toFixed(2),
            paymentMethod,
            amountPaid: finalAmountPaid.toFixed(2),
            changeAmount: changeAmount.toFixed(2),
            ...(notes !== undefined ? { notes } : {}),
            cashierId: req.user!.userId,
            ...(openCashSession ? { cashSessionId: openCashSession.id } : {}),
            items: {
                create: saleItemsData.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
                unitPrice: item.unitPrice.toFixed(2),
                subtotal: item.subtotal.toFixed(2),
                })),
            },
        },
        include: {
          cashier: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
      });

      for (const item of saleItemsData) {
        if (item.product.trackStock) {
          await tx.product.update({
            where: {
              id: item.product.id,
            },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      return sale;
    });

    return res.status(201).json({
      ok: true,
      message: "Venta registrada correctamente",
      sale: createdSale,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Stock insuficiente")) {
      return res.status(400).json({
        ok: false,
        message: error.message,
      });
    }

    next(error);
  }
});

export default router;
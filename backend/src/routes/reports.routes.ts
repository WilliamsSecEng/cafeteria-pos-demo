import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { PaymentMethod, SaleStatus } from "../../generated/prisma/enums.js";

const router = Router();

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function getQueryString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return "";
}

function getDateRange(fromQuery: unknown, toQuery: unknown) {
  const now = new Date();

  const from = getQueryString(fromQuery);
  const to = getQueryString(toQuery);

  const startDate = from ? new Date(`${from}T00:00:00`) : new Date(now);
  const endDate = to ? new Date(`${to}T23:59:59.999`) : new Date(now);

  if (!from) {
    startDate.setHours(0, 0, 0, 0);
  }

  if (!to) {
    endDate.setHours(23, 59, 59, 999);
  }

  return {
    startDate,
    endDate,
  };
}

router.get("/sales", authMiddleware, async (req, res, next) => {
  try {
    const { startDate, endDate } = getDateRange(req.query.from, req.query.to);

    const sales = await prisma.sale.findMany({
      where: {
        status: SaleStatus.COMPLETED,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
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

    const totalSales = sales.length;

    const totalAmount = roundMoney(
      sales.reduce((sum, sale) => {
        return sum + Number(sale.total);
      }, 0),
    );

    const totalDiscount = roundMoney(
      sales.reduce((sum, sale) => {
        return sum + Number(sale.discount);
      }, 0),
    );

    const totalItems = sales.reduce((sum, sale) => {
      return (
        sum +
        sale.items.reduce((itemSum, item) => {
          return itemSum + item.quantity;
        }, 0)
      );
    }, 0);

    const averageTicket =
      totalSales > 0 ? roundMoney(totalAmount / totalSales) : 0;

    const paymentMethods = Object.values(PaymentMethod).map((method) => {
      const methodSales = sales.filter((sale) => sale.paymentMethod === method);

      return {
        method,
        salesCount: methodSales.length,
        totalAmount: roundMoney(
          methodSales.reduce((sum, sale) => {
            return sum + Number(sale.total);
          }, 0),
        ),
      };
    });

    const productMap = new Map<
      string,
      {
        productId: string;
        name: string;
        category: string;
        quantity: number;
        totalAmount: number;
      }
    >();

    for (const sale of sales) {
      for (const item of sale.items) {
        const current = productMap.get(item.productId);

        const itemTotal = Number(item.subtotal);

        if (!current) {
          productMap.set(item.productId, {
            productId: item.productId,
            name: item.product.name,
            category: item.product.category.name,
            quantity: item.quantity,
            totalAmount: itemTotal,
          });
        } else {
          current.quantity += item.quantity;
          current.totalAmount += itemTotal;
        }
      }
    }

    const topProducts = Array.from(productMap.values())
      .map((product) => ({
        ...product,
        totalAmount: roundMoney(product.totalAmount),
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    const latestSales = sales.slice(0, 10).map((sale) => ({
      id: sale.id,
      saleNumber: sale.saleNumber,
      total: Number(sale.total),
      paymentMethod: sale.paymentMethod,
      createdAt: sale.createdAt,
      cashier: sale.cashier,
      itemsCount: sale.items.reduce((sum, item) => sum + item.quantity, 0),
    }));

    return res.json({
      ok: true,
      range: {
        from: startDate,
        to: endDate,
      },
      summary: {
        totalSales,
        totalAmount,
        totalDiscount,
        totalItems,
        averageTicket,
      },
      paymentMethods,
      topProducts,
      latestSales,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
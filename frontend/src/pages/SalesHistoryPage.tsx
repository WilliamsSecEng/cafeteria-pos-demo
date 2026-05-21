import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Coffee,
  Eye,
  Printer,
  ReceiptText,
  RefreshCcw,
  Search,
  ShoppingCart,
} from "lucide-react";
import { getSales, type PaymentMethod, type Sale } from "../services/api";

function toMoney(value: number | string | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function paymentMethodLabel(method: PaymentMethod) {
  const labels: Record<PaymentMethod, string> = {
    CASH: "Efectivo",
    QR: "QR",
    CARD: "Tarjeta",
    MIXED: "Mixto",
  };

  return labels[method];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function printSaleTicket(sale: Sale) {
  const ticketWindow = window.open("", "_blank", "width=420,height=700");

  if (!ticketWindow) {
    return;
  }

  const itemsHtml = sale.items
    .map((item) => {
      return `
        <tr>
          <td>${escapeHtml(item.product.name)}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">${toMoney(item.unitPrice)}</td>
          <td class="right">${toMoney(item.subtotal)}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Ticket ${escapeHtml(sale.saleNumber)}</title>

        <style>
          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #111111;
            font-family: Arial, Helvetica, sans-serif;
          }

          body {
            padding: 16px;
          }

          .ticket {
            width: 320px;
            max-width: 100%;
            margin: 0 auto;
          }

          .center {
            text-align: center;
          }

          .right {
            text-align: right;
          }

          h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 800;
          }

          p {
            margin: 4px 0;
            font-size: 12px;
          }

          .line {
            border-top: 1px dashed #333333;
            margin: 12px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          th {
            padding-bottom: 5px;
            border-bottom: 1px solid #dddddd;
            text-align: left;
          }

          td {
            padding: 5px 0;
            vertical-align: top;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin: 5px 0;
            font-size: 13px;
          }

          .grand-total {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #dddddd;
            font-size: 18px;
            font-weight: 800;
          }

          .footer {
            margin-top: 14px;
            text-align: center;
            font-size: 12px;
          }

          @media print {
            @page {
              size: 80mm auto;
              margin: 4mm;
            }

            body {
              padding: 0;
            }

            .ticket {
              width: 72mm;
              margin: 0;
            }
          }
        </style>
      </head>

      <body>
        <main class="ticket">
          <section class="center">
            <h1>Cafetería POS</h1>
            <p>Sistema de ventas</p>
            <p><strong>Ticket:</strong> ${escapeHtml(sale.saleNumber)}</p>
            <p><strong>Fecha:</strong> ${escapeHtml(formatDate(sale.createdAt))}</p>
            <p><strong>Cajero:</strong> ${escapeHtml(sale.cashier.fullName)}</p>
          </section>

          <div class="line"></div>

          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th class="center">Cant.</th>
                <th class="right">P/U</th>
                <th class="right">Subt.</th>
              </tr>
            </thead>

            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="line"></div>

          <div class="total-row">
            <span>Subtotal</span>
            <strong>Bs. ${toMoney(sale.subtotal)}</strong>
          </div>

          <div class="total-row">
            <span>Descuento</span>
            <strong>Bs. ${toMoney(sale.discount)}</strong>
          </div>

          <div class="total-row grand-total">
            <span>Total</span>
            <span>Bs. ${toMoney(sale.total)}</span>
          </div>

          <div class="total-row">
            <span>Monto pagado</span>
            <strong>Bs. ${toMoney(sale.amountPaid)}</strong>
          </div>

          <div class="total-row">
            <span>Cambio</span>
            <strong>Bs. ${toMoney(sale.changeAmount)}</strong>
          </div>

          <div class="total-row">
            <span>Método</span>
            <strong>${escapeHtml(paymentMethodLabel(sale.paymentMethod))}</strong>
          </div>

          <div class="line"></div>

          <section class="footer">
            <p>Gracias por su compra</p>
            <p>Vuelva pronto</p>
          </section>
        </main>
      </body>
    </html>
  `;

  ticketWindow.document.open();
  ticketWindow.document.write(html);
  ticketWindow.document.close();
  ticketWindow.focus();

  window.setTimeout(() => {
    ticketWindow.print();
  }, 500);
}

function SalesHistoryPage() {
  const navigate = useNavigate();

  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadSales = useCallback(async () => {
    const token = localStorage.getItem("cafeteria_token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await getSales(token, {
        status: "COMPLETED",
      });

      setSales(response.sales);
      setSelectedSale((current) => current ?? response.sales[0] ?? null);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el historial de ventas",
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSales();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadSales]);

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return sales;
    }

    return sales.filter((sale) => {
      return (
        sale.saleNumber.toLowerCase().includes(query) ||
        sale.cashier.fullName.toLowerCase().includes(query) ||
        sale.paymentMethod.toLowerCase().includes(query)
      );
    });
  }, [sales, search]);

  const totalFilteredAmount = useMemo(() => {
    return filteredSales.reduce((sum, sale) => sum + Number(sale.total), 0);
  }, [filteredSales]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-stone-100 px-4">
        <div className="rounded-3xl bg-white p-8 text-center shadow-xl shadow-orange-100/60">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-600 text-white">
            <ReceiptText size={34} />
          </div>
          <p className="font-bold text-stone-600">Cargando ventas...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-stone-100 px-4 py-6 sm:px-6 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-5 rounded-3xl border border-orange-100 bg-white/85 p-5 shadow-xl shadow-orange-100/60 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-orange-600 text-white shadow-lg shadow-orange-200">
              <Coffee size={30} />
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">
                Historial
              </p>
              <h1 className="text-2xl font-black text-stone-900 sm:text-3xl">
                Ventas registradas
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Consulta ventas, detalles y reimprime tickets.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void loadSales()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-stone-700 shadow-sm ring-1 ring-stone-200 transition hover:bg-stone-50"
            >
              <RefreshCcw size={18} />
              Actualizar
            </button>

            <Link
              to="/"
              className="flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-stone-700"
            >
              <ArrowLeft size={18} />
              Volver al panel
            </Link>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-3">
          <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-100/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
              <ShoppingCart />
            </div>
            <p className="text-sm font-bold text-stone-500">Ventas mostradas</p>
            <h2 className="mt-2 text-3xl font-black text-stone-900">
              {filteredSales.length}
            </h2>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-100/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ReceiptText />
            </div>
            <p className="text-sm font-bold text-stone-500">Total mostrado</p>
            <h2 className="mt-2 text-3xl font-black text-stone-900">
              Bs. {toMoney(totalFilteredAmount)}
            </h2>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-100/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <Printer />
            </div>
            <p className="text-sm font-bold text-stone-500">Reimpresión</p>
            <h2 className="mt-2 text-3xl font-black text-stone-900">
              Ticket
            </h2>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-stone-900">
                  Lista de ventas
                </h2>
                <p className="text-sm text-stone-500">
                  Selecciona una venta para ver el detalle.
                </p>
              </div>
            </div>

            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
              <Search size={19} className="text-stone-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por número, cajero o método..."
                className="w-full bg-transparent text-sm font-medium outline-none"
              />
            </div>

            <div className="max-h-[680px] space-y-3 overflow-y-auto pr-1">
              {filteredSales.length === 0 && (
                <div className="rounded-2xl bg-stone-100 p-4 text-sm font-semibold text-stone-500">
                  No hay ventas para mostrar.
                </div>
              )}

              {filteredSales.map((sale) => {
                const isSelected = selectedSale?.id === sale.id;

                return (
                  <button
                    key={sale.id}
                    type="button"
                    onClick={() => setSelectedSale(sale)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-orange-300 bg-orange-50"
                        : "border-stone-100 bg-stone-50 hover:bg-orange-50/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-stone-900">
                          {sale.saleNumber}
                        </p>
                        <p className="mt-1 text-sm text-stone-500">
                          {formatDate(sale.createdAt)}
                        </p>
                        <p className="mt-1 text-sm text-stone-500">
                          Cajero: {sale.cashier.fullName}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-black text-stone-900">
                          Bs. {toMoney(sale.total)}
                        </p>
                        <p className="mt-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-stone-600">
                          {paymentMethodLabel(sale.paymentMethod)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </article>

          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
            {!selectedSale ? (
              <div className="rounded-2xl bg-stone-100 p-4 text-sm font-semibold text-stone-500">
                Selecciona una venta para ver el detalle.
              </div>
            ) : (
              <>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">
                      Detalle de venta
                    </p>
                    <h2 className="text-2xl font-black text-stone-900">
                      {selectedSale.saleNumber}
                    </h2>
                    <p className="text-sm text-stone-500">
                      {formatDate(selectedSale.createdAt)} ·{" "}
                      {selectedSale.cashier.fullName}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => printSaleTicket(selectedSale)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-black text-white transition hover:bg-stone-700"
                  >
                    <Printer size={18} />
                    Reimprimir
                  </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-stone-100">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                      <tr>
                        <th className="px-4 py-3">Producto</th>
                        <th className="px-4 py-3">Cant.</th>
                        <th className="px-4 py-3">P/U</th>
                        <th className="px-4 py-3">Subtotal</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-stone-100">
                      {selectedSale.items.map((item) => (
                        <tr key={item.id} className="hover:bg-orange-50/60">
                          <td className="px-4 py-3 font-bold text-stone-800">
                            {item.product.name}
                          </td>
                          <td className="px-4 py-3 text-stone-500">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-stone-500">
                            Bs. {toMoney(item.unitPrice)}
                          </td>
                          <td className="px-4 py-3 font-black text-stone-900">
                            Bs. {toMoney(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-stone-50 p-4">
                    <p className="text-xs font-bold uppercase text-stone-500">
                      Subtotal
                    </p>
                    <p className="mt-1 text-lg font-black text-stone-900">
                      Bs. {toMoney(selectedSale.subtotal)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-stone-50 p-4">
                    <p className="text-xs font-bold uppercase text-stone-500">
                      Descuento
                    </p>
                    <p className="mt-1 text-lg font-black text-stone-900">
                      Bs. {toMoney(selectedSale.discount)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-stone-900 p-4 text-white">
                    <p className="text-xs font-bold uppercase text-stone-300">
                      Total
                    </p>
                    <p className="mt-1 text-lg font-black">
                      Bs. {toMoney(selectedSale.total)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-xs font-bold uppercase text-emerald-600">
                      Cambio
                    </p>
                    <p className="mt-1 text-lg font-black text-emerald-700">
                      Bs. {toMoney(selectedSale.changeAmount)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
                  <p>
                    <strong>Método de pago:</strong>{" "}
                    {paymentMethodLabel(selectedSale.paymentMethod)}
                  </p>
                  <p className="mt-1">
                    <strong>Monto pagado:</strong> Bs.{" "}
                    {toMoney(selectedSale.amountPaid)}
                  </p>
                  {selectedSale.notes && (
                    <p className="mt-1">
                      <strong>Nota:</strong> {selectedSale.notes}
                    </p>
                  )}
                </div>
              </>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}

export default SalesHistoryPage;
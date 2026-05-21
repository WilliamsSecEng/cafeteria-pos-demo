import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Coffee,
  CreditCard,
  Package,
  ReceiptText,
  RefreshCcw,
  ShoppingCart,
  Trophy,
  Wallet,
} from "lucide-react";
import { getSalesReport, type PaymentMethod, type SalesReport } from "../services/api";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

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

function ReportsPage() {
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState(todayInputValue());
  const [toDate, setToDate] = useState(todayInputValue());
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReport = useCallback(async () => {
    const token = localStorage.getItem("cafeteria_token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await getSalesReport(token, fromDate, toDate);
      setReport(response);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo cargar el reporte",
      );
    } finally {
      setLoading(false);
      setActionLoading(false);
    }
  }, [fromDate, navigate, toDate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReport();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadReport]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (fromDate > toDate) {
      setErrorMessage("La fecha inicial no puede ser mayor a la fecha final");
      return;
    }

    setActionLoading(true);
    await loadReport();
  }

  const maxPaymentAmount = useMemo(() => {
    if (!report?.paymentMethods.length) {
      return 0;
    }

    return Math.max(
      ...report.paymentMethods.map((payment) => payment.totalAmount),
    );
  }, [report]);

  const maxTopProductQuantity = useMemo(() => {
    if (!report?.topProducts.length) {
      return 0;
    }

    return Math.max(...report.topProducts.map((product) => product.quantity));
  }, [report]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-stone-100 px-4">
        <div className="rounded-3xl bg-white p-8 text-center shadow-xl shadow-orange-100/60">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-600 text-white">
            <BarChart3 size={34} />
          </div>
          <p className="font-bold text-stone-600">Cargando reportes...</p>
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
                Reportes comerciales
              </p>
              <h1 className="text-2xl font-black text-stone-900 sm:text-3xl">
                Análisis de ventas
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setActionLoading(true);
                void loadReport();
              }}
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

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"
          >
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-700">
                <CalendarDays size={17} />
                Desde
              </span>

              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-700">
                <CalendarDays size={17} />
                Hasta
              </span>

              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
              />
            </label>

            <button
              type="submit"
              disabled={actionLoading}
              className="self-end rounded-2xl bg-orange-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {actionLoading ? "Consultando..." : "Consultar"}
            </button>
          </form>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-100/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
              <ShoppingCart />
            </div>
            <p className="text-sm font-bold text-stone-500">Ventas</p>
            <h2 className="mt-2 text-3xl font-black text-stone-900">
              {report?.summary.totalSales ?? 0}
            </h2>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-100/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Wallet />
            </div>
            <p className="text-sm font-bold text-stone-500">Total vendido</p>
            <h2 className="mt-2 text-3xl font-black text-stone-900">
              Bs. {toMoney(report?.summary.totalAmount)}
            </h2>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-100/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <Package />
            </div>
            <p className="text-sm font-bold text-stone-500">
              Productos vendidos
            </p>
            <h2 className="mt-2 text-3xl font-black text-stone-900">
              {report?.summary.totalItems ?? 0}
            </h2>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-100/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
              <ReceiptText />
            </div>
            <p className="text-sm font-bold text-stone-500">Ticket promedio</p>
            <h2 className="mt-2 text-3xl font-black text-stone-900">
              Bs. {toMoney(report?.summary.averageTicket)}
            </h2>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CreditCard />
              </div>

              <div>
                <h2 className="text-xl font-black text-stone-900">
                  Métodos de pago
                </h2>
                <p className="text-sm text-stone-500">
                  Ventas agrupadas por forma de pago.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {report?.paymentMethods.map((payment) => {
                const width =
                  maxPaymentAmount > 0
                    ? (payment.totalAmount / maxPaymentAmount) * 100
                    : 0;

                return (
                  <div key={payment.method}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-black text-stone-800">
                        {paymentMethodLabel(payment.method)}
                      </span>
                      <span className="font-bold text-stone-500">
                        Bs. {toMoney(payment.totalAmount)} ·{" "}
                        {payment.salesCount} ventas
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                <Trophy />
              </div>

              <div>
                <h2 className="text-xl font-black text-stone-900">
                  Productos más vendidos
                </h2>
                <p className="text-sm text-stone-500">
                  Ranking por cantidad vendida.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {!report?.topProducts.length && (
                <div className="rounded-2xl bg-stone-100 p-4 text-sm font-semibold text-stone-500">
                  No hay productos vendidos en este rango.
                </div>
              )}

              {report?.topProducts.map((product, index) => {
                const width =
                  maxTopProductQuantity > 0
                    ? (product.quantity / maxTopProductQuantity) * 100
                    : 0;

                return (
                  <div key={product.productId}>
                    <div className="mb-2 flex items-start justify-between gap-3 text-sm">
                      <div>
                        <p className="font-black text-stone-900">
                          #{index + 1} {product.name}
                        </p>
                        <p className="text-xs font-semibold text-stone-500">
                          {product.category}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-black text-stone-900">
                          {product.quantity} uds.
                        </p>
                        <p className="text-xs font-semibold text-stone-500">
                          Bs. {toMoney(product.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-orange-600"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <ReceiptText />
            </div>

            <div>
              <h2 className="text-xl font-black text-stone-900">
                Últimas ventas
              </h2>
              <p className="text-sm text-stone-500">
                Ventas recientes dentro del rango seleccionado.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-stone-100">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Nro. venta</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cajero</th>
                  <th className="px-4 py-3">Pago</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100">
                {!report?.latestSales.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center font-semibold text-stone-500"
                    >
                      No hay ventas en este rango.
                    </td>
                  </tr>
                )}

                {report?.latestSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-orange-50/60">
                    <td className="px-4 py-3 font-black text-stone-900">
                      {sale.saleNumber}
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {formatDate(sale.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {sale.cashier.fullName}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-700">
                      {paymentMethodLabel(sale.paymentMethod)}
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {sale.itemsCount}
                    </td>
                    <td className="px-4 py-3 font-black text-stone-900">
                      Bs. {toMoney(sale.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

export default ReportsPage;
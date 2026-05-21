import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  Coffee,
  LogOut,
  Package,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Wallet,
  BarChart3,
} from "lucide-react";
import {
  getCurrentCash,
  getProducts,
  getTodaySummary,
  type CashSession,
  type Product,
  type User,
} from "../services/api";

type Summary = {
  totalSales: number;
  totalAmount: number;
  totalItems: number;
};

function toMoney(value: number | string | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

function DashboardPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [expectedCash, setExpectedCash] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    const token = localStorage.getItem("cafeteria_token");
    const storedUser = localStorage.getItem("cafeteria_user");

    if (!token || !storedUser) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as User;
      setUser(parsedUser);

      const [summaryResponse, productsResponse, cashResponse] =
        await Promise.all([
          getTodaySummary(token),
          getProducts(),
          getCurrentCash(token),
        ]);

      setSummary(summaryResponse.summary);
      setProducts(productsResponse.products);
      setCashSession(cashResponse.cashSession);
      setExpectedCash(cashResponse.expectedAmount ?? 0);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDashboard]);

  function handleLogout() {
    localStorage.removeItem("cafeteria_token");
    localStorage.removeItem("cafeteria_user");
    navigate("/login");
  }

  const lowStockProducts = useMemo(() => {
    return products.filter(
      (product) => product.trackStock && product.stock <= 10,
    );
  }, [products]);

  const categoriesCount = useMemo(() => {
    const categories = new Set(products.map((product) => product.category.id));
    return categories.size;
  }, [products]);

  const productsWithStockControl = useMemo(() => {
    return products.filter((product) => product.trackStock).length;
  }, [products]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-stone-100 px-4">
        <div className="rounded-3xl bg-white p-8 text-center shadow-xl shadow-orange-100/60">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-600 text-white">
            <Coffee size={34} />
          </div>
          <p className="font-bold text-stone-600">Cargando dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-stone-100 px-4 py-6 sm:px-6 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-xl shadow-orange-100/60">
          <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-600 text-white shadow-lg shadow-orange-200">
                    <Coffee size={34} />
                  </div>

                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-600">
                      Demo comercial
                    </p>
                    <h1 className="text-3xl font-black tracking-tight text-stone-900 sm:text-4xl">
                      Cafetería POS
                    </h1>
                    <p className="mt-1 max-w-2xl text-sm text-stone-500 sm:text-base">
                      Sistema de ventas, caja, inventario y reportes para
                      cafeterías.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    to="/caja"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    <Wallet size={18} />
                    Caja
                  </Link>

                  <Link
                    to="/ventas"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
                  >
                    <ShoppingCart size={18} />
                    Nueva venta
                  </Link>
                    <Link
                        to="/reportes"
                        className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                        >
                        <BarChart3 size={18} />
                        Reportes
                    </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-stone-700"
                  >
                    <LogOut size={18} />
                    Salir
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-700 via-orange-600 to-amber-600 p-6 text-white sm:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-100">
                Usuario activo
              </p>

              <h2 className="mt-3 text-2xl font-black">
                {user?.fullName ?? "Usuario"}
              </h2>

              <p className="mt-1 text-orange-100">{user?.email}</p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-black backdrop-blur">
                <ShieldCheck size={18} />
                Rol: {user?.role ?? "-"}
              </div>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-100/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
              <ShoppingCart />
            </div>
            <p className="text-sm font-bold text-stone-500">Ventas de hoy</p>
            <h2 className="mt-2 text-3xl font-black text-stone-900">
              {summary?.totalSales ?? 0}
            </h2>
            <p className="mt-2 text-xs font-semibold text-stone-400">
              Transacciones registradas
            </p>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-100/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <TrendingUp />
            </div>
            <p className="text-sm font-bold text-stone-500">Total vendido</p>
            <h2 className="mt-2 text-3xl font-black text-stone-900">
              Bs. {toMoney(summary?.totalAmount)}
            </h2>
            <p className="mt-2 text-xs font-semibold text-stone-400">
              Monto acumulado del día
            </p>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-100/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <Package />
            </div>
            <p className="text-sm font-bold text-stone-500">Catálogo</p>
            <h2 className="mt-2 text-3xl font-black text-stone-900">
              {products.length}
            </h2>
            <p className="mt-2 text-xs font-semibold text-stone-400">
              Productos registrados
            </p>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-100/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
              <Wallet />
            </div>
            <p className="text-sm font-bold text-stone-500">Caja</p>
            <h2 className="mt-2 text-3xl font-black text-stone-900">
              {cashSession ? "Abierta" : "Cerrada"}
            </h2>
            <p className="mt-2 text-xs font-semibold text-stone-400">
              Esperado: Bs. {toMoney(expectedCash)}
            </p>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-stone-900">
                  Accesos rápidos
                </h2>
                <p className="text-sm text-stone-500">
                  Funciones principales para operar la cafetería.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Link
                to="/ventas"
                className="group rounded-3xl border border-orange-100 bg-orange-50 p-5 transition hover:-translate-y-0.5 hover:bg-orange-100"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white">
                  <ShoppingCart />
                </div>
                <h3 className="text-lg font-black text-stone-900">
                  Registrar venta
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Selecciona productos, define método de pago y registra la
                  venta en PostgreSQL.
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm font-black text-orange-700">
                  Ir al POS
                  <ArrowRight
                    size={17}
                    className="transition group-hover:translate-x-1"
                  />
                </div>
              </Link>

              <Link
                to="/caja"
                className="group rounded-3xl border border-emerald-100 bg-emerald-50 p-5 transition hover:-translate-y-0.5 hover:bg-emerald-100"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                  <Wallet />
                </div>
                <h3 className="text-lg font-black text-stone-900">
                  Control de caja
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Abre caja, registra ingresos, egresos y controla diferencias
                  al cierre.
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm font-black text-emerald-700">
                  Ir a caja
                  <ArrowRight
                    size={17}
                    className="transition group-hover:translate-x-1"
                  />
                </div>
              </Link>
            </div>
          </article>

          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
            <h2 className="text-xl font-black text-stone-900">
              Estado comercial
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Resumen útil para mostrar la demo a un cliente.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex justify-between rounded-2xl bg-stone-50 p-4 text-sm">
                <span className="font-bold text-stone-500">Categorías</span>
                <span className="font-black text-stone-900">
                  {categoriesCount}
                </span>
              </div>

              <div className="flex justify-between rounded-2xl bg-stone-50 p-4 text-sm">
                <span className="font-bold text-stone-500">
                  Con control de stock
                </span>
                <span className="font-black text-stone-900">
                  {productsWithStockControl}
                </span>
              </div>

              <div className="flex justify-between rounded-2xl bg-stone-50 p-4 text-sm">
                <span className="font-bold text-stone-500">
                  Productos críticos
                </span>
                <span className="font-black text-stone-900">
                  {lowStockProducts.length}
                </span>
              </div>

              <div className="rounded-2xl bg-stone-900 p-4 text-sm text-white">
                <p className="font-black">Demo lista para presentación</p>
                <p className="mt-1 text-stone-300">
                  Login, ventas, caja, stock y conexión real con PostgreSQL.
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-stone-900">
                  Productos disponibles
                </h2>
                <p className="text-sm text-stone-500">
                  Vista rápida del catálogo cargado desde la base de datos.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-100">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Precio</th>
                    <th className="px-4 py-3">Stock</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {products.slice(0, 8).map((product) => (
                    <tr key={product.id} className="hover:bg-orange-50/60">
                      <td className="px-4 py-3 font-bold text-stone-800">
                        {product.name}
                      </td>
                      <td className="px-4 py-3 text-stone-500">
                        {product.category.name}
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-800">
                        Bs. {toMoney(product.price)}
                      </td>
                      <td className="px-4 py-3">
                        {product.trackStock ? (
                          <span className="font-semibold text-stone-700">
                            {product.stock}
                          </span>
                        ) : (
                          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-500">
                            Sin control
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
            <h2 className="text-xl font-black text-stone-900">
              Alertas de stock
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Productos físicos con bajo inventario.
            </p>

            <div className="mt-5 space-y-3">
              {lowStockProducts.length === 0 && (
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  No hay productos críticos.
                </div>
              )}

              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                >
                  <p className="font-black text-stone-900">{product.name}</p>
                  <p className="text-sm text-amber-700">
                    Stock actual: {product.stock}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

export default DashboardPage;
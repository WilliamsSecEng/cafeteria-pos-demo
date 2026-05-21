import { Link } from "react-router";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Coffee,
  Database,
  Lock,
  PackageCheck,
  ShoppingCart,
  Wallet,
} from "lucide-react";

function MarketingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-stone-100 px-4 py-6 sm:px-6 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-5 rounded-[2rem] border border-orange-100 bg-white/90 p-6 shadow-xl shadow-orange-100/60 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-15 w-15 items-center justify-center rounded-3xl bg-orange-600 p-4 text-white shadow-lg shadow-orange-200">
              <Coffee size={34} />
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-600">
                Sistema demo
              </p>
              <h1 className="text-3xl font-black text-stone-900">
                Cafetería POS
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-stone-700"
            >
              <Lock size={18} />
              Ingresar al demo
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[2.3rem] border border-orange-100 bg-white p-7 shadow-2xl shadow-orange-100/70 sm:p-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-black text-orange-700">
              <BadgeCheck size={18} />
              Demo funcional con PostgreSQL
            </div>

            <h2 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-stone-900 sm:text-5xl">
              Sistema de ventas moderno para cafeterías, listo para presentar a
              clientes.
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-8 text-stone-600">
              Controla ventas, caja, productos, inventario y reportes desde una
              interfaz web clara, rápida y adaptable a negocios pequeños y
              medianos.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700"
              >
                Probar sistema
                <ArrowRight size={18} />
              </Link>

              <a
                href="#modulos"
                className="flex items-center justify-center rounded-2xl bg-stone-100 px-6 py-4 text-sm font-black uppercase tracking-wide text-stone-700 transition hover:bg-stone-200"
              >
                Ver módulos
              </a>
            </div>

            <div className="mt-8 rounded-3xl bg-stone-900 p-5 text-white">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-200">
                Usuarios demo
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="font-black">Administrador</p>
                  <p className="mt-1 text-sm text-stone-300">
                    admin@cafeteria.com
                  </p>
                  <p className="text-sm text-stone-300">admin123</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="font-black">Cajero</p>
                  <p className="mt-1 text-sm text-stone-300">
                    cajero@cafeteria.com
                  </p>
                  <p className="text-sm text-stone-300">cajero123</p>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-[2.3rem] bg-gradient-to-br from-orange-700 via-orange-600 to-amber-600 p-7 text-white shadow-2xl shadow-orange-200/70 sm:p-10">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
              Valor comercial
            </p>

            <h3 className="mt-4 text-3xl font-black leading-tight">
              Ideal para vender como solución a cafeterías, snack bars y
              negocios de comida rápida.
            </h3>

            <div className="mt-8 space-y-4">
              <div className="rounded-3xl bg-white/12 p-5 backdrop-blur">
                <p className="font-black">Operación diaria</p>
                <p className="mt-2 text-sm leading-6 text-orange-50">
                  Registra ventas, controla caja y visualiza métricas sin usar
                  hojas de cálculo.
                </p>
              </div>

              <div className="rounded-3xl bg-white/12 p-5 backdrop-blur">
                <p className="font-black">Control administrativo</p>
                <p className="mt-2 text-sm leading-6 text-orange-50">
                  Permite separar roles entre administrador y cajero para mayor
                  seguridad.
                </p>
              </div>

              <div className="rounded-3xl bg-white/12 p-5 backdrop-blur">
                <p className="font-black">Reportes vendibles</p>
                <p className="mt-2 text-sm leading-6 text-orange-50">
                  Muestra ventas, ticket promedio, productos más vendidos y
                  métodos de pago.
                </p>
              </div>
            </div>
          </article>
        </section>

        <section id="modulos" className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
              <ShoppingCart />
            </div>
            <h3 className="text-lg font-black text-stone-900">
              Punto de venta
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Carrito, cantidades, descuentos, métodos de pago y registro de
              ventas.
            </p>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Wallet />
            </div>
            <h3 className="text-lg font-black text-stone-900">
              Control de caja
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Apertura, ingresos, egresos, efectivo esperado y cierre diario.
            </p>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <PackageCheck />
            </div>
            <h3 className="text-lg font-black text-stone-900">
              Inventario básico
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Stock para productos físicos y alertas de inventario bajo.
            </p>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
              <BarChart3 />
            </div>
            <h3 className="text-lg font-black text-stone-900">Reportes</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Resumen por fecha, métodos de pago y productos más vendidos.
            </p>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-white">
              <Database />
            </div>
            <h3 className="text-2xl font-black text-stone-900">
              Tecnología profesional
            </h3>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              Backend con Node.js y Express, base de datos PostgreSQL, Prisma
              ORM, autenticación JWT y frontend con React, Vite y Tailwind CSS.
            </p>
          </article>

          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
            <h3 className="text-2xl font-black text-stone-900">
              Próximas mejoras comerciales
            </h3>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-stone-50 p-4 text-sm font-semibold text-stone-600">
                Impresión de ticket
              </div>
              <div className="rounded-2xl bg-stone-50 p-4 text-sm font-semibold text-stone-600">
                Gestión completa de productos
              </div>
              <div className="rounded-2xl bg-stone-50 p-4 text-sm font-semibold text-stone-600">
                Exportación PDF o Excel
              </div>
              <div className="rounded-2xl bg-stone-50 p-4 text-sm font-semibold text-stone-600">
                Control de mesas
              </div>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

export default MarketingPage;
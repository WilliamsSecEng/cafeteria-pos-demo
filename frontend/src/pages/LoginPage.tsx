import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { Coffee, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { login } from "../services/api";

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@cafeteria.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setLoading(true);

    try {
      const response = await login({
        email,
        password,
      });

      localStorage.setItem("cafeteria_token", response.token);
      localStorage.setItem("cafeteria_user", JSON.stringify(response.user));

      navigate("/");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-100 via-amber-50 to-stone-100 px-4 py-8">
      <section className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl shadow-orange-200/60 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden bg-gradient-to-br from-orange-700 via-orange-600 to-amber-600 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">
              <Coffee size={36} />
            </div>

            <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-100">
              Sistema comercial
            </p>

            <h1 className="mt-4 max-w-xl text-5xl font-black leading-tight tracking-tight">
              Cafetería POS para ventas, caja e inventario.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-8 text-orange-50">
              Una demo profesional pensada para mostrar a negocios reales:
              rápida, clara, moderna y lista para crecer.
            </p>
          </div>

          <div className="grid gap-4 rounded-3xl bg-white/12 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-orange-100">Ventas rápidas</span>
              <strong>Activo</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-orange-100">Caja diaria</span>
              <strong>Activo</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-orange-100">PostgreSQL</span>
              <strong>Conectado</strong>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mx-auto max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white">
                <Coffee />
              </div>
              <div>
                <h1 className="text-2xl font-black text-stone-900">
                  Cafetería POS
                </h1>
                <p className="text-sm text-stone-500">Demo comercial</p>
              </div>
            </div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">
              Bienvenido
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-stone-900">
              Iniciar sesión
            </h2>

            <p className="mt-3 text-sm leading-6 text-stone-500">
              Accede como administrador o cajero para probar el sistema.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-stone-700">
                  Correo electrónico
                </span>

                <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 focus-within:border-orange-500 focus-within:bg-white">
                  <Mail size={20} className="text-stone-400" />
                  <input
                    className="w-full bg-transparent text-sm font-medium text-stone-800 outline-none"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@cafeteria.com"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-stone-700">
                  Contraseña
                </span>

                <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 focus-within:border-orange-500 focus-within:bg-white">
                  <Lock size={20} className="text-stone-400" />
                  <input
                    className="w-full bg-transparent text-sm font-medium text-stone-800 outline-none"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Contraseña"
                  />

                  <button
                    type="button"
                    className="text-stone-400 hover:text-stone-700"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label="Mostrar u ocultar contraseña"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </label>

              {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-orange-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Ingresando..." : "Ingresar al sistema"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl bg-orange-50 p-4 text-sm text-stone-600">
              <p className="font-bold text-stone-800">Usuarios demo:</p>
              <p className="mt-2">admin@cafeteria.com / admin123</p>
              <p>cajero@cafeteria.com / cajero123</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Banknote,
  Coffee,
  History,
  LockKeyhole,
  MinusCircle,
  PlusCircle,
  RefreshCcw,
  Wallet,
} from "lucide-react";
import {
  closeCash,
  createCashMovement,
  getCashHistory,
  getCurrentCash,
  openCash,
  type CashMovementType,
  type CashSession,
} from "../services/api";

function toMoney(value: number | string | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function CashPage() {
  const navigate = useNavigate();

  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [history, setHistory] = useState<CashSession[]>([]);
  const [expectedAmount, setExpectedAmount] = useState(0);

  const [openingAmount, setOpeningAmount] = useState(200);
  const [movementType, setMovementType] = useState<CashMovementType>("INCOME");
  const [movementAmount, setMovementAmount] = useState(0);
  const [movementReason, setMovementReason] = useState("");
  const [closingAmount, setClosingAmount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadCashData = useCallback(async () => {
  const token = localStorage.getItem("cafeteria_token");

  if (!token) {
    navigate("/login");
    return;
  }

  try {
    const [currentResponse, historyResponse] = await Promise.all([
      getCurrentCash(token),
      getCashHistory(token),
    ]);

    setCashSession(currentResponse.cashSession);
    setExpectedAmount(currentResponse.expectedAmount ?? 0);
    setClosingAmount(currentResponse.expectedAmount ?? 0);
    setHistory(historyResponse.sessions);
    setErrorMessage("");
  } catch (error) {
    setErrorMessage(
      error instanceof Error ? error.message : "No se pudo cargar la caja",
    );
  } finally {
    setLoading(false);
  }
}, [navigate]);

 useEffect(() => {
  const timeoutId = window.setTimeout(() => {
    void loadCashData();
  }, 0);

  return () => {
    window.clearTimeout(timeoutId);
  };
}, [loadCashData]);

  const cashSalesTotal = useMemo(() => {
    if (!cashSession?.sales) {
      return 0;
    }

    return cashSession.sales.reduce((sum, sale) => {
      return sum + Number(sale.total);
    }, 0);
  }, [cashSession]);

  const incomeTotal = useMemo(() => {
    if (!cashSession?.movements) {
      return 0;
    }

    return cashSession.movements
      .filter((movement) => movement.type === "INCOME")
      .reduce((sum, movement) => sum + Number(movement.amount), 0);
  }, [cashSession]);

  const expenseTotal = useMemo(() => {
    if (!cashSession?.movements) {
      return 0;
    }

    return cashSession.movements
      .filter((movement) => movement.type === "EXPENSE")
      .reduce((sum, movement) => sum + Number(movement.amount), 0);
  }, [cashSession]);

  async function handleOpenCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("cafeteria_token");

    if (!token) {
      navigate("/login");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (openingAmount < 0) {
      setErrorMessage("El monto inicial no puede ser negativo");
      return;
    }

    try {
      setActionLoading(true);

      const response = await openCash(token, openingAmount);
      setSuccessMessage(response.message);

      await loadCashData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo abrir la caja",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("cafeteria_token");

    if (!token) {
      navigate("/login");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (movementAmount <= 0) {
      setErrorMessage("El monto del movimiento debe ser mayor a 0");
      return;
    }

    if (movementReason.trim().length < 3) {
      setErrorMessage("El motivo debe tener al menos 3 caracteres");
      return;
    }

    try {
      setActionLoading(true);

      const response = await createCashMovement(token, {
        type: movementType,
        amount: movementAmount,
        reason: movementReason.trim(),
      });

      setSuccessMessage(response.message);
      setMovementAmount(0);
      setMovementReason("");

      await loadCashData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el movimiento",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCloseCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("cafeteria_token");

    if (!token) {
      navigate("/login");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (closingAmount < 0) {
      setErrorMessage("El monto de cierre no puede ser negativo");
      return;
    }

    try {
      setActionLoading(true);

      const response = await closeCash(token, closingAmount);

      setSuccessMessage(
        `${response.message}. Diferencia: Bs. ${toMoney(response.summary.difference)}`,
      );

      await loadCashData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo cerrar la caja",
      );
    } finally {
      setActionLoading(false);
    }
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
                Control de caja
              </p>
              <h1 className="text-2xl font-black text-stone-900 sm:text-3xl">
                Apertura, movimientos y cierre
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loadCashData}
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

        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl bg-white p-6 text-stone-500 shadow-xl shadow-stone-200/50">
            Cargando información de caja...
          </div>
        ) : (
          <>
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-100/50">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                  <Wallet />
                </div>
                <p className="text-sm font-bold text-stone-500">Estado</p>
                <h2 className="mt-2 text-3xl font-black text-stone-900">
                  {cashSession ? "Abierta" : "Cerrada"}
                </h2>
              </article>

              <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-100/50">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Banknote />
                </div>
                <p className="text-sm font-bold text-stone-500">
                  Efectivo esperado
                </p>
                <h2 className="mt-2 text-3xl font-black text-stone-900">
                  Bs. {toMoney(expectedAmount)}
                </h2>
              </article>

              <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-100/50">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <PlusCircle />
                </div>
                <p className="text-sm font-bold text-stone-500">
                  Ingresos manuales
                </p>
                <h2 className="mt-2 text-3xl font-black text-stone-900">
                  Bs. {toMoney(incomeTotal)}
                </h2>
              </article>

              <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-100/50">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                  <MinusCircle />
                </div>
                <p className="text-sm font-bold text-stone-500">
                  Egresos manuales
                </p>
                <h2 className="mt-2 text-3xl font-black text-stone-900">
                  Bs. {toMoney(expenseTotal)}
                </h2>
              </article>
            </section>

            {!cashSession ? (
              <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                    <Wallet />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-stone-900">
                      Abrir caja
                    </h2>
                    <p className="text-sm text-stone-500">
                      Ingresa el monto inicial disponible en efectivo.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleOpenCash}
                  className="grid gap-4 md:grid-cols-[1fr_auto]"
                >
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-stone-700">
                      Monto inicial
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={openingAmount}
                      onChange={(event) =>
                        setOpeningAmount(Number(event.target.value))
                      }
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="self-end rounded-2xl bg-orange-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {actionLoading ? "Abriendo..." : "Abrir caja"}
                  </button>
                </form>
              </section>
            ) : (
              <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
                  <h2 className="text-xl font-black text-stone-900">
                    Caja actual
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Apertura: {formatDate(cashSession.openedAt)}
                  </p>

                  <div className="mt-5 grid gap-3">
                    <div className="flex justify-between rounded-2xl bg-stone-50 p-4 text-sm">
                      <span className="font-bold text-stone-500">
                        Monto inicial
                      </span>
                      <span className="font-black text-stone-900">
                        Bs. {toMoney(cashSession.openingAmount)}
                      </span>
                    </div>

                    <div className="flex justify-between rounded-2xl bg-stone-50 p-4 text-sm">
                      <span className="font-bold text-stone-500">
                        Ventas en efectivo
                      </span>
                      <span className="font-black text-stone-900">
                        Bs. {toMoney(cashSalesTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between rounded-2xl bg-stone-900 p-4 text-sm text-white">
                      <span className="font-bold text-stone-300">
                        Esperado en caja
                      </span>
                      <span className="font-black">
                        Bs. {toMoney(expectedAmount)}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleCloseCash} className="mt-6 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-stone-700">
                        Monto contado para cierre
                      </span>

                      <input
                        type="number"
                        min="0"
                        value={closingAmount}
                        onChange={(event) =>
                          setClosingAmount(Number(event.target.value))
                        }
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-stone-200 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <LockKeyhole size={18} />
                      {actionLoading ? "Cerrando..." : "Cerrar caja"}
                    </button>
                  </form>
                </article>

                <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
                  <h2 className="text-xl font-black text-stone-900">
                    Registrar movimiento
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Usa ingresos o egresos manuales fuera de ventas.
                  </p>

                  <form onSubmit={handleCreateMovement} className="mt-5 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-stone-700">
                        Tipo
                      </span>

                      <select
                        value={movementType}
                        onChange={(event) =>
                          setMovementType(event.target.value as CashMovementType)
                        }
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
                      >
                        <option value="INCOME">Ingreso</option>
                        <option value="EXPENSE">Egreso</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-stone-700">
                        Monto
                      </span>

                      <input
                        type="number"
                        min="0"
                        value={movementAmount}
                        onChange={(event) =>
                          setMovementAmount(Number(event.target.value))
                        }
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-stone-700">
                        Motivo
                      </span>

                      <input
                        value={movementReason}
                        onChange={(event) =>
                          setMovementReason(event.target.value)
                        }
                        placeholder="Ejemplo: compra de insumo"
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium outline-none focus:border-orange-500"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full rounded-2xl bg-orange-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {actionLoading ? "Registrando..." : "Guardar movimiento"}
                    </button>
                  </form>
                </article>
              </section>
            )}

            <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
                <h2 className="text-xl font-black text-stone-900">
                  Movimientos recientes
                </h2>

                <div className="mt-5 space-y-3">
                  {!cashSession?.movements?.length && (
                    <div className="rounded-2xl bg-stone-100 p-4 text-sm font-semibold text-stone-500">
                      No hay movimientos en la caja actual.
                    </div>
                  )}

                  {cashSession?.movements?.slice(0, 8).map((movement) => (
                    <div
                      key={movement.id}
                      className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4"
                    >
                      <div>
                        <p className="font-black text-stone-900">
                          {movement.reason}
                        </p>
                        <p className="text-xs text-stone-500">
                          {movement.type === "INCOME" ? "Ingreso" : "Egreso"} ·{" "}
                          {formatDate(movement.createdAt)}
                        </p>
                      </div>

                      <span
                        className={`font-black ${
                          movement.type === "INCOME"
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {movement.type === "INCOME" ? "+" : "-"} Bs.{" "}
                        {toMoney(movement.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                    <History />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-stone-900">
                      Historial de cajas
                    </h2>
                    <p className="text-sm text-stone-500">
                      Últimas sesiones registradas.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {history.length === 0 && (
                    <div className="rounded-2xl bg-stone-100 p-4 text-sm font-semibold text-stone-500">
                      Todavía no hay historial.
                    </div>
                  )}

                  {history.slice(0, 8).map((session) => (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-stone-100 bg-stone-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-stone-900">
                            {session.status === "OPEN" ? "Abierta" : "Cerrada"}
                          </p>
                          <p className="text-xs text-stone-500">
                            {formatDate(session.openedAt)}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            session.status === "OPEN"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-stone-200 text-stone-700"
                          }`}
                        >
                          {session.status}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-600">
                        <div>
                          Inicial:{" "}
                          <strong>Bs. {toMoney(session.openingAmount)}</strong>
                        </div>
                        <div>
                          Esperado:{" "}
                          <strong>Bs. {toMoney(session.expectedAmount)}</strong>
                        </div>
                        <div>
                          Cierre:{" "}
                          <strong>Bs. {toMoney(session.closingAmount)}</strong>
                        </div>
                        <div>
                          Diferencia:{" "}
                          <strong>Bs. {toMoney(session.difference)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

export default CashPage;
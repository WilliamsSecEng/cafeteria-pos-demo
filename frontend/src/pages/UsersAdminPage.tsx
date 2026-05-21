import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Coffee,
  Edit3,
  PlusCircle,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import {
  createUser,
  deleteUser,
  getRoles,
  getUsers,
  updateUser,
  updateUserStatus,
  type Role,
  type SystemUser,
  type User,
  type UserPayload,
} from "../services/api";

type UserFormState = {
  fullName: string;
  email: string;
  password: string;
  roleId: string;
  isActive: boolean;
};

const emptyForm: UserFormState = {
  fullName: "",
  email: "",
  password: "",
  roleId: "",
  isActive: true,
};

function formatDate(value: string | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function toFormState(user: SystemUser): UserFormState {
  return {
    fullName: user.fullName,
    email: user.email,
    password: "",
    roleId: user.roleId,
    isActive: user.isActive,
  };
}

function UsersAdminPage() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const token = localStorage.getItem("cafeteria_token");

  const loadData = useCallback(async () => {
    const storedToken = localStorage.getItem("cafeteria_token");
    const storedUser = localStorage.getItem("cafeteria_user");

    if (!storedToken || !storedUser) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser) as User;
    setCurrentUser(parsedUser);

    if (parsedUser.role !== "ADMIN") {
      setErrorMessage("Solo el administrador puede gestionar usuarios.");
      setLoading(false);
      return;
    }

    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        getUsers(storedToken, {
          active: showInactive ? false : undefined,
        }),
        getRoles(storedToken),
      ]);

      setUsers(usersResponse.users);
      setRoles(rolesResponse.roles);

      if (!form.roleId && rolesResponse.roles.length > 0) {
        const cashierRole =
          rolesResponse.roles.find((role) => role.name === "CASHIER") ??
          rolesResponse.roles[0];

        setForm((current) => ({
          ...current,
          roleId: cashierRole?.id ?? "",
        }));
      }

      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los usuarios",
      );
    } finally {
      setLoading(false);
    }
  }, [form.roleId, navigate, showInactive]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.fullName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role.name.toLowerCase().includes(query)
      );
    });
  }, [search, users]);

  function resetForm() {
    const cashierRole =
      roles.find((role) => role.name === "CASHIER") ?? roles[0];

    setEditingUser(null);
    setForm({
      ...emptyForm,
      roleId: cashierRole?.id ?? "",
    });
  }

  function handleEdit(user: SystemUser) {
    setEditingUser(user);
    setForm(toFormState(user));
    setErrorMessage("");
    setSuccessMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function validateForm() {
    if (!form.fullName.trim()) {
      return "El nombre completo es obligatorio";
    }

    if (form.fullName.trim().length < 3) {
      return "El nombre debe tener al menos 3 caracteres";
    }

    if (!form.email.trim()) {
      return "El correo electrónico es obligatorio";
    }

    if (!form.email.includes("@")) {
      return "El correo electrónico no es válido";
    }

    if (!form.roleId) {
      return "Selecciona un rol";
    }

    if (!editingUser && form.password.length < 6) {
      return "La contraseña debe tener al menos 6 caracteres";
    }

    if (editingUser && form.password && form.password.length < 6) {
      return "La nueva contraseña debe tener al menos 6 caracteres";
    }

    return "";
  }

  function buildCreatePayload(): UserPayload {
    return {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      roleId: form.roleId,
      isActive: form.isActive,
    };
  }

  function buildUpdatePayload(): Partial<UserPayload> {
    const payload: Partial<UserPayload> = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      roleId: form.roleId,
      isActive: form.isActive,
    };

    if (form.password.trim()) {
      payload.password = form.password;
    }

    return payload;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      navigate("/login");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const validationMessage = validateForm();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    try {
      setActionLoading(true);

      if (editingUser) {
        const response = await updateUser(
          token,
          editingUser.id,
          buildUpdatePayload(),
        );

        setSuccessMessage(response.message);
      } else {
        const response = await createUser(token, buildCreatePayload());
        setSuccessMessage(response.message);
      }

      resetForm();
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el usuario",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleStatus(user: SystemUser) {
    if (!token) {
      navigate("/login");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (currentUser?.id === user.id) {
      setErrorMessage("No puedes inactivar tu propio usuario.");
      return;
    }

    try {
      setActionLoading(true);

      const response = await updateUserStatus(token, user.id, !user.isActive);
      setSuccessMessage(response.message);

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado del usuario",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(user: SystemUser) {
    if (!token) {
      navigate("/login");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (currentUser?.id === user.id) {
      setErrorMessage("No puedes eliminar tu propio usuario.");
      return;
    }

    const salesCount = user._count?.sales ?? 0;
    const cashSessionsCount = user._count?.cashSessions ?? 0;

    const confirmed = window.confirm(
      salesCount > 0 || cashSessionsCount > 0
        ? `El usuario "${user.fullName}" tiene ventas o cajas asociadas. No se podrá eliminar, solo inactivar. ¿Quieres intentarlo de todos modos?`
        : `¿Eliminar el usuario "${user.fullName}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);

      const response = await deleteUser(token, user.id);
      setSuccessMessage(response.message);

      if (editingUser?.id === user.id) {
        resetForm();
      }

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el usuario",
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-stone-100 px-4">
        <div className="rounded-3xl bg-white p-8 text-center shadow-xl shadow-orange-100/60">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-600 text-white">
            <UserCog size={34} />
          </div>
          <p className="font-bold text-stone-600">Cargando usuarios...</p>
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
                Administración
              </p>
              <h1 className="text-2xl font-black text-stone-900 sm:text-3xl">
                Gestión de usuarios
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Crea cajeros, administradores y controla accesos.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void loadData()}
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

        {currentUser?.role !== "ADMIN" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            Solo el usuario administrador puede gestionar usuarios.
          </div>
        )}

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

        {currentUser?.role === "ADMIN" && (
          <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-stone-900">
                    {editingUser ? "Editar usuario" : "Nuevo usuario"}
                  </h2>
                  <p className="text-sm text-stone-500">
                    Define credenciales, rol y estado de acceso.
                  </p>
                </div>

                {editingUser && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex items-center gap-2 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-700 hover:bg-stone-200"
                  >
                    <X size={17} />
                    Cancelar
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-stone-700">
                    Nombre completo
                  </span>
                  <input
                    value={form.fullName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium outline-none focus:border-orange-500"
                    placeholder="Ejemplo: Cajero Turno Mañana"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-stone-700">
                    Correo electrónico
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium outline-none focus:border-orange-500"
                    placeholder="usuario@cafeteria.com"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-stone-700">
                      Rol
                    </span>
                    <select
                      value={form.roleId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          roleId: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex cursor-pointer items-center justify-between self-end rounded-2xl bg-stone-50 px-4 py-3">
                    <span className="text-sm font-bold text-stone-700">
                      Usuario activo
                    </span>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          isActive: event.target.checked,
                        }))
                      }
                      className="h-5 w-5 accent-orange-600"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-stone-700">
                    {editingUser
                      ? "Nueva contraseña opcional"
                      : "Contraseña"}
                  </span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium outline-none focus:border-orange-500"
                    placeholder={
                      editingUser
                        ? "Dejar vacío para no cambiar"
                        : "Mínimo 6 caracteres"
                    }
                  />
                </label>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {editingUser ? <Save size={18} /> : <PlusCircle size={18} />}
                  {actionLoading
                    ? "Guardando..."
                    : editingUser
                      ? "Guardar cambios"
                      : "Crear usuario"}
                </button>
              </form>
            </article>

            <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-stone-900">
                    Usuarios registrados
                  </h2>
                  <p className="text-sm text-stone-500">
                    {filteredUsers.length} usuarios encontrados.
                  </p>
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-700">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(event) => setShowInactive(event.target.checked)}
                    className="h-4 w-4 accent-orange-600"
                  />
                  Ver inactivos
                </label>
              </div>

              <div className="mb-5 flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <Search size={19} className="text-stone-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre, correo o rol..."
                  className="w-full bg-transparent text-sm font-medium outline-none"
                />
              </div>

              <div className="space-y-3">
                {filteredUsers.length === 0 && (
                  <div className="rounded-2xl bg-stone-100 p-4 text-sm font-semibold text-stone-500">
                    No hay usuarios para mostrar.
                  </div>
                )}

                {filteredUsers.map((user) => {
                  const salesCount = user._count?.sales ?? 0;
                  const cashSessionsCount = user._count?.cashSessions ?? 0;
                  const isSelf = currentUser?.id === user.id;

                  return (
                    <div
                      key={user.id}
                      className="rounded-2xl border border-stone-100 bg-stone-50 p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-stone-900">
                              {user.fullName}
                            </p>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                user.isActive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {user.isActive ? "Activo" : "Inactivo"}
                            </span>

                            {isSelf && (
                              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
                                Tu usuario
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm text-stone-500">
                            {user.email}
                          </p>

                          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                            <span className="rounded-xl bg-white px-3 py-2 font-bold text-stone-700">
                              Rol: {user.role.name}
                            </span>

                            <span className="rounded-xl bg-white px-3 py-2 font-bold text-stone-700">
                              Creado: {formatDate(user.createdAt)}
                            </span>

                            <span className="rounded-xl bg-white px-3 py-2 font-bold text-stone-700">
                              Ventas: {salesCount}
                            </span>

                            <span className="rounded-xl bg-white px-3 py-2 font-bold text-stone-700">
                              Cajas: {cashSessionsCount}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(user)}
                            className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                          >
                            <Edit3 size={16} />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(user)}
                            disabled={isSelf}
                            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
                              user.isActive
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {user.isActive ? (
                              <ToggleLeft size={16} />
                            ) : (
                              <ToggleRight size={16} />
                            )}
                            {user.isActive ? "Inactivar" : "Activar"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(user)}
                            disabled={isSelf}
                            className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>
        )}

        {currentUser?.role === "ADMIN" && (
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                <ShieldCheck />
              </div>

              <div>
                <h2 className="text-xl font-black text-stone-900">
                  Roles disponibles
                </h2>
                <p className="text-sm text-stone-500">
                  Roles cargados en la base de datos.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-2xl border border-stone-100 bg-stone-50 p-4"
                >
                  <p className="font-black text-stone-900">{role.name}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    Usuarios asociados: {role._count?.users ?? 0}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default UsersAdminPage;
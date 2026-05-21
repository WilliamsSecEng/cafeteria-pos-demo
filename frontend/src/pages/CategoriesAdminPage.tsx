import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Coffee,
  Edit3,
  FolderKanban,
  PlusCircle,
  RefreshCcw,
  Save,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  updateCategoryStatus,
  type Category,
  type CategoryPayload,
  type User,
} from "../services/api";

type CategoryFormState = {
  name: string;
  description: string;
  displayOrder: string;
  isActive: boolean;
};

const emptyForm: CategoryFormState = {
  name: "",
  description: "",
  displayOrder: "0",
  isActive: true,
};

function toFormState(category: Category): CategoryFormState {
  return {
    name: category.name,
    description: category.description ?? "",
    displayOrder: String(category.displayOrder ?? 0),
    isActive: category.isActive,
  };
}

function CategoriesAdminPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

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
    setUser(parsedUser);

    if (parsedUser.role !== "ADMIN") {
      setErrorMessage("Solo el administrador puede gestionar categorías.");
      setLoading(false);
      return;
    }

    try {
      const categoriesResponse = await getCategories({
        active: showInactive ? false : undefined,
      });

      setCategories(categoriesResponse.categories);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las categorías",
      );
    } finally {
      setLoading(false);
    }
  }, [navigate, showInactive]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadData]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return categories;
    }

    return categories.filter((category) => {
      return (
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query) ||
        (category.description ?? "").toLowerCase().includes(query)
      );
    });
  }, [categories, search]);

  function resetForm() {
    setEditingCategory(null);
    setForm(emptyForm);
  }

  function handleEdit(category: Category) {
    setEditingCategory(category);
    setForm(toFormState(category));
    setErrorMessage("");
    setSuccessMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function buildPayload(): CategoryPayload {
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      displayOrder: Number(form.displayOrder),
      isActive: form.isActive,
    };
  }

  function validateForm() {
    if (!form.name.trim()) {
      return "El nombre de la categoría es obligatorio";
    }

    if (form.name.trim().length < 2) {
      return "El nombre debe tener al menos 2 caracteres";
    }

    if (Number(form.displayOrder) < 0) {
      return "El orden no puede ser negativo";
    }

    return "";
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

      const payload = buildPayload();

      if (editingCategory) {
        const response = await updateCategory(token, editingCategory.id, payload);
        setSuccessMessage(response.message);
      } else {
        const response = await createCategory(token, payload);
        setSuccessMessage(response.message);
      }

      resetForm();
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la categoría",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleStatus(category: Category) {
    if (!token) {
      navigate("/login");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      setActionLoading(true);

      const response = await updateCategoryStatus(
        token,
        category.id,
        !category.isActive,
      );

      setSuccessMessage(response.message);
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado de la categoría",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(category: Category) {
    if (!token) {
      navigate("/login");
      return;
    }

    const productsCount = category._count?.products ?? 0;

    const confirmed = window.confirm(
      productsCount > 0
        ? `La categoría "${category.name}" tiene ${productsCount} productos asociados. No se podrá eliminar, solo inactivar. ¿Quieres intentarlo de todos modos?`
        : `¿Eliminar la categoría "${category.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      setActionLoading(true);

      const response = await deleteCategory(token, category.id);
      setSuccessMessage(response.message);

      if (editingCategory?.id === category.id) {
        resetForm();
      }

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la categoría",
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
            <FolderKanban size={34} />
          </div>
          <p className="font-bold text-stone-600">Cargando categorías...</p>
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
                Gestión de categorías
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Organiza productos por cafés, bebidas, postres, comidas y más.
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

        {user?.role !== "ADMIN" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            Solo el usuario administrador puede gestionar categorías.
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

        {user?.role === "ADMIN" && (
          <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-stone-900">
                    {editingCategory ? "Editar categoría" : "Nueva categoría"}
                  </h2>
                  <p className="text-sm text-stone-500">
                    Define el nombre, descripción y orden de visualización.
                  </p>
                </div>

                {editingCategory && (
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
                    Nombre
                  </span>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium outline-none focus:border-orange-500"
                    placeholder="Ejemplo: Promociones"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-stone-700">
                    Descripción
                  </span>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium outline-none focus:border-orange-500"
                    placeholder="Descripción breve de la categoría"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-stone-700">
                      Orden
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={form.displayOrder}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          displayOrder: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between self-end rounded-2xl bg-stone-50 px-4 py-3">
                    <span className="text-sm font-bold text-stone-700">
                      Categoría activa
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

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {editingCategory ? <Save size={18} /> : <PlusCircle size={18} />}
                  {actionLoading
                    ? "Guardando..."
                    : editingCategory
                      ? "Guardar cambios"
                      : "Crear categoría"}
                </button>
              </form>
            </article>

            <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-stone-900">
                    Categorías registradas
                  </h2>
                  <p className="text-sm text-stone-500">
                    {filteredCategories.length} categorías encontradas.
                  </p>
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-700">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(event) => setShowInactive(event.target.checked)}
                    className="h-4 w-4 accent-orange-600"
                  />
                  Ver inactivas
                </label>
              </div>

              <div className="mb-5 flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <Search size={19} className="text-stone-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre, slug o descripción..."
                  className="w-full bg-transparent text-sm font-medium outline-none"
                />
              </div>

              <div className="space-y-3">
                {filteredCategories.length === 0 && (
                  <div className="rounded-2xl bg-stone-100 p-4 text-sm font-semibold text-stone-500">
                    No hay categorías para mostrar.
                  </div>
                )}

                {filteredCategories.map((category) => {
                  const productsCount = category._count?.products ?? 0;

                  return (
                    <div
                      key={category.id}
                      className="rounded-2xl border border-stone-100 bg-stone-50 p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-stone-900">
                              {category.name}
                            </p>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                category.isActive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {category.isActive ? "Activa" : "Inactiva"}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-stone-500">
                            Slug: {category.slug}
                          </p>

                          <p className="mt-2 text-sm text-stone-600">
                            {category.description || "Sin descripción"}
                          </p>

                          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                            <span className="rounded-xl bg-white px-3 py-2 font-bold text-stone-700">
                              Orden: {category.displayOrder}
                            </span>

                            <span className="rounded-xl bg-white px-3 py-2 font-bold text-stone-700">
                              Productos: {productsCount}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(category)}
                            className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                          >
                            <Edit3 size={16} />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(category)}
                            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                              category.isActive
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {category.isActive ? (
                              <ToggleLeft size={16} />
                            ) : (
                              <ToggleRight size={16} />
                            )}
                            {category.isActive ? "Inactivar" : "Activar"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(category)}
                            className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
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
      </section>
    </main>
  );
}

export default CategoriesAdminPage;
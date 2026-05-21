import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Coffee,
  Edit3,
  Package,
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
  createProduct,
  deleteProduct,
  getCategories,
  getProducts,
  updateProduct,
  updateProductStatus,
  type Category,
  type Product,
  type ProductPayload,
  type User,
} from "../services/api";

type ProductFormState = {
  name: string;
  description: string;
  sku: string;
  price: string;
  cost: string;
  imageUrl: string;
  stock: string;
  minStock: string;
  trackStock: boolean;
  isActive: boolean;
  categoryId: string;
};

const emptyForm: ProductFormState = {
  name: "",
  description: "",
  sku: "",
  price: "",
  cost: "",
  imageUrl: "",
  stock: "0",
  minStock: "0",
  trackStock: false,
  isActive: true,
  categoryId: "",
};

function toMoney(value: number | string | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

function toFormState(product: Product): ProductFormState {
  return {
    name: product.name,
    description: product.description ?? "",
    sku: product.sku ?? "",
    price: String(product.price ?? ""),
    cost: product.cost !== null && product.cost !== undefined ? String(product.cost) : "",
    imageUrl: product.imageUrl ?? "",
    stock: String(product.stock ?? 0),
    minStock: String(product.minStock ?? 0),
    trackStock: product.trackStock,
    isActive: product.isActive,
    categoryId: product.categoryId,
  };
}

function ProductsAdminPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
      setErrorMessage("Solo el administrador puede gestionar productos.");
      setLoading(false);
      return;
    }

    try {
      const [productsResponse, categoriesResponse] = await Promise.all([
        getProducts({
          active: showInactive ? false : undefined,
        }),
        getCategories(),
      ]);

      setProducts(productsResponse.products);
      setCategories(categoriesResponse.categories);

      if (!form.categoryId && categoriesResponse.categories.length > 0) {
        setForm((current) => ({
          ...current,
          categoryId: categoriesResponse.categories[0]?.id ?? "",
        }));
      }

      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los productos",
      );
    } finally {
      setLoading(false);
    }
  }, [form.categoryId, navigate, showInactive]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        product.category.name.toLowerCase().includes(query) ||
        (product.sku ?? "").toLowerCase().includes(query)
      );
    });
  }, [products, search]);

  function resetForm() {
    setEditingProduct(null);
    setForm({
      ...emptyForm,
      categoryId: categories[0]?.id ?? "",
    });
  }

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setForm(toFormState(product));
    setErrorMessage("");
    setSuccessMessage("");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function buildPayload(): ProductPayload {
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      sku: form.sku.trim() || null,
      price: Number(form.price),
      cost: form.cost.trim() ? Number(form.cost) : null,
      imageUrl: form.imageUrl.trim() || null,
      stock: Number(form.stock),
      minStock: Number(form.minStock),
      trackStock: form.trackStock,
      isActive: form.isActive,
      categoryId: form.categoryId,
    };
  }

  function validateForm() {
    if (!form.name.trim()) {
      return "El nombre del producto es obligatorio";
    }

    if (!form.categoryId) {
      return "Selecciona una categoría";
    }

    if (!form.price || Number(form.price) <= 0) {
      return "El precio debe ser mayor a 0";
    }

    if (form.cost.trim() && Number(form.cost) < 0) {
      return "El costo no puede ser negativo";
    }

    if (Number(form.stock) < 0) {
      return "El stock no puede ser negativo";
    }

    if (Number(form.minStock) < 0) {
      return "El stock mínimo no puede ser negativo";
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

      if (editingProduct) {
        const response = await updateProduct(token, editingProduct.id, payload);
        setSuccessMessage(response.message);
      } else {
        const response = await createProduct(token, payload);
        setSuccessMessage(response.message);
      }

      resetForm();
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el producto",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleStatus(product: Product) {
    if (!token) {
      navigate("/login");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      setActionLoading(true);

      const response = await updateProductStatus(
        token,
        product.id,
        !product.isActive,
      );

      setSuccessMessage(response.message);
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado del producto",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!token) {
      navigate("/login");
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar el producto "${product.name}"? Solo se podrá eliminar si no tiene ventas registradas.`,
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      setActionLoading(true);

      const response = await deleteProduct(token, product.id);
      setSuccessMessage(response.message);

      if (editingProduct?.id === product.id) {
        resetForm();
      }

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el producto",
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
            <Package size={34} />
          </div>
          <p className="font-bold text-stone-600">Cargando productos...</p>
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
                Gestión de productos
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Crear, editar, activar, inactivar y controlar stock.
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
            Solo el usuario administrador puede gestionar productos.
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
          <>
            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-stone-900">
                      {editingProduct ? "Editar producto" : "Nuevo producto"}
                    </h2>
                    <p className="text-sm text-stone-500">
                      Completa los datos comerciales del producto.
                    </p>
                  </div>

                  {editingProduct && (
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
                      placeholder="Ejemplo: Latte vainilla"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-stone-700">
                        Categoría
                      </span>
                      <select
                        value={form.categoryId}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            categoryId: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-stone-700">
                        SKU / Código
                      </span>
                      <input
                        value={form.sku}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            sku: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium outline-none focus:border-orange-500"
                        placeholder="Ejemplo: CAF-010"
                      />
                    </label>
                  </div>

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
                      placeholder="Descripción breve del producto"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-stone-700">
                        Precio de venta
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            price: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
                        placeholder="0.00"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-stone-700">
                        Costo
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.cost}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            cost: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
                        placeholder="Opcional"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-stone-700">
                        Stock
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={form.stock}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            stock: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-stone-700">
                        Stock mínimo
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={form.minStock}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            minStock: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-stone-700">
                      URL de imagen
                    </span>
                    <input
                      value={form.imageUrl}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          imageUrl: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium outline-none focus:border-orange-500"
                      placeholder="Opcional"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                      <span className="text-sm font-bold text-stone-700">
                        Controlar stock
                      </span>
                      <input
                        type="checkbox"
                        checked={form.trackStock}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            trackStock: event.target.checked,
                          }))
                        }
                        className="h-5 w-5 accent-orange-600"
                      />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                      <span className="text-sm font-bold text-stone-700">
                        Producto activo
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
                    {editingProduct ? <Save size={18} /> : <PlusCircle size={18} />}
                    {actionLoading
                      ? "Guardando..."
                      : editingProduct
                        ? "Guardar cambios"
                        : "Crear producto"}
                  </button>
                </form>
              </article>

              <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-stone-900">
                      Catálogo
                    </h2>
                    <p className="text-sm text-stone-500">
                      {filteredProducts.length} productos encontrados.
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
                    placeholder="Buscar por nombre, categoría o SKU..."
                    className="w-full bg-transparent text-sm font-medium outline-none"
                  />
                </div>

                <div className="space-y-3">
                  {filteredProducts.length === 0 && (
                    <div className="rounded-2xl bg-stone-100 p-4 text-sm font-semibold text-stone-500">
                      No hay productos para mostrar.
                    </div>
                  )}

                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-2xl border border-stone-100 bg-stone-50 p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-stone-900">
                              {product.name}
                            </p>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                product.isActive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {product.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-stone-500">
                            {product.category.name} · SKU: {product.sku ?? "Sin SKU"}
                          </p>

                          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                            <span className="rounded-xl bg-white px-3 py-2 font-bold text-stone-700">
                              Precio: Bs. {toMoney(product.price)}
                            </span>

                            <span className="rounded-xl bg-white px-3 py-2 font-bold text-stone-700">
                              Costo: Bs. {toMoney(product.cost)}
                            </span>

                            <span className="rounded-xl bg-white px-3 py-2 font-bold text-stone-700">
                              Stock:{" "}
                              {product.trackStock
                                ? product.stock
                                : "Sin control"}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(product)}
                            className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                          >
                            <Edit3 size={16} />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(product)}
                            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                              product.isActive
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {product.isActive ? (
                              <ToggleLeft size={16} />
                            ) : (
                              <ToggleRight size={16} />
                            )}
                            {product.isActive ? "Inactivar" : "Activar"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(product)}
                            className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                          >
                            <Trash2 size={16} />
                            Eliminar
                          </button>
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

export default ProductsAdminPage;
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Coffee,
  Minus,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { createSale, getProducts, type Product } from "../services/api";

type CartItem = {
  product: Product;
  quantity: number;
};

type PaymentMethod = "CASH" | "QR" | "CARD" | "MIXED";

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function productPrice(product: Product) {
  return Number(product.price);
}

function SalesPage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountPaid, setAmountPaid] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadProducts() {
      const token = localStorage.getItem("cafeteria_token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await getProducts();
        setProducts(response.products);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "No se pudieron cargar los productos",
        );
      } finally {
        setLoadingProducts(false);
      }
    }

    loadProducts();
  }, [navigate]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        product.category.name.toLowerCase().includes(query)
      );
    });
  }, [products, search]);

  const subtotal = useMemo(() => {
    return money(
      cart.reduce((sum, item) => {
        return sum + productPrice(item.product) * item.quantity;
      }, 0),
    );
  }, [cart]);

  const total = useMemo(() => {
    return money(Math.max(subtotal - discount, 0));
  }, [subtotal, discount]);

  const changeAmount = useMemo(() => {
    return money(Math.max(amountPaid - total, 0));
  }, [amountPaid, total]);

  function addToCart(product: Product) {
    setErrorMessage("");
    setSuccessMessage("");

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.product.id === product.id);

      if (existingItem) {
        return currentCart.map((item) => {
          if (item.product.id !== product.id) {
            return item;
          }

          const newQuantity = item.quantity + 1;

          if (product.trackStock && newQuantity > product.stock) {
            setErrorMessage(`Stock insuficiente para ${product.name}`);
            return item;
          }

          return {
            ...item,
            quantity: newQuantity,
          };
        });
      }

      if (product.trackStock && product.stock <= 0) {
        setErrorMessage(`Sin stock disponible para ${product.name}`);
        return currentCart;
      }

      return [
        ...currentCart,
        {
          product,
          quantity: 1,
        },
      ];
    });
  }

  function increaseQuantity(productId: string) {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }

        const newQuantity = item.quantity + 1;

        if (item.product.trackStock && newQuantity > item.product.stock) {
          setErrorMessage(`Stock insuficiente para ${item.product.name}`);
          return item;
        }

        return {
          ...item,
          quantity: newQuantity,
        };
      }),
    );
  }

  function decreaseQuantity(productId: string) {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.product.id !== productId) {
            return item;
          }

          return {
            ...item,
            quantity: item.quantity - 1,
          };
        })
        .filter((item) => item.quantity > 0),
    );
  }

  function removeItem(productId: string) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.product.id !== productId),
    );
  }

  async function handleCreateSale() {
    const token = localStorage.getItem("cafeteria_token");

    if (!token) {
      navigate("/login");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (cart.length === 0) {
      setErrorMessage("Agrega al menos un producto al carrito");
      return;
    }

    if (discount > subtotal) {
      setErrorMessage("El descuento no puede ser mayor al subtotal");
      return;
    }

    if (amountPaid < total) {
      setErrorMessage("El monto pagado no puede ser menor al total");
      return;
    }

    try {
      setLoading(true);

      const response = await createSale(token, {
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        paymentMethod,
        amountPaid,
        discount,
        notes: notes.trim() || undefined,
      });

      setSuccessMessage(
        `Venta ${response.sale.saleNumber} registrada correctamente. Total: Bs. ${response.sale.total}`,
      );

      setCart([]);
      setAmountPaid(0);
      setDiscount(0);
      setNotes("");

      const productsResponse = await getProducts();
      setProducts(productsResponse.products);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo registrar la venta",
      );
    } finally {
      setLoading(false);
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
                Punto de venta
              </p>
              <h1 className="text-2xl font-black text-stone-900 sm:text-3xl">
                Registrar venta
              </h1>
            </div>
          </div>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-stone-700"
          >
            <ArrowLeft size={18} />
            Volver al panel
          </Link>
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

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-stone-900">
                  Productos
                </h2>
                <p className="text-sm text-stone-500">
                  Selecciona productos para agregarlos al carrito.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 md:w-80">
                <Search size={19} className="text-stone-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full bg-transparent text-sm font-medium outline-none"
                />
              </div>
            </div>

            {loadingProducts ? (
              <div className="rounded-2xl bg-stone-100 p-5 text-stone-500">
                Cargando productos...
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => {
                  const disabled = product.trackStock && product.stock <= 0;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => addToCart(product)}
                      className="rounded-3xl border border-orange-100 bg-orange-50/50 p-5 text-left transition hover:-translate-y-0.5 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black text-stone-900">
                            {product.name}
                          </h3>
                          <p className="mt-1 text-sm text-stone-500">
                            {product.category.name}
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-orange-700">
                          Bs. {productPrice(product)}
                        </span>
                      </div>

                      {product.trackStock ? (
                        <p className="text-xs font-bold text-stone-500">
                          Stock: {product.stock}
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-stone-500">
                          Sin control de stock
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </article>

          <aside className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/50">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                <ShoppingCart />
              </div>
              <div>
                <h2 className="text-xl font-black text-stone-900">Carrito</h2>
                <p className="text-sm text-stone-500">Detalle de la venta</p>
              </div>
            </div>

            <div className="space-y-3">
              {cart.length === 0 && (
                <div className="rounded-2xl bg-stone-100 p-4 text-sm font-semibold text-stone-500">
                  No hay productos agregados.
                </div>
              )}

              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="rounded-2xl border border-stone-100 bg-stone-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-stone-900">
                        {item.product.name}
                      </p>
                      <p className="text-sm text-stone-500">
                        Bs. {productPrice(item.product)} c/u
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id)}
                      className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => decreaseQuantity(item.product.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-stone-700"
                      >
                        <Minus size={16} />
                      </button>

                      <span className="w-8 text-center font-black">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => increaseQuantity(item.product.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-stone-700"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <p className="font-black text-stone-900">
                      Bs. {money(productPrice(item.product) * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-4 border-t border-stone-100 pt-5">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-stone-700">
                  Método de pago
                </span>
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as PaymentMethod)
                  }
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="QR">QR</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="MIXED">Mixto</option>
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-stone-700">
                    Descuento
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(event) => setDiscount(Number(event.target.value))}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-stone-700">
                    Monto pagado
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={amountPaid}
                    onChange={(event) =>
                      setAmountPaid(Number(event.target.value))
                    }
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-stone-700">
                  Nota opcional
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium outline-none focus:border-orange-500"
                  placeholder="Ejemplo: Cliente frecuente..."
                />
              </label>

              <div className="rounded-2xl bg-stone-900 p-5 text-white">
                <div className="flex justify-between text-sm text-stone-300">
                  <span>Subtotal</span>
                  <span>Bs. {subtotal}</span>
                </div>

                <div className="mt-2 flex justify-between text-sm text-stone-300">
                  <span>Descuento</span>
                  <span>Bs. {discount}</span>
                </div>

                <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-xl font-black">
                  <span>Total</span>
                  <span>Bs. {total}</span>
                </div>

                <div className="mt-2 flex justify-between text-sm text-emerald-300">
                  <span>Cambio</span>
                  <span>Bs. {changeAmount}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleCreateSale}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <ReceiptText size={19} />
                {loading ? "Registrando..." : "Registrar venta"}
              </button>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

export default SalesPage;
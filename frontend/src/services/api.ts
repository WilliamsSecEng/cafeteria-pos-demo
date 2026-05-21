const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export type User = {
  id: string;
  fullName: string;
  email: string;
  role: string;
};
export type Role = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    users: number;
  };
};

export type SystemUser = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  roleId: string;
  role: {
    id: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    sales: number;
    cashSessions: number;
  };
};

export type UserPayload = {
  fullName: string;
  email: string;
  password: string;
  roleId: string;
  isActive: boolean;
};
export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: number | string;
  cost: number | string | null;
  imageUrl: string | null;
  stock: number;
  minStock: number;
  trackStock: boolean;
  isActive: boolean;
  categoryId: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt?: string;
  updatedAt?: string;
};
export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  _count?: {
    products: number;
  };
};
export type CategoryPayload = {
  name: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
};
export type ProductPayload = {
  name: string;
  description?: string | null;
  sku?: string | null;
  price: number;
  cost?: number | null;
  imageUrl?: string | null;
  stock: number;
  minStock: number;
  trackStock: boolean;
  isActive: boolean;
  categoryId: string;
};

export type CashMovementType = "INCOME" | "EXPENSE";
export type CashSessionStatus = "OPEN" | "CLOSED";

export type CashMovement = {
  id: string;
  type: CashMovementType;
  amount: number | string;
  reason: string;
  createdAt: string;
};

export type CashSession = {
  id: string;
  openingAmount: number | string;
  closingAmount: number | string | null;
  expectedAmount: number | string | null;
  difference: number | string | null;
  status: CashSessionStatus;
  openedAt: string;
  closedAt: string | null;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
  movements?: CashMovement[];
  sales?: Array<{
    id: string;
    saleNumber: string;
    total: number | string;
    paymentMethod: string;
    createdAt: string;
  }>;
  _count?: {
    sales: number;
    movements: number;
  };
};

export type PaymentMethod = "CASH" | "QR" | "CARD" | "MIXED";

export type SalesReport = {
  ok: boolean;
  range: {
    from: string;
    to: string;
  };
  summary: {
    totalSales: number;
    totalAmount: number;
    totalDiscount: number;
    totalItems: number;
    averageTicket: number;
  };
  paymentMethods: Array<{
    method: PaymentMethod;
    salesCount: number;
    totalAmount: number;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    category: string;
    quantity: number;
    totalAmount: number;
  }>;
  latestSales: Array<{
    id: string;
    saleNumber: string;
    total: number;
    paymentMethod: PaymentMethod;
    createdAt: string;
    cashier: {
      id: string;
      fullName: string;
      email: string;
    };
    itemsCount: number;
  }>;
};

type LoginPayload = {
  email: string;
  password: string;
};

type LoginResponse = {
  ok: boolean;
  message: string;
  token: string;
  user: User;
};

type CreateSalePayload = {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  discount: number;
  notes?: string;
};

type ApiErrorResponse = {
  ok: false;
  message?: string;
  errors?: unknown;
};

async function requestJson<T extends object>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const data = (await response.json()) as T | ApiErrorResponse;

  if (!response.ok) {
    throw new Error(
      "message" in data && data.message
        ? data.message
        : "Error inesperado en la solicitud",
    );
  }

  return data as T;
}

export async function getHealth() {
  return requestJson<{
    ok: boolean;
    service: string;
    database: string;
    roles: number;
    products: number;
  }>("/health");
}

export async function login(payload: LoginPayload) {
  return requestJson<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getTodaySummary(token: string) {
  return requestJson<{
    ok: boolean;
    summary: {
      totalSales: number;
      totalAmount: number;
      totalItems: number;
    };
  }>("/sales/today-summary", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getProducts(options?: {
  search?: string;
  categoryId?: string;
  active?: boolean;
}) {
  const params = new URLSearchParams();

  if (options?.search) {
    params.set("search", options.search);
  }

  if (options?.categoryId) {
    params.set("categoryId", options.categoryId);
  }

  if (options?.active === false) {
    params.set("active", "false");
  }

  const queryString = params.toString();

  return requestJson<{
    ok: boolean;
    products: Product[];
  }>(`/products${queryString ? `?${queryString}` : ""}`);
}

export async function createSale(token: string, payload: CreateSalePayload) {
  return requestJson<{
    ok: boolean;
    message: string;
    sale: {
      id: string;
      saleNumber: string;
      subtotal: string | number;
      discount: string | number;
      total: string | number;
      amountPaid: string | number;
      changeAmount: string | number;
      paymentMethod: string;
      createdAt?: string;
    };
  }>("/sales", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function getCurrentCash(token: string) {
  return requestJson<{
    ok: boolean;
    cashSession: CashSession | null;
    expectedAmount?: number;
    message?: string;
  }>("/cash/current", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function openCash(token: string, openingAmount: number) {
  return requestJson<{
    ok: boolean;
    message: string;
    cashSession: CashSession;
  }>("/cash/open", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      openingAmount,
    }),
  });
}

export async function createCashMovement(
  token: string,
  payload: {
    type: CashMovementType;
    amount: number;
    reason: string;
  },
) {
  return requestJson<{
    ok: boolean;
    message: string;
    movement: CashMovement;
    expectedAmount: number;
  }>("/cash/movements", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function closeCash(token: string, closingAmount: number) {
  return requestJson<{
    ok: boolean;
    message: string;
    cashSession: CashSession;
    summary: {
      expectedAmount: number;
      closingAmount: number;
      difference: number;
    };
  }>("/cash/close", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      closingAmount,
    }),
  });
}

export async function getCashHistory(token: string) {
  return requestJson<{
    ok: boolean;
    sessions: CashSession[];
  }>("/cash/history", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getSalesReport(
  token: string,
  fromDate: string,
  toDate: string,
) {
  const params = new URLSearchParams({
    from: fromDate,
    to: toDate,
  });

  return requestJson<SalesReport>(`/reports/sales?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
export async function getCategories(options?: { active?: boolean }) {
  const params = new URLSearchParams();

  if (options?.active === false) {
    params.set("active", "false");
  }

  const queryString = params.toString();

  return requestJson<{
    ok: boolean;
    categories: Category[];
  }>(`/categories${queryString ? `?${queryString}` : ""}`);
}

export async function createProduct(token: string, payload: ProductPayload) {
  return requestJson<{
    ok: boolean;
    message: string;
    product: Product;
  }>("/products", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(
  token: string,
  productId: string,
  payload: Partial<ProductPayload>,
) {
  return requestJson<{
    ok: boolean;
    message: string;
    product: Product;
  }>(`/products/${productId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function updateProductStatus(
  token: string,
  productId: string,
  isActive: boolean,
) {
  return requestJson<{
    ok: boolean;
    message: string;
    product: Product;
  }>(`/products/${productId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      isActive,
    }),
  });
}

export async function deleteProduct(token: string, productId: string) {
  return requestJson<{
    ok: boolean;
    message: string;
  }>(`/products/${productId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
export async function createCategory(token: string, payload: CategoryPayload) {
  return requestJson<{
    ok: boolean;
    message: string;
    category: Category;
  }>("/categories", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function updateCategory(
  token: string,
  categoryId: string,
  payload: Partial<CategoryPayload>,
) {
  return requestJson<{
    ok: boolean;
    message: string;
    category: Category;
  }>(`/categories/${categoryId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function updateCategoryStatus(
  token: string,
  categoryId: string,
  isActive: boolean,
) {
  return requestJson<{
    ok: boolean;
    message: string;
    category: Category;
  }>(`/categories/${categoryId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      isActive,
    }),
  });
}

export async function deleteCategory(token: string, categoryId: string) {
  return requestJson<{
    ok: boolean;
    message: string;
  }>(`/categories/${categoryId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
export async function getRoles(token: string) {
  return requestJson<{
    ok: boolean;
    roles: Role[];
  }>("/users/roles", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getUsers(
  token: string,
  options?: {
    search?: string;
    active?: boolean;
  },
) {
  const params = new URLSearchParams();

  if (options?.search) {
    params.set("search", options.search);
  }

  if (options?.active === false) {
    params.set("active", "false");
  }

  const queryString = params.toString();

  return requestJson<{
    ok: boolean;
    users: SystemUser[];
  }>(`/users${queryString ? `?${queryString}` : ""}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function createUser(token: string, payload: UserPayload) {
  return requestJson<{
    ok: boolean;
    message: string;
    user: SystemUser;
  }>("/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function updateUser(
  token: string,
  userId: string,
  payload: Partial<UserPayload>,
) {
  return requestJson<{
    ok: boolean;
    message: string;
    user: SystemUser;
  }>(`/users/${userId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function updateUserStatus(
  token: string,
  userId: string,
  isActive: boolean,
) {
  return requestJson<{
    ok: boolean;
    message: string;
    user: SystemUser;
  }>(`/users/${userId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      isActive,
    }),
  });
}

export async function deleteUser(token: string, userId: string) {
  return requestJson<{
    ok: boolean;
    message: string;
  }>(`/users/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
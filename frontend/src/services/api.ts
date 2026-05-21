const API_URL = "http://localhost:4000/api";

export type User = {
  id: string;
  fullName: string;
  email: string;
  role: string;
};

export type Product = {
  id: string;
  name: string;
  price: number | string;
  stock: number;
  trackStock: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  };
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

export async function getProducts() {
  return requestJson<{
    ok: boolean;
    products: Product[];
  }>("/products");
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
      changeAmount: string | number;
      paymentMethod: string;
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
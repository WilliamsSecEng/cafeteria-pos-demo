import { Navigate } from "react-router";
import type { ReactNode } from "react";
import type { User } from "../services/api";

type AuthState = {
  token: string;
  user: User;
};

function getAuthState(): AuthState | null {
  const token = localStorage.getItem("cafeteria_token");
  const storedUser = localStorage.getItem("cafeteria_user");

  if (!token || !storedUser) {
    return null;
  }

  try {
    const user = JSON.parse(storedUser) as User;

    if (!user?.id || !user?.role) {
      localStorage.removeItem("cafeteria_token");
      localStorage.removeItem("cafeteria_user");
      return null;
    }

    return {
      token,
      user,
    };
  } catch {
    localStorage.removeItem("cafeteria_token");
    localStorage.removeItem("cafeteria_user");
    return null;
  }
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = getAuthState();

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const auth = getAuthState();

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  if (auth.user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return children;
}
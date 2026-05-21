import { Navigate, Route, Routes } from "react-router";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SalesPage from "./pages/SalesPage";
import CashPage from "./pages/CashPage";
import ReportsPage from "./pages/ReportsPage";
import MarketingPage from "./pages/MarketingPage";
import ProductsAdminPage from "./pages/ProductsAdminPage";
import CategoriesAdminPage from "./pages/CategoriesAdminPage";
import UsersAdminPage from "./pages/UsersAdminPage";
import { AdminRoute, ProtectedRoute } from "./components/RouteGuards";

function App() {
  return (
    <Routes>
      <Route path="/demo" element={<MarketingPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ventas"
        element={
          <ProtectedRoute>
            <SalesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/caja"
        element={
          <ProtectedRoute>
            <CashPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reportes"
        element={
          <AdminRoute>
            <ReportsPage />
          </AdminRoute>
        }
      />

      <Route
        path="/productos"
        element={
          <AdminRoute>
            <ProductsAdminPage />
          </AdminRoute>
        }
      />

      <Route
        path="/categorias"
        element={
          <AdminRoute>
            <CategoriesAdminPage />
          </AdminRoute>
        }
      />

      <Route
        path="/usuarios"
        element={
          <AdminRoute>
            <UsersAdminPage />
          </AdminRoute>
        }
      />

      <Route path="*" element={<Navigate to="/demo" replace />} />
    </Routes>
  );
}

export default App;
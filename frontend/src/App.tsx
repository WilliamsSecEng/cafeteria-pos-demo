import { Navigate, Route, Routes } from "react-router";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SalesPage from "./pages/SalesPage";
import CashPage from "./pages/CashPage";
import ReportsPage from "./pages/ReportsPage";
import MarketingPage from "./pages/MarketingPage";

function App() {
  return (
    <Routes>
      <Route path="/demo" element={<MarketingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<DashboardPage />} />
      <Route path="/ventas" element={<SalesPage />} />
      <Route path="/caja" element={<CashPage />} />
      <Route path="/reportes" element={<ReportsPage />} />
      <Route path="*" element={<Navigate to="/demo" replace />} />
    </Routes>
  );
}

export default App;
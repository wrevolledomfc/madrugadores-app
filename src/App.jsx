// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./RequireAuth";

import AppLayout from "./layouts/AppLayout";
import PageTransition from "./pages/PageTransition.jsx";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Pago from "./pages/Pago.jsx";
import MiQR from "./pages/MiQR.jsx";
import AdminScan from "./pages/AdminScan.jsx";
import Profile from "./pages/Profile.jsx";
import Ranking from "./pages/Ranking.jsx";
import SubirFoto from "./pages/SubirFoto.jsx";
import AsistenciasAnuales from "./pages/AsistenciasAnuales.jsx";
import EstadoPagos from "./pages/EstadoPagos";
export default function App() {
  return (
    <>
      <PageTransition />

      <Routes>
        {/* raíz */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ❌ login SIN AppLayout (tiene su propio fondo bus) */}
        <Route path="/login" element={<Login />} />

        {/* ✅ todo lo demás CON AppLayout */}
        <Route element={<AppLayout />}>
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/pago"
            element={
              <RequireAuth>
                <Pago />
              </RequireAuth>
            }
          />
          <Route
            path="/mi-qr"
            element={
              <RequireAuth>
                <MiQR />
              </RequireAuth>
            }
          />
          <Route
            path="/mi-foto"
            element={
              <RequireAuth>
                <SubirFoto />
              </RequireAuth>
            }
          />
          <Route
            path="/admin-scan"
            element={
              <RequireAuth>
                <AdminScan />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/ranking"
            element={
              <RequireAuth>
                <Ranking />
              </RequireAuth>
            }
          />
          <Route
            path="/asistencias"
            element={
              <RequireAuth>
                <AsistenciasAnuales />
              </RequireAuth>
            }
          />

          <Route path="/estado-pagos" element={<EstadoPagos />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </>
  );
}

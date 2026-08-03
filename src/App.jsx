// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./RequireAuth";

import AppLayout from "./layouts/AppLayout";
import MainLayout from "./pages/MainLayout.jsx";
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
import EstadoPagos from "./pages/EstadoPagos.jsx";
import MisPagos from "./pages/MisPagos.jsx";
import PagoMulta from "./pages/PagoMulta.jsx";
import MisMultas from "./pages/MisMultas.jsx";
import EstadosCuenta from "./pages/EstadosCuenta.jsx";
import Fotografias from "./pages/Fotografias.jsx";
import Deudores200 from "./pages/Deudores200";
import PagoEntrenamientoNocturno from "./pages/PagoEntrenamientoNocturno";
import Catalogo from "./pages/Catalogo";
import Habilitadosporequipo from "./pages/Habilitadosporequipo";
import Exoneraciones from "./pages/Exoneraciones";
export default function App() {
  return (
    <>
     {/* <PageTransition /> */}

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />

        <Route element={<AppLayout />}>
          <Route element={<MainLayout />}>
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
              path="/mis-pagos"
              element={
                <RequireAuth>
                  <MisPagos />
                </RequireAuth>
              }
            />
<Route path="/exoneraciones" element={<Exoneraciones />} />
            <Route
              path="/estado-pagos"
              element={
                <RequireAuth>
                  <EstadoPagos />
                </RequireAuth>
              }
            />

            <Route
              path="/multa"
              element={
                <RequireAuth>
                  <PagoMulta />
                </RequireAuth>
              }
            />

            <Route
              path="/mis-multas"
              element={
                <RequireAuth>
                  <MisMultas />
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
              path="/Fotografias"
              element={
                <RequireAuth>
                  <Fotografias />
                </RequireAuth>
              }
            />

            <Route
              path="/deudores-200"
              element={
                <RequireAuth>
                  <Deudores200 />
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
              path="/pago-entrenamiento-nocturno"
              element={
                <RequireAuth>
                  <PagoEntrenamientoNocturno />
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
              path="/catalogo"
              element={
                <RequireAuth>
                  <Catalogo />
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

            <Route
              path="/estados-cuenta"
              element={
                <RequireAuth>
                  <EstadosCuenta />
                </RequireAuth>
              }
            />
<Route
  path="/habilitados-equipo"
  element={
    <RequireAuth>
      <Habilitadosporequipo />
    </RequireAuth>
  }
/>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
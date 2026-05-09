import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/ui/Layout';
import Login from './pages/Login';
import Vacantes from './pages/Vacantes';
import VacanteDetalle from './pages/VacanteDetalle';
import Kanban from './pages/Kanban';
import Calendario from './pages/Calendario';
import Dashboard from './pages/Dashboard';
import FormularioPublico from './pages/FormularioPublico';
import Usuarios from './pages/Usuarios';

function PrivateRoute({ children, usuario, onLogout }) {
  if (!usuario) return <Navigate to="/login" replace />;
  return <Layout usuario={usuario} onLogout={onLogout}>{children}</Layout>;
}

function AdminRoute({ children, usuario, onLogout }) {
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== 'ADMIN') return <Navigate to="/vacantes" replace />;
  return <Layout usuario={usuario} onLogout={onLogout}>{children}</Layout>;
}

export default function App() {
  const { usuario, login, logout } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        usuario ? <Navigate to="/vacantes" replace /> : <Login onLogin={login} />
      } />
      <Route path="/postular/:slug" element={<FormularioPublico />} />

      <Route path="/vacantes" element={
        <PrivateRoute usuario={usuario} onLogout={logout}>
          <Vacantes />
        </PrivateRoute>
      } />
      <Route path="/vacantes/:id" element={
        <PrivateRoute usuario={usuario} onLogout={logout}>
          <VacanteDetalle />
        </PrivateRoute>
      } />
      <Route path="/kanban" element={
        <PrivateRoute usuario={usuario} onLogout={logout}>
          <Kanban />
        </PrivateRoute>
      } />
      <Route path="/calendario" element={
        <PrivateRoute usuario={usuario} onLogout={logout}>
          <Calendario />
        </PrivateRoute>
      } />
      <Route path="/dashboard" element={
        <PrivateRoute usuario={usuario} onLogout={logout}>
          <Dashboard />
        </PrivateRoute>
      } />

      <Route path="/usuarios" element={
        <AdminRoute usuario={usuario} onLogout={logout}>
          <Usuarios usuarioActual={usuario} />
        </AdminRoute>
      } />

      <Route path="*" element={<Navigate to={usuario ? '/vacantes' : '/login'} replace />} />
    </Routes>
  );
}

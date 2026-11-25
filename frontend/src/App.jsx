import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Assignments from './pages/Assignments.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import Bases from './pages/Bases.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Equipment from './pages/Equipment.jsx';
import Expenditures from './pages/Expenditures.jsx';
import Inventory from './pages/Inventory.jsx';
import Login from './pages/Login.jsx';
import Purchases from './pages/Purchases.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Transfers from './pages/Transfers.jsx';
import Unauthorized from './pages/Unauthorized.jsx';
import Users from './pages/Users.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/transfers" element={<Transfers />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
                <Route path="/settings" element={<Settings />} />

                <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'BASE_COMMANDER']} />}>
                  <Route path="/assignments" element={<Assignments />} />
                  <Route path="/expenditures" element={<Expenditures />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                  <Route path="/users" element={<Users />} />
                  <Route path="/bases" element={<Bases />} />
                  <Route path="/equipment" element={<Equipment />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

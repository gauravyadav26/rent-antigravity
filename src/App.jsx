import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import TenantList from './pages/TenantList';
import TenantForm from './pages/TenantForm';
import TenantDetail from './pages/TenantDetail';
import PaymentHistory from './pages/PaymentHistory';
import MonthlyHistory from './pages/MonthlyHistory';
import DataManagement from './pages/DataManagement';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tenants" element={<TenantList />} />
            <Route path="tenants/:id" element={<TenantDetail />} />
            <Route path="add-tenant" element={<TenantForm />} />
            <Route path="edit-tenant/:id" element={<TenantForm />} />
            <Route path="payment-history" element={<PaymentHistory />} />
            <Route path="monthly-history" element={<MonthlyHistory />} />
            <Route path="data-management" element={<DataManagement />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

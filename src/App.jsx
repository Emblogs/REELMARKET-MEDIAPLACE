import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/layout/ProtectedRoute';
import RoleRoute from './components/layout/RoleRoute';

import Home from './pages/Home';
import Browse from './pages/Browse';
import Search from './pages/Search';
import TitleDetail from './pages/TitleDetail';
import Login from './pages/Login';
import StaffLogin from './pages/StaffLogin';
import Signup from './pages/Signup';
import SellerApply from './pages/SellerApply';
import SellerTerms from './pages/SellerTerms';
import Cart from './pages/Cart';
import Account from './pages/Account';

import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminItems from './pages/admin/AdminItems';
import AdminSellers from './pages/admin/AdminSellers';
import AdminStaff from './pages/admin/AdminStaff';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBanners from './pages/admin/AdminBanners';
import AdminOrders from './pages/admin/AdminOrders';

import StaffPanel from './pages/staff/StaffPanel';


function NotFound() {
  return (
    <div className="container section">
      <h1 className="section-title">404 — Reel not found</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>That page doesn't exist.</p>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isStaffLoginRoute = location.pathname === '/staff-login';
  const hideStorefrontChrome = isAdminRoute || isStaffLoginRoute;

  return (
    <>
      {!hideStorefrontChrome && <Navbar />}
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse/:category" element={<Browse />} />
          <Route path="/search" element={<Search />} />
          <Route path="/title/:id" element={<TitleDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/staff-login" element={<StaffLogin />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/seller-terms" element={<SellerTerms />} />
          <Route path="/apply-seller" element={<SellerApply />} />

          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />

          <Route
            path="/staff"
            element={
              <RoleRoute allow={['staff', 'admin']}>
                <StaffPanel />
              </RoleRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <RoleRoute allow={['admin']}>
                <AdminLayout />
              </RoleRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="items" element={<AdminItems />} />
            <Route path="sellers" element={<AdminSellers />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="orders" element={<AdminOrders />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!hideStorefrontChrome && <Footer />}
    </>
  );
}

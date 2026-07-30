import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/** Requires the signed-in user's role to be in `allow`. */
export default function RoleRoute({ allow = [], children }) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!allow.includes(role)) return <Navigate to="/" replace />;
  return children;
}

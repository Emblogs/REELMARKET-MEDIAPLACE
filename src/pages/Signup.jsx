import { Navigate } from 'react-router-dom';

/**
 * There's no separate signup form anymore — signing in with Google or an
 * emailed code creates the account automatically on first use, so "signup"
 * and "login" are the same screen now. Redirect here for anyone with the
 * old link bookmarked.
 */
export default function Signup() {
  return <Navigate to="/login" replace />;
}

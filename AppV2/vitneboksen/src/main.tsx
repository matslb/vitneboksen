import React, { type JSX } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import VitneboksDetail from './pages/VitneboksDetail';
import Testimony from './pages/Testimony';
import ActionShot from './pages/ActionShot';
import Login from './pages/Login';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import LoadingFullScreen from './components/LoadingFullScreen';
import './index.css';

const auth = getAuth();

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingFullScreen />;
  if (!user) return <Navigate to="/" />;

  return children;
}

function LoginRedirect() {
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingFullScreen />;
  if (user) return <Navigate to="/admin" />;

  return <Login />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginRedirect />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vitneboks/:id"
          element={
            <ProtectedRoute>
              <VitneboksDetail />
            </ProtectedRoute>
          }
        />
        <Route path="/vitne/:vitneboksId" element={<Testimony />} />
        <Route path="/bidra/:vitneboksId" element={<ActionShot />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

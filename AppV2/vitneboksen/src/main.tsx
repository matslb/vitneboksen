/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, type JSX } from 'react';
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
import { generateStrongToken, isPhoneDevice, getCookieDomain } from './utils';
import { getDatabase, onValue, ref, set } from 'firebase/database';

const auth = getAuth();

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);

  useEffect(() => {
    let tokenUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // Clean up previous token listener if user changes/logs out
      if (tokenUnsubscribe) {
        tokenUnsubscribe();
        tokenUnsubscribe = null;
      }

      if (!firebaseUser) {
        return;
      }

      const db = getDatabase();
      const tokenRef = ref(db, `/userTokens/${firebaseUser.uid}`);

      // OPTIONAL: only generate if you don't already do this elsewhere
      const token = generateStrongToken();
      set(tokenRef, token);

      // Listen for token value changes
      const unsubscribeFromToken = onValue(tokenRef, (snapshot) => {
        const tokenValue = snapshot.val();
        if (!tokenValue) return;

        const expiryDate = new Date();
        expiryDate.setTime(expiryDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        const cookieDomain = getCookieDomain();
        document.cookie = `userToken=${tokenValue}; expires=${expiryDate.toUTCString()}; path=/; domain=${cookieDomain}; SameSite=Lax`;
      });

      tokenUnsubscribe = () => unsubscribeFromToken();
    });

    return () => {
      authUnsubscribe();
      if (tokenUnsubscribe) {
        tokenUnsubscribe();
      }
    };
  }, []);

  if (loading) return <LoadingFullScreen />;
  if (!user) return <Navigate to="/" />;

  return children;
}

const LoginRedirect = () => {
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

const BidraRoute = () => {
  const [isPhone, setIsPhone] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    setIsPhone(isPhoneDevice());
  }, []);

  if (isPhone === null) {
    return <LoadingFullScreen />;
  }

  return isPhone ? <ActionShot /> : <Testimony />;
};

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
        <Route path="/bidra/:vitneboksId" element={<BidraRoute />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

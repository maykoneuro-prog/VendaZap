/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Storefront from './pages/Storefront';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Finance from './pages/Finance';
import Settings from './pages/Settings';
import SuperAdmin from './pages/SuperAdmin';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (user) {
        unsubscribeUserDoc = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setStoreId(docSnap.data().storeId);
          } else {
            setStoreId(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user doc:", error);
          setStoreId(null);
          setLoading(false);
        });
      } else {
        setStoreId(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
          
          {/* Public Storefront (Buyer View) */}
          <Route path="/s/:slug" element={<Storefront />} />

          {/* Protected Seller Routes */}
          <Route path="/dashboard" element={user ? <Dashboard storeId={storeId} /> : <Navigate to="/login" />} />
          <Route path="/products" element={user ? <Products storeId={storeId} /> : <Navigate to="/login" />} />
          <Route path="/orders" element={user ? <Orders storeId={storeId} /> : <Navigate to="/login" />} />
          <Route path="/customers" element={user ? <Customers storeId={storeId} /> : <Navigate to="/login" />} />
          <Route path="/finance" element={user ? <Finance storeId={storeId} /> : <Navigate to="/login" />} />
          <Route path="/settings" element={user ? <Settings storeId={storeId} /> : <Navigate to="/login" />} />
          
          {/* Super Admin Route */}
          <Route path="/admin-global" element={user ? <SuperAdmin /> : <Navigate to="/login" />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </ErrorBoundary>
  );
}


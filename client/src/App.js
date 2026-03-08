import React, { useEffect } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider } from './utils/AuthContext.jsx';
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import useAuthStore from "./utils/authStore.js";
import { AdminRoute, UserRoute } from './utils/ProtectedRoute.js';
import { SocketProvider } from './contexts/SocketContext.js';
import { DryingProvider } from './contexts/DryingContext';
import { WeightProvider } from './contexts/WeightContext.js';
import { ToastProvider }  from './contexts/ToastContext';
import GlobalToastDisplay from './components/GlobalToastDisplay';

// Page Components
import Home from "./LandingPage/Home";
import About from "./LandingPage/About";
import Gallery from "./LandingPage/Gallery";
import Login from "./LandingPage/Login";
import SignUp from "./LandingPage/SignUp";
import AdminDashboard from "./components/dashboard/AdminDashboard";
import Dashboard from './components/dashboard/Dashboard';
import Analytics from './components/dashboard/Analytics';
import History from './components/dashboard/History';
import Profile from './components/dashboard/Profile';
import Notification from './components/dashboard/Notification';


export default function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <div className="App">
      <ToastProvider>
        <GlobalToastDisplay/>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home"    element={<Home />} />
          <Route path="/about"   element={<About />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/login"   element={<Login />} />
          <Route path="/signup"  element={<SignUp />} />

          <Route
            path="/*"
            element={
              <SocketProvider>
                <DryingProvider>
                  <WeightProvider>
                  <Routes>
                    {/* User Routes */}
                    <Route path="/dashboard"    element={<UserRoute><Dashboard /></UserRoute>} />
                    <Route path="/analytics"    element={<UserRoute><Analytics /></UserRoute>} />
                    <Route path="/history"      element={<UserRoute><History /></UserRoute>} />
                    <Route path="/profile"      element={<UserRoute><Profile /></UserRoute>} />
                    <Route path="/notification" element={<UserRoute><Notification /></UserRoute>} />

                    {/* Admin Routes */}
                    <Route path="/admindashboard"          element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/admindashboard/settings" element={<AdminRoute><AdminDashboard view="settings" /></AdminRoute>} />
                  </Routes>
                  </WeightProvider>
                </DryingProvider>
              </SocketProvider>
            }
          />

          {/* Unauthorized */}
          <Route
            path="/unauthorized"
            element={
              <div className="unauthorized">
                <h1>Unauthorized Access</h1>
                <p>You don't have permission to access this page.</p>
              </div>
            }
          />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="not-found">
                <h1>Error: 404 - Page Not Found</h1>
                <p>The page you're looking for doesn't exist.</p>
              </div>
            }
          />
        </Routes>
        <ToastContainer />
      </AuthProvider>
      </ToastProvider>
    </div>
  );
}
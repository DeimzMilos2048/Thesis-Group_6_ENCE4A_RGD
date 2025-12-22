// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const getUserRole = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user?.role || null;
};

const hasValidToken = () => {
  const token = localStorage.getItem('token');
  return Boolean(token && token !== 'undefined' && token.trim());
};

//  Route for Admin Only
export const AdminRoute = ({ children }) => {
  const role = getUserRole();
  const validToken = hasValidToken();
  
  if (!role || !validToken) return <Navigate to="/login" replace />;

  return role === "Admin" ? (
    children || <Outlet />
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

//  Route for Normal User Only
export const UserRoute = ({ children }) => {
  const role = getUserRole();
  const validToken = hasValidToken();

  if (!role || !validToken) return <Navigate to="/login" replace />;

  return role === "User" ? (
    children || <Outlet />
  ) : (
    <Navigate to="/admindashboard" replace />
  );
};

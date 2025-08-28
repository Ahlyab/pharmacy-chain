import { useState, useEffect } from "react";
import Spinner from "./components/Spinner";
import "./components/Spinner.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Fallback for any other route to redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Root path redirect based on user role */}
      <Route
        path="/"
        element={
          user.role === "admin" ? (
            <Navigate to="/admin" replace />
          ) : user.role === "manager" ? (
            <Navigate to="/manager" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin/*"
        element={
          user.role === "admin" ? <AdminDashboard /> : <Navigate to="/login" />
        }
      />
      <Route
        path="/manager/*"
        element={
          user.role === "manager" ? (
            <ManagerDashboard />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      {/* Catch-all route for authenticated users */}
      <Route
        path="*"
        element={
          user.role === "admin" ? (
            <Navigate to="/admin" replace />
          ) : user.role === "manager" ? (
            <Navigate to="/manager" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function AppContent() {
  const { user } = useAuth();

  // No need for local loading state since AuthContext handles it
  return <AppRoutes />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <AppContent />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

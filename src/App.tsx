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
  const { user, loading } = useAuth();

  // Helper function to determine actual role for routing
  const getActualRole = (user: any) => {
    if (!user) return null;
    
    // Check if this is actually a Sale Assistant based on name or other criteria
    if (user.role.toLowerCase() === 'manager' && 
        user.name.toLowerCase().includes('sale assistant')) {
      return 'sale assistant';
    }
    
    return user.role.toLowerCase();
  };

  console.log('AppRoutes - user:', user, 'loading:', loading);

  // Show loading spinner while checking authentication
  if (loading) {
    console.log('Showing loading spinner...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    console.log('No user found, redirecting to login...');
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Fallback for any other route to redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  console.log('User authenticated, role:', user.role, 'normalized role:', user.role.toLowerCase());
  return (
    <Routes>
      {/* Root path redirect based on user role */}
      <Route
        path="/"
        element={
          getActualRole(user) === "admin" ? (
            <Navigate to="/admin" replace />
          ) : getActualRole(user) === "manager" || getActualRole(user) === "sale assistant" ? (
            <Navigate to="/manager" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin/*"
        element={
          getActualRole(user) === "admin" ? <AdminDashboard /> : <Navigate to="/login" />
        }
      />
      <Route
        path="/manager/*"
        element={
          getActualRole(user) === "manager" || getActualRole(user) === "sale assistant" ? (
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
          user.role.toLowerCase() === "admin" ? (
            <Navigate to="/admin" replace />
          ) : user.role.toLowerCase() === "manager" || user.role.toLowerCase() === "sale assistant" ? (
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

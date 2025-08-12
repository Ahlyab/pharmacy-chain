import { useState, useEffect } from 'react';
import Spinner from './components/Spinner';
import './components/Spinner.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route 
        path="/admin/*" 
        element={user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/manager/*" 
        element={user.role === 'manager' ? <ManagerDashboard /> : <Navigate to="/login" />} 
      />
      <Route 
        path="*" 
        element={<Navigate to={user.role === 'admin' ? '/admin' : '/manager'} />} 
      />
    </Routes>
  );
}


function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          {loading && <Spinner />}
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
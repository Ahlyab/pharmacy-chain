import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import config from "../config/env";
import { apiEndpoints } from "../utils/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "sale assistant" | "Manager" | "Sale Assistant";
  branchId?: string;
  branchName?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    navigate: (path: string) => void
  ) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore user from token on mount
  useEffect(() => {
    const restoreUser = async () => {
      console.log('Restoring user from token...');
      const token = localStorage.getItem("token");
      if (token) {
        try {
          console.log('Token found, making API call to get current user');
          const data = await apiEndpoints.getCurrentUser();
          console.log('User restored successfully:', data);
          console.log('User restoration - Original role:', data.role);
          setUser({
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            branchId: data.branchId,
          });
        } catch (err) {
          console.error('Error restoring user:', err);
          // Check if it's a network error (server not running)
          if (err instanceof TypeError && err.message.includes('fetch')) {
            console.error('Server connection failed. Make sure the backend server is running on port 5000');
          }
          setUser(null);
          localStorage.removeItem("token");
        }
      } else {
        console.log('No token found');
      }
      setLoading(false);
    };
    restoreUser();
  }, []);

  const login = async (
    email: string,
    password: string,
    navigate: (path: string) => void
  ): Promise<boolean> => {
    try {
      // Login is a public endpoint, so we use direct fetch
      const response = await fetch(`${config.apiUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        branchId: data.branchId,
        branchName: data.branchName,
      });

      // Normalize role to lowercase for consistent comparison
      const normalizedRole = data.role.toLowerCase();
      console.log('Login - Normalized role:', normalizedRole, 'Original role:', data.role);
      
      if (normalizedRole === "admin") {
        navigate("/admin");
      } else if (normalizedRole === "manager" || normalizedRole === "sale assistant") {
        navigate("/manager");
      }

      // Store token in localStorage or cookies if needed
      localStorage.setItem("token", data.token);

      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token"); // Clear token on logout
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

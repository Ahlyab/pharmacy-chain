import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import config from "../config/env";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager";
  branchId?: string;
}

interface AuthContextType {
  user: User | null;
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
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await fetch(`${config.apiUrl}/api/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUser({
              id: data.id,
              name: data.name,
              email: data.email,
              role: data.role,
              branchId: data.branchId,
            });
          } else {
            setUser(null);
            localStorage.removeItem("token");
          }
        } catch (err) {
          setUser(null);
          localStorage.removeItem("token");
        }
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
      });

      // Redirect based on role (case-insensitive comparison)
      const role = data.role.toLowerCase();
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "manager") {
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

  if (loading) {
    return <div>Loading...</div>;
  }
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

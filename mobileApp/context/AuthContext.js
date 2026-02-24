import { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Android Emulator URL
  const API = "http://10.0.2.2:5000";

  // ================= AUTO LOGIN =================
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const savedUser = await AsyncStorage.getItem("user");

        if (token && savedUser) {
          axios.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${token}`;

          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.log("AUTO LOGIN ERROR:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // ================= LOGIN =================
  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API}/login`, {
        email,
        password,
      });

      const { accessToken, user } = res.data;

      if (!accessToken) {
        throw new Error("No token received from server");
      }

      await AsyncStorage.setItem("token", accessToken);
      await AsyncStorage.setItem("user", JSON.stringify(user));

      axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${accessToken}`;

      setUser(user);

      return { success: true };
    } catch (error) {
      console.log("LOGIN ERROR:", error.response?.data || error.message);

      return {
        success: false,
        message:
          error.response?.data?.message || "Login failed",
      };
    }
  };

  // ================= REGISTER =================
  const register = async (name, email, password) => {
    try {
      const res = await axios.post(`${API}/register`, {
        name,
        email,
        password,
      });

      return { success: true, data: res.data };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Registration failed",
      };
    }
  };

  // ================= LOGOUT =================
  const logout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

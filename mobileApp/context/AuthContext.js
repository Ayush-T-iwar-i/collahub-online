import { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import API from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ================= AUTO LOGIN =================
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem("accessToken");
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
      const res = await API.post("/auth/login", {
        email,
        password,
      });

      const { accessToken, refreshToken, role } = res.data;

      if (!accessToken) {
        throw new Error("No token received from server");
      }

      await AsyncStorage.setItem("accessToken", accessToken);
      if (refreshToken) await AsyncStorage.setItem("refreshToken", refreshToken);
      await AsyncStorage.setItem("userRole", role || "student");

      axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${accessToken}`;

      return { success: true, role, accessToken, refreshToken };
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
      const res = await API.post("/auth/register", {
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
    await AsyncStorage.removeItem("accessToken");
    await AsyncStorage.removeItem("refreshToken");
    await AsyncStorage.removeItem("userRole");
    await AsyncStorage.multiRemove([
      "studentData", "teacherData", "adminData", "superAdminData",
      "studentLoggedIn", "teacherLoggedIn", "adminLoggedIn", "superAdminLoggedIn",
    ]);
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

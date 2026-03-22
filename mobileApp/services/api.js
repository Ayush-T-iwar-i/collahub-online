import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ── Platform ke hisaab se URL ──
const BASE_URL = Platform.select({
  android: "http://10.0.2.2:5000",    // Android Emulator
  web:     "http://localhost:5000",    // Browser (npx expo start --web)
  ios:     "http://localhost:5000",    // iOS Simulator
  default: "http://192.168.1.x:5000", // Real phone — apna IP lagao
});

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor: attach token + cache fix ──
API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // ✅ 304 cache fix
    config.headers["Cache-Control"] = "no-cache";
    config.headers["Pragma"]        = "no-cache";
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: auto refresh token ──
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("refresh-token") &&
      !originalRequest.url?.includes("login")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing            = true;

      try {
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        const res = await axios.post(
          `${API.defaults.baseURL}/auth/refresh-token`,
          { token: refreshToken }
        );

        const newToken = res.data.accessToken;
        await AsyncStorage.setItem("accessToken", newToken);

        API.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return API(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);

        // Sab clear karo — logout
        await AsyncStorage.multiRemove([
          "accessToken", "refreshToken",
          "studentData", "teacherData", "adminData",
          "studentLoggedIn", "teacherLoggedIn", "adminLoggedIn",
        ]);

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default API;
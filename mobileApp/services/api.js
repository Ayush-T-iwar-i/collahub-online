import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const RAILWAY_URL = "https://collahub.up.railway.app"; // ✅ Railway URL
// Example: "https://collahub-backend-production.railway.app"

// Local development IP (when not using Railway)
const LOCAL_IP = "10.188.33.222";

// ── Auto URL select ───────────────────────────────────────
const BASE_URL = (() => {
  // Production — Railway URL is set
  if (RAILWAY_URL && !RAILWAY_URL.includes("YOUR-APP-NAME")) {
    return RAILWAY_URL;
  }
  // Local development fallback
  switch (Platform.OS) {
    case "android": return "http://10.0.2.2:5000";
    case "ios":     return "http://localhost:5000";
    case "web":     return "http://localhost:5000";
    default:        return `http://${LOCAL_IP}:5000`;
  }
})();

if (__DEV__) console.log("🌐 API →", BASE_URL);

// ── Axios instance ────────────────────────────────────────
const API = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Request: token attach ─────────────────────────────────
API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers["Cache-Control"] = "no-cache";
    config.headers["Pragma"]        = "no-cache";
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: auto token refresh ──────────────────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const orig = error.config;

    if (!orig) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const message = String(error.response?.data?.message || error.message || "").toLowerCase();
    const isTemporaryError =
      [429, 502, 503, 504].includes(status) ||
      message.includes("high traffic") ||
      message.includes("temporar") ||
      message.includes("timeout") ||
      (!error.response && message.includes("network"));

    if (isTemporaryError && !orig._temporaryRetried) {
      orig._temporaryRetried = true;
      await sleep(1000);
      return API(orig);
    }

    if (!error.response) {
      return Promise.reject(
        new Error("Cannot connect to server. Check internet or verify Railway URL.")
      );
    }

    // 401 — token expired, try refresh
    if (
      error.response?.status === 401 &&
      !orig._retry &&
      !orig.url?.includes("refresh-token") &&
      !orig.url?.includes("login")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => { orig.headers.Authorization = `Bearer ${token}`; return API(orig); })
          .catch((e) => Promise.reject(e));
      }

      orig._retry   = true;
      isRefreshing  = true;

      try {
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        const res      = await axios.post(`${BASE_URL}/auth/refresh-token`, { token: refreshToken }, { timeout: 30000 });
        const newToken = res.data.accessToken;

        await AsyncStorage.setItem("accessToken", newToken);
        API.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        orig.headers.Authorization = `Bearer ${newToken}`;
        return API(orig);

      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await AsyncStorage.multiRemove([
          "accessToken", "refreshToken",
          "studentData", "teacherData", "adminData", "superAdminData",
          "studentLoggedIn", "teacherLoggedIn", "adminLoggedIn", "superAdminLoggedIn",
        ]);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default API;

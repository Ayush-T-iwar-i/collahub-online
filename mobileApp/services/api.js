import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";





const BASE_URL = "https://university-hub-code.onrender.com";


if (__DEV__) console.log("🌐 API →", BASE_URL);


const API = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
        new Error("Cannot connect to server. Check internet or verify Render server.")
      );
    }

    
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

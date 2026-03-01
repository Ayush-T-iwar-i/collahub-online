import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = axios.create({
  baseURL: "http://192.168.12.152:5000",  // ✅ Real device IP
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 Request interceptor — attach access token
API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔄 Response interceptor — auto refresh token on 401
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        const res = await axios.post("http://192.168.12.152:5000/auth/refresh-token", {
          refreshToken,
        });

        const newAccessToken = res.data.accessToken;
        await AsyncStorage.setItem("accessToken", newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        // Refresh token bhi expire — logout
        await AsyncStorage.multiRemove([
          "accessToken", "refreshToken",
          "studentData", "teacherData", "adminData",
          "adminLoggedIn",
        ]);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
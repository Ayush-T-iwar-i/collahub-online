import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";


const API = axios.create({
  baseURL: "http://10.0.2.2:5000",
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 Automatically attach access token
API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;
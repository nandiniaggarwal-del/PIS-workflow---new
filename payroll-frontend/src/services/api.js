import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api",
});

API.interceptors.request.use(
  (config) => {
    const userStr = sessionStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      } catch (error) {
        console.error("Error parsing user from sessionStorage:", error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;
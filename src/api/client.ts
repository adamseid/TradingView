import axios from "axios";

let csrfToken: string | null = null;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export async function initCsrf() {
  const response = await api.get("/auth/csrf/");
  csrfToken = response.data.csrfToken;
}

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();

  config.withCredentials = true;

  if (!["get", "head", "options"].includes(method) && csrfToken) {
    config.headers.set("X-CSRFToken", csrfToken);
  }

  return config;
});

export default api;
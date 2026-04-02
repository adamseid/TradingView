import axios, { AxiosError } from "axios";

type ApiErrorResponse = {
  response?: {
    status?: boolean;
    message?: string;
    data?: unknown;
  };
};

let csrfToken: string | null = null;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export async function initCsrf() {
  const response = await api.get("/auth/csrf/");
  csrfToken = response.data.csrfToken;
}

export function isApiError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return axios.isAxiosError(error);
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    return error.response?.data?.response?.message || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
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
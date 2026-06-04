import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT token into requests if available in storage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// --- API Service Callbacks ---

export const authService = {
  async register(email: string, password: string, name: string) {
    const response = await api.post("/auth/register", { email, password, name });
    return response.data;
  },

  async login(email: string, password: string) {
    const response = await api.post("/auth/login-json", { email, password });
    if (response.data.access_token) {
      localStorage.setItem("token", response.data.access_token);
    }
    return response.data;
  },

  async getMe() {
    const response = await api.get("/auth/me");
    return response.data;
  },

  logout() {
    localStorage.removeItem("token");
  }
};

export const deviceService = {
  async getAll() {
    const response = await api.get("/devices");
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/devices/${id}`);
    return response.data;
  },

  async create(id: string, name: string, location: string, type: string) {
    const response = await api.post("/devices", { id, name, location, type });
    return response.data;
  },

  async update(id: string, data: any) {
    const response = await api.put(`/devices/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(`/devices/${id}`);
    return response.data;
  }
};

export const telemetryService = {
  async getHistory(deviceId: string, limit: number = 50) {
    const response = await api.get(`/telemetry/device/${deviceId}`, {
      params: { limit }
    });
    return response.data;
  },

  async addManual(deviceId: string, tempC: number, vibMps2: number, runtime: number) {
    const response = await api.post("/telemetry/manual", {
      device_id: deviceId,
      temperature_c: tempC,
      vibration_mps2: vibMps2,
      runtime
    });
    return response.data;
  },

  async uploadCSV(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/telemetry/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return response.data;
  }
};

export const predictionService = {
  async getAll() {
    const response = await api.get("/predictions");
    return response.data;
  },

  async getHistory(deviceId: string, limit: number = 30) {
    const response = await api.get(`/predictions/device/${deviceId}`, {
      params: { limit }
    });
    return response.data;
  },

  async getAnalytics() {
    const response = await api.get("/predictions/analytics");
    return response.data;
  }
};

export const maintenanceService = {
  /** Returns all alerts that have an llm_remediation_guide (i.e. have AI steps). */
  async getRemediation() {
    const response = await api.get("/alerts");
    // Filter only those with a guide
    return (response.data as any[]).filter((a: any) => !!a.llm_remediation_guide);
  }
};

export const alertService = {
  async getAll() {
    const response = await api.get("/alerts");
    return response.data;
  },

  async acknowledge(alertId: number, status: string = "acknowledged") {
    const response = await api.post(`/alerts/${alertId}/acknowledge`, { status });
    return response.data;
  }
};

export const reportService = {
  async download(format: "pdf" | "csv") {
    const response = await api.get("/reports/download", {
      params: { format },
      responseType: "blob"
    });
    
    // Trigger file download in browser
    const blob = new Blob([response.data], { type: format === "pdf" ? "application/pdf" : "text/csv" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `fleet_maintenance_report.${format}`;
    link.click();
    window.URL.revokeObjectURL(link.href);
  }
};

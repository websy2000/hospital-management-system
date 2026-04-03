import axios from "axios";

// --- Configuration ---
// IMPORTANT: Replace 'http://localhost:5000/api' with the actual URL of your backend API.
// For development, you can use a .env file (e.g., .env.development)
// and set REACT_APP_API_BASE_URL=http://localhost:5000/api
const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Interceptors for Authentication ---
// This automatically adds the JWT token to every outgoing request if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// --- API Services ---
// Each service provides methods for interacting with specific backend endpoints

export const authService = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (userData) => api.post("/auth/register", userData),
  getCurrentUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
};

export const doctorService = {
  getDoctors: () => api.get("/doctors"),
  getProfile: (id) => api.get(`/doctors/${id}`),
  addDoctor: (doctorData) => api.post("/doctors", doctorData),
  updateDoctor: (id, doctorData) => api.put(`/doctors/${id}`, doctorData),
  deleteDoctor: (id) => api.delete(`/doctors/${id}`),
};

export const departmentService = {
  getDepartments: () => api.get("/departments"),
  addDepartment: (departmentData) => api.post("/departments", departmentData),
  updateDepartment: (id, departmentData) =>
    api.put(`/departments/${id}`, departmentData),
  deleteDepartment: (id) => api.delete(`/departments/${id}`),
};

export const patientService = {
  getPatients: () => api.get("/patients"),
  getProfile: (id) => api.get(`/patients/${id}`),
  deletePatient: (id) => api.delete(`/patients/${id}`),
};

export const inventoryService = {
  getItems: () => api.get("/inventory"),
  addItem: (itemData) => api.post("/inventory", itemData),
  updateItem: (id, itemData) => api.put(`/inventory/${id}`, itemData),
  deleteItem: (id) => api.delete(`/inventory/${id}`),
};

export const appointmentService = {
  getAppointments: () => api.get("/appointments"),
  bookAppointment: (appointmentData) =>
    api.post("/appointments", appointmentData),
  updateAppointment: (id, appointmentData) =>
    api.put(`/appointments/${id}`, appointmentData),
  rescheduleAppointment: (id, newDate) =>
    api.patch(`/appointments/${id}/reschedule`, newDate),
  cancelAppointment: (id, reason) =>
    api.patch(`/appointments/${id}/cancel`, reason),
  payAppointment: (id, paymentData) =>
    api.post(`/appointments/${id}/pay`, paymentData),
};

export const prescriptionService = {
  getPrescriptions: () => api.get("/prescriptions"),
  addPrescription: (prescriptionData) =>
    api.post("/prescriptions", prescriptionData),
  downloadPrescription: (id) =>
    api.get(`/prescriptions/${id}/download`, { responseType: "blob" }),
};

export const medicalHistoryService = {
  getMedicalHistory: () => api.get("/medical-history"),
  addMedicalRecord: (recordData) => api.post("/medical-history", recordData),
};

export const billingService = {
  getBillingReports: () => api.get("/billing/reports"),
};

export const feedbackService = {
  addFeedback: (feedbackData) => api.post("/feedback", feedbackData),
};

export const analyticsService = {
  getSummary: () => api.get("/analytics/summary"),
};

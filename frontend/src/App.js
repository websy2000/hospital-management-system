import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";

import Login from "./pages/Login";
import Register from "./pages/Register";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import DoctorSearch from "./pages/DoctorSearch";
import DoctorProfile from "./pages/DoctorProfile";
import AdminAnalytics from "./pages/AdminAnalytics";
import { ThemeProvider } from "./pages/ThemeContext";
import { authService } from "./services/api";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              !user ? (
                <Login onLogin={handleLogin} />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/register"
            element={!user ? <Register /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/dashboard"
            element={
              user ? (
                user.role === "patient" ? (
                  <PatientDashboard user={user} onLogout={handleLogout} />
                ) : user.role === "doctor" || user.role === "admin" ? (
                  <DoctorDashboard user={user} onLogout={handleLogout} />
                ) : user.role === "super_admin" ? (
                  <SuperAdminDashboard user={user} onLogout={handleLogout} />
                ) : (
                  <Navigate to="/login" />
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route path="/doctors" element={<DoctorSearch />} />
          <Route path="/doctor/:id" element={<DoctorProfile />} />
          <Route
            path="/analytics"
            element={
              user && user.role === "super_admin" ? (
                <AdminAnalytics />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;

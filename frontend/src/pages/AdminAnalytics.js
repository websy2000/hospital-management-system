import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { analyticsService } from "../services/api";
import "../styles/AdminAnalytics.css";

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await analyticsService.getSummary();
      setAnalytics(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load analytics");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="analytics-container">
        <p>Loading analytics...</p>
      </div>
    );
  if (error)
    return (
      <div className="analytics-container error">
        <p>{error}</p>
      </div>
    );
  if (!analytics)
    return (
      <div className="analytics-container">
        <p>No data available</p>
      </div>
    );

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div className="analytics-header-content">
          <h1>📊 Analytics Dashboard</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="btn btn-primary"
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>
      <div className="analytics-container">
        {/* Key Metrics Cards */}
        <div className="metrics-grid">
          {/* Revenue Card */}
          <div className="metric-card revenue">
            <div className="metric-icon">💰</div>
            <h3>Revenue</h3>
            <div className="metric-value">
              ₹{analytics.revenue.total?.toFixed(2) || 0}
            </div>
            <p className="metric-subtitle">Total Revenue</p>
            <p className="metric-detail">
              This Month: ₹{analytics.revenue.this_month?.toFixed(2) || 0}
            </p>
          </div>

          {/* Total Appointments Card */}
          <div className="metric-card appointments">
            <div className="metric-icon">📅</div>
            <h3>Appointments</h3>
            <div className="metric-value">{analytics.appointments.total}</div>
            <p className="metric-subtitle">Total Appointments</p>
            <p className="metric-detail">
              Completed: {analytics.appointments.completed} | Scheduled:{" "}
              {analytics.appointments.scheduled}
            </p>
          </div>

          {/* Patients Card */}
          <div className="metric-card patients">
            <div className="metric-icon">👥</div>
            <h3>Patients</h3>
            <div className="metric-value">{analytics.patients.total}</div>
            <p className="metric-subtitle">Total Patients</p>
            <p className="metric-detail">
              New This Month: {analytics.patients.new_this_month}
            </p>
          </div>

          {/* Doctors Card */}
          <div className="metric-card doctors">
            <div className="metric-icon">👨‍⚕️</div>
            <h3>Doctors</h3>
            <div className="metric-value">{analytics.doctors.total}</div>
            <p className="metric-subtitle">Total Doctors</p>
          </div>
        </div>

        {/* Appointments Breakdown */}
        <div className="section appointments-breakdown">
          <h2>Appointment Status Breakdown</h2>
          <div className="breakdown-grid">
            <div className="breakdown-item completed">
              <span className="status-dot"></span>
              <p>
                Completed: <strong>{analytics.appointments.completed}</strong>
              </p>
            </div>
            <div className="breakdown-item scheduled">
              <span className="status-dot"></span>
              <p>
                Scheduled: <strong>{analytics.appointments.scheduled}</strong>
              </p>
            </div>
            <div className="breakdown-item pending">
              <span className="status-dot"></span>
              <p>
                Pending Payment:{" "}
                <strong>{analytics.appointments.pending}</strong>
              </p>
            </div>
            <div className="breakdown-item cancelled">
              <span className="status-dot"></span>
              <p>
                Cancelled: <strong>{analytics.appointments.cancelled}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Top Doctors */}
        <div className="section top-doctors">
          <h2>Top Performing Doctors</h2>
          <div className="doctors-list">
            {analytics.doctors.top_5 && analytics.doctors.top_5.length > 0 ? (
              analytics.doctors.top_5.map((doctor, index) => (
                <div key={doctor.id} className="doctor-card">
                  <div className="rank">#{index + 1}</div>
                  <div className="doctor-info">
                    <h3>{doctor.name}</h3>
                    <p className="specialization">{doctor.specialization}</p>
                  </div>
                  <div className="doctor-stats">
                    <div className="stat">
                      <span className="stat-label">Appointments</span>
                      <span className="stat-value">
                        {doctor.appointment_count}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Rating</span>
                      <span className="stat-value star">
                        ⭐ {doctor.avg_rating || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p>No doctor data available</p>
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="refresh-button-container">
          <button className="refresh-button" onClick={loadAnalytics}>
            🔄 Refresh Analytics
          </button>
        </div>
      </div>
    </div>
  );
}

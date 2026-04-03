import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../services/api";
import "./Auth.css";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authService.login(email, password);
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      onLogin(user);
      navigate("/dashboard");
    } catch (err) {
      if (err.response?.status === 401) {
        setError(
          "Invalid email or password. Please ensure the database is seeded.",
        );
      } else {
        setError(
          err.response?.data?.message || "Login failed. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🏥 Hospital Management System</h1>
          <h2>Login</h2>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
          {/* <div className="demo-credentials">
            <p>
              <strong>Demo Credentials:</strong>
            </p>
            <p>Super Admin: admin@hospital.com / admin123</p>
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default Login;

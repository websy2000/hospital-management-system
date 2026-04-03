import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doctorService } from "../services/api";
import "./Dashboard.css";

function DoctorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDoctorProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await doctorService.getProfile(id);
      setDoctor(res.data);
      setFeedback(res.data.reviews || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDoctorProfile();
  }, [loadDoctorProfile]);

  if (loading)
    return (
      <div className="dashboard">
        <div className="loading">Loading doctor profile...</div>
      </div>
    );

  if (!doctor)
    return (
      <div className="dashboard">
        <p className="no-data">Doctor not found.</p>
      </div>
    );

  const renderStars = (rating) => {
    return "⭐".repeat(Math.floor(rating)) + (rating % 1 !== 0 ? "✨" : "");
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>👨‍⚕️ Doctor Profile</h1>
          <button onClick={() => navigate("/")} className="btn btn-secondary">
            Back
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="profile-section">
          <div className="profile-card">
            <h2>Dr. {doctor.name}</h2>
            <div className="profile-basics">
              <p>
                <strong>Specialization:</strong>{" "}
                {doctor.specialization || "General"}
              </p>
              <p>
                <strong>Department:</strong> {doctor.department || "N/A"}
              </p>
              <p>
                <strong>Qualification:</strong> {doctor.qualification || "N/A"}
              </p>
              <p>
                <strong>Experience:</strong> {doctor.experience || "N/A"} years
              </p>
              <p>
                <strong>Consultation Fee:</strong> ₹
                {doctor.consultation_fee || "N/A"}
              </p>
              <p>
                <strong>Contact:</strong> {doctor.email} |{" "}
                {doctor.phone || "N/A"}
              </p>
            </div>

            <div className="rating-section">
              <div className="rating-box">
                <div className="rating-value">{doctor.average_rating}</div>
                <div className="rating-stars">
                  {renderStars(doctor.average_rating)}
                </div>
                <div className="rating-count">
                  ({doctor.total_reviews} reviews)
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/book-appointment/${doctor.id}`)}
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "20px" }}
            >
              Book Appointment
            </button>
          </div>

          <div className="reviews-section">
            <h3>📝 Patient Reviews ({doctor.total_reviews})</h3>
            {feedback && feedback.length > 0 ? (
              <div className="reviews-list">
                {feedback.map((review) => (
                  <div key={review.id} className="review-item">
                    <div className="review-header">
                      <strong>{review.patient_name}</strong>
                      <span className="review-rating">
                        {"⭐".repeat(review.rating)}
                      </span>
                    </div>
                    <p className="review-comment">
                      {review.comment || "No comment"}
                    </p>
                    <small className="review-date">
                      {new Date(review.created_at).toLocaleDateString()}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No reviews yet. Be the first to review!</p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .profile-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-top: 20px;
        }
        @media (max-width: 900px) {
          .profile-section {
            grid-template-columns: 1fr;
          }
        }
        .profile-card {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .profile-card h2 {
          color: #1976d2;
          margin-bottom: 20px;
        }
        .profile-basics {
          font-size: 14px;
          line-height: 1.8;
          color: #666;
          margin-bottom: 20px;
        }
        .profile-basics p {
          margin: 10px 0;
        }
        .profile-basics strong {
          color: #333;
        }
        .rating-section {
          margin: 20px 0;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
          text-align: center;
        }
        .rating-box {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
        }
        .rating-value {
          font-size: 36px;
          font-weight: bold;
          color: #1976d2;
        }
        .rating-stars {
          font-size: 24px;
        }
        .rating-count {
          font-size: 12px;
          color: #999;
        }
        .reviews-section {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .reviews-section h3 {
          margin-bottom: 20px;
          color: #333;
        }
        .reviews-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .review-item {
          padding: 15px;
          border-left: 4px solid #1976d2;
          background: #f9f9f9;
          border-radius: 4px;
        }
        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .review-header strong {
          color: #333;
        }
        .review-rating {
          font-size: 14px;
          color: #ff9800;
        }
        .review-comment {
          color: #666;
          font-size: 13px;
          line-height: 1.5;
          margin: 8px 0;
        }
        .review-date {
          color: #999;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}

export default DoctorProfile;

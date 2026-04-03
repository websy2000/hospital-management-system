import React, { useState, useEffect } from "react";
import { doctorService, departmentService } from "../services/api";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

function DoctorSearch() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [searchName, setSearchName] = useState("");
  const [filterSpecialization, setFilterSpecialization] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterMinExperience, setFilterMinExperience] = useState("");
  const [filterMaxFee, setFilterMaxFee] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docsRes, deptsRes] = await Promise.all([
        doctorService.getDoctors(),
        departmentService.getDepartments(),
      ]);
      setDoctors(docsRes.data);
      setDepartments(deptsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredDoctors = doctors.filter((doc) => {
    const matchesName = doc.name
      .toLowerCase()
      .includes(searchName.toLowerCase());
    const matchesSpec =
      !filterSpecialization ||
      (doc.specialization &&
        doc.specialization
          .toLowerCase()
          .includes(filterSpecialization.toLowerCase()));
    const matchesDept =
      !filterDepartment || doc.department_id === parseInt(filterDepartment);
    const matchesExp =
      !filterMinExperience ||
      (doc.experience && doc.experience >= parseInt(filterMinExperience));
    const matchesFee =
      !filterMaxFee ||
      (doc.consultation_fee && doc.consultation_fee <= parseInt(filterMaxFee));
    return (
      matchesName && matchesSpec && matchesDept && matchesExp && matchesFee
    );
  });

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>🔍 Find Doctors</h1>
          <button onClick={() => navigate("/")} className="btn btn-secondary">
            Back
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="filter-container">
          <div className="filter-section">
            <h3>Filter Doctors</h3>
            <div className="filter-row">
              <div className="filter-group">
                <label>Doctor Name</label>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Specialization</label>
                <input
                  type="text"
                  placeholder="e.g., Cardiology, Neurology..."
                  value={filterSpecialization}
                  onChange={(e) => setFilterSpecialization(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Department</label>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="filter-row">
              <div className="filter-group">
                <label>Min Experience (years)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filterMinExperience}
                  onChange={(e) => setFilterMinExperience(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Max Consultation Fee (₹)</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={filterMaxFee}
                  onChange={(e) => setFilterMaxFee(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <button
                  onClick={() => {
                    setSearchName("");
                    setFilterSpecialization("");
                    setFilterDepartment("");
                    setFilterMinExperience("");
                    setFilterMaxFee("");
                  }}
                  className="btn btn-secondary"
                  style={{ marginTop: "26px" }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading doctors...</div>
        ) : (
          <div className="doctors-grid">
            {filteredDoctors.length === 0 ? (
              <p className="no-data">
                No doctors found matching your criteria.
              </p>
            ) : (
              filteredDoctors.map((doc) => (
                <div key={doc.id} className="doctor-card">
                  <div className="doctor-header">
                    <h3>Dr. {doc.name}</h3>
                    <span className="specialization">
                      {doc.specialization || "General"}
                    </span>
                  </div>
                  <div className="doctor-details">
                    <p>
                      <strong>Department:</strong> {doc.department || "N/A"}
                    </p>
                    <p>
                      <strong>Qualification:</strong>{" "}
                      {doc.qualification || "N/A"}
                    </p>
                    <p>
                      <strong>Experience:</strong> {doc.experience || "N/A"}{" "}
                      years
                    </p>
                    <p>
                      <strong>Fee:</strong> ₹{doc.consultation_fee || "N/A"}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/doctor/${doc.id}`)}
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                  >
                    View Profile & Reviews
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <style>{`
        .filter-container {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .filter-section h3 {
          margin-bottom: 15px;
          color: #333;
        }
        .filter-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 15px;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
        }
        .filter-group label {
          font-weight: 600;
          margin-bottom: 5px;
          color: #555;
        }
        .filter-group input,
        .filter-group select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .doctors-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .doctor-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          background: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .doctor-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .doctor-header {
          margin-bottom: 15px;
        }
        .doctor-header h3 {
          margin: 0 0 10px 0;
          color: #1976d2;
        }
        .specialization {
          display: inline-block;
          background: #e3f2fd;
          color: #1976d2;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        .doctor-details {
          font-size: 13px;
          color: #666;
          margin-bottom: 15px;
        }
        .doctor-details p {
          margin: 8px 0;
        }
        .doctor-details strong {
          color: #333;
        }
      `}</style>
    </div>
  );
}

export default DoctorSearch;

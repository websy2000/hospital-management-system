import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "./ThemeContext";
import DataTable from "./DataTable";
import {
  appointmentService,
  prescriptionService,
  patientService,
} from "../services/api";
import "./Dashboard.css";
import {
  FaStethoscope,
  FaSignOutAlt,
  FaCalendarCheck,
  FaUserInjured,
  FaPrescriptionBottleAlt,
  FaCheck,
  FaTimes,
  FaEdit,
  FaUser,
  FaCreditCard,
  FaHourglassHalf,
  FaFileMedical,
  FaMoon,
  FaSun,
} from "react-icons/fa";

const STATUS_OPTIONS = ["scheduled", "confirmed", "completed", "cancelled"];

function DoctorDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("appointments");
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [expandedPatient, setExpandedPatient] = useState(null);

  // Prescription form
  const [showRxForm, setShowRxForm] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  const [rxData, setRxData] = useState({
    appointment_id: "",
    patient_id: "",
    diagnosis: "",
    medications: "",
    instructions: "",
  });

  // Inline edit for notes / status
  const [editingApt, setEditingApt] = useState(null); // appointment id
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const { theme, toggleTheme } = useTheme();

  const showMsg = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "appointments") {
        const res = await appointmentService.getAppointments();
        setAppointments(res.data);
      } else if (activeTab === "patients") {
        const res = await patientService.getPatients();
        setPatients(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Open inline edit ───────────────────────────────────────────────────────
  const startEdit = (apt) => {
    setEditingApt(apt.id);
    setEditNotes(apt.notes || "");
    setEditStatus(apt.status);
  };

  const cancelEdit = () => {
    setEditingApt(null);
    setEditNotes("");
    setEditStatus("");
  };

  // ── Save notes + status ────────────────────────────────────────────────────
  const saveEdit = async (aptId) => {
    setLoading(true);
    try {
      await appointmentService.updateAppointment(aptId, {
        notes: editNotes,
        status: editStatus,
      });
      showMsg("Appointment updated successfully!");
      cancelEdit();
      loadData();
    } catch {
      showMsg("Error updating appointment.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Quick status change ────────────────────────────────────────────────────
  const quickStatus = async (aptId, status) => {
    try {
      await appointmentService.updateAppointment(aptId, { status });
      showMsg(`Status changed to "${status}"`);
      loadData();
    } catch {
      showMsg("Error updating status.", "error");
    }
  };

  // ── Open prescription form ─────────────────────────────────────────────────
  const openRxForm = (apt) => {
    setSelectedApt(apt);
    setRxData({
      appointment_id: apt.id,
      patient_id: apt.patient_id,
      diagnosis: "",
      medications: "",
      instructions: "",
    });
    setShowRxForm(true);
  };

  const handleSubmitRx = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await prescriptionService.addPrescription(rxData);
      await appointmentService.updateAppointment(selectedApt.id, {
        status: "completed",
      });
      showMsg("Prescription saved & appointment completed!");
      setShowRxForm(false);
      loadData();
    } catch {
      showMsg("Error saving prescription.", "error");
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s) =>
    ({
      pending_payment: "#f57c00",
      scheduled: "#1976d2",
      confirmed: "#7b1fa2",
      completed: "#388e3c",
      cancelled: "#d32f2f",
    })[s] || "#666";

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>
            <FaStethoscope /> Doctor Dashboard
          </h1>
          <div className="user-info">
            <span>Welcome, Dr. {user.name}</span>
            <button
              onClick={toggleTheme}
              className="btn btn-icon"
              title="Toggle Theme"
            >
              {theme === "light" ? <FaMoon /> : <FaSun />}
            </button>
            <button onClick={onLogout} className="btn btn-secondary">
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="tabs">
          {[
            [
              "appointments",
              <span>
                <FaCalendarCheck /> Manage Appointments
              </span>,
            ],
            [
              "patients",
              <span>
                <FaUserInjured /> Patient Records
              </span>,
            ],
          ].map(([key, label]) => (
            <button
              key={key}
              className={activeTab === key ? "tab active" : "tab"}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {message.text && (
          <div
            className={
              message.type === "error" ? "error-message" : "success-message"
            }
          >
            {message.text}
          </div>
        )}

        {/* ── APPOINTMENTS TAB ── */}
        {activeTab === "appointments" && (
          <div className="tab-content">
            <h2>Appointments</h2>

            {/* Prescription form */}
            {showRxForm && (
              <div className="prescription-form">
                <h3>
                  <FaPrescriptionBottleAlt /> Add Prescription —{" "}
                  {selectedApt?.patient_name}
                </h3>
                <form onSubmit={handleSubmitRx}>
                  <div className="form-group">
                    <label>Diagnosis *</label>
                    <textarea
                      rows="2"
                      required
                      placeholder="Enter diagnosis..."
                      value={rxData.diagnosis}
                      onChange={(e) =>
                        setRxData({ ...rxData, diagnosis: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Medications *</label>
                    <textarea
                      rows="3"
                      required
                      placeholder="List medications..."
                      value={rxData.medications}
                      onChange={(e) =>
                        setRxData({ ...rxData, medications: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Instructions</label>
                    <textarea
                      rows="2"
                      placeholder="Special instructions..."
                      value={rxData.instructions}
                      onChange={(e) =>
                        setRxData({ ...rxData, instructions: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? "Saving..." : "Save Prescription"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowRxForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="loading">Loading appointments...</div>
            ) : (
              <DataTable
                loading={loading}
                columns={[
                  "Patient",
                  "Date & Time",
                  "Reason",
                  "Status",
                  "Payment",
                  "Actions",
                ]}
                data={appointments}
                emptyMessage="No appointments found."
                renderRow={(apt) => (
                  <tr key={apt.id}>
                    <td>
                      <FaUser /> {apt.patient_name}
                    </td>
                    <td>{new Date(apt.appointment_date).toLocaleString()}</td>
                    <td>{apt.reason || "-"}</td>
                    <td>
                      <span
                        className="apt-status-badge"
                        style={{
                          backgroundColor: statusColor(apt.status) + "22",
                          color: statusColor(apt.status),
                          border: `1px solid ${statusColor(apt.status)}`,
                        }}
                      >
                        {apt.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      {apt.payment_status === "paid" ? (
                        <span className="apt-payment paid">
                          <FaCreditCard /> Paid ₹{apt.payment_amount}
                        </span>
                      ) : (
                        <span className="apt-payment unpaid">
                          <FaHourglassHalf /> Pending
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {editingApt === apt.id ? (
                          <>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="btn btn-sm"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={loading}
                              onClick={() => saveEdit(apt.id)}
                            >
                              <FaCheck /> Save
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={cancelEdit}
                            >
                              <FaTimes /> Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn btn-sm btn-edit"
                              onClick={() => startEdit(apt)}
                            >
                              <FaEdit /> Edit
                            </button>
                            {apt.status === "confirmed" && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => openRxForm(apt)}
                              >
                                <FaPrescriptionBottleAlt /> Rx
                              </button>
                            )}
                            {apt.status === "scheduled" && (
                              <button
                                className="btn btn-sm"
                                style={{
                                  background: "#7b1fa2",
                                  color: "white",
                                }}
                                onClick={() => quickStatus(apt.id, "confirmed")}
                              >
                                <FaCheck /> Confirm
                              </button>
                            )}
                            {!["completed", "cancelled"].includes(
                              apt.status,
                            ) && (
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => quickStatus(apt.id, "cancelled")}
                              >
                                <FaTimes /> Cancel
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              />
            )}
          </div>
        )}

        {/* ── PATIENT RECORDS TAB ── */}
        {activeTab === "patients" && (
          <div className="tab-content">
            <h2>Patient Records</h2>
            {loading ? (
              <div className="loading">Loading patients...</div>
            ) : (
              <div className="patient-records">
                {patients.length === 0 ? (
                  <p className="no-data">No patient records found.</p>
                ) : (
                  patients.map((patient) => (
                    <div key={patient.id} className="patient-record-card">
                      <div
                        className="patient-record-header"
                        onClick={() =>
                          setExpandedPatient(
                            expandedPatient === patient.id ? null : patient.id,
                          )
                        }
                      >
                        <div className="patient-basic-info">
                          <span className="patient-avatar">
                            <FaUser />
                          </span>
                          <div>
                            <strong>{patient.name}</strong>
                            <span>{patient.email}</span>
                          </div>
                        </div>
                        <div className="patient-meta">
                          {patient.blood_group && (
                            <span className="blood-badge">
                              {patient.blood_group}
                            </span>
                          )}
                          <span className="expand-icon">
                            {expandedPatient === patient.id ? "▲" : "▼"} Details
                          </span>
                        </div>
                      </div>

                      {expandedPatient === patient.id && (
                        <div className="patient-record-body">
                          <div className="patient-details-grid">
                            <p>
                              <strong>Phone:</strong> {patient.phone || "-"}
                            </p>
                            <p>
                              <strong>DOB:</strong>{" "}
                              {patient.date_of_birth || "-"}
                            </p>
                          </div>

                          {/* Medical History */}
                          <div className="record-section">
                            <h4>
                              <FaFileMedical /> Medical History
                            </h4>
                            {patient.medical_history?.length > 0 ? (
                              <div className="history-chips">
                                {patient.medical_history.map((h) => (
                                  <div key={h.id} className="history-chip">
                                    <strong>{h.condition}</strong>
                                    <span>{h.description}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="no-data-sm">
                                No medical history on record.
                              </p>
                            )}
                          </div>

                          {/* Prescriptions */}
                          <div className="record-section">
                            <h4>
                              <FaPrescriptionBottleAlt /> Prescriptions
                            </h4>
                            {patient.prescriptions?.length > 0 ? (
                              patient.prescriptions.map((rx) => (
                                <div key={rx.id} className="rx-mini-card">
                                  <div className="rx-mini-header">
                                    <span>Dr. {rx.doctor_name}</span>
                                    <span>
                                      {new Date(
                                        rx.created_at,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p>
                                    <strong>Diagnosis:</strong> {rx.diagnosis}
                                  </p>
                                  <p>
                                    <strong>Medications:</strong>{" "}
                                    {rx.medications}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="no-data-sm">
                                No prescriptions on record.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorDashboard;

import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "./ThemeContext";
import { useNavigate } from "react-router-dom";
import {
  appointmentService,
  prescriptionService,
  medicalHistoryService,
  doctorService,
  feedbackService,
} from "../services/api";
import "./Dashboard.css";
import {
  FaHospital,
  FaSignOutAlt,
  FaCalendarAlt,
  FaPills,
  FaFileMedical,
  FaUserMd,
  FaComments,
  FaPlus,
  FaCreditCard,
  FaMoneyBillWave,
  FaUniversity,
  FaMobileAlt,
  FaCheckCircle,
  FaPrint,
  FaRedo,
  FaTimes,
  FaStar,
  FaDownload,
  FaBoxOpen,
  FaMoon,
  FaSun,
} from "react-icons/fa";
import Chat from "./Chat";

const PAYMENT_METHODS = [
  "Credit Card",
  "Debit Card",
  "UPI",
  "Net Banking",
  "Cash",
];

const initialBookingState = {
  step: "form", // 'form' | 'payment' | 'success'
  showBooking: false,
  pendingApt: null,
  bookingData: {
    doctor_id: "",
    appointment_date: "",
    reason: "",
  },
  payment: {
    method: "Credit Card",
    cardNumber: "",
    cardName: "",
    cardExpiry: "",
    cardCvv: "",
    upiId: "",
  },
};

function bookingReducer(state, action) {
  switch (action.type) {
    case "OPEN_BOOKING":
      return { ...state, showBooking: true };
    case "SET_BOOKING_FIELD":
      return {
        ...state,
        bookingData: { ...state.bookingData, [action.field]: action.value },
      };
    case "PROCEED_TO_PAYMENT":
      return { ...state, step: "payment", pendingApt: action.payload };
    case "SET_PAYMENT_FIELD":
      return {
        ...state,
        payment: { ...state.payment, [action.field]: action.value },
      };
    case "PAYMENT_SUCCESS":
      return { ...state, step: "success" };
    case "GO_TO_FORM":
      return { ...state, step: "form" };
    case "RESET":
      return initialBookingState;
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

const initialModalState = {
  feedback: { id: null, rating: 5, comment: "" },
  reschedule: { id: null, date: "" },
  cancel: { id: null, reason: "" },
};

function modalReducer(state, action) {
  switch (action.type) {
    case "OPEN_FEEDBACK":
      return {
        ...state,
        feedback: { ...initialModalState.feedback, id: action.payload },
      };
    case "SET_FEEDBACK_FIELD":
      return {
        ...state,
        feedback: { ...state.feedback, [action.field]: action.value },
      };
    case "OPEN_RESCHEDULE":
      return { ...state, reschedule: { id: action.payload, date: "" } };
    case "SET_RESCHEDULE_DATE":
      return {
        ...state,
        reschedule: { ...state.reschedule, date: action.payload },
      };
    case "OPEN_CANCEL":
      return { ...state, cancel: { id: action.payload, reason: "" } };
    case "SET_CANCEL_REASON":
      return { ...state, cancel: { ...state.cancel, reason: action.payload } };
    case "CLOSE_ALL":
      return initialModalState;
    default:
      return state;
  }
}

function PatientDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("appointments");
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Booking and payment flow state managed by a reducer
  const [bookingState, dispatch] = React.useReducer(
    bookingReducer,
    initialBookingState,
  );

  // Modal state managed by a reducer
  const [modalState, dispatchModal] = React.useReducer(
    modalReducer,
    initialModalState,
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const { theme, toggleTheme } = useTheme();

  const showMsg = useCallback((text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "appointments") {
        const [aptsRes, docsRes] = await Promise.all([
          appointmentService.getAppointments(),
          doctorService.getDoctors(),
        ]);
        setAppointments(aptsRes.data);
        setDoctors(docsRes.data);
      } else if (activeTab === "prescriptions") {
        const res = await prescriptionService.getPrescriptions();
        setPrescriptions(res.data);
      } else if (activeTab === "history") {
        const res = await medicalHistoryService.getMedicalHistory();
        setMedicalHistory(res.data);
      } else if (activeTab === "doctors") {
        const res = await doctorService.getDoctors();
        setDoctors(res.data);
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

  // Ensure doctors are loaded when opening the booking modal
  useEffect(() => {
    const fetchDoctorsIfNeeded = async () => {
      if (bookingState.showBooking && (!doctors || doctors.length === 0)) {
        setLoading(true);
        try {
          const res = await doctorService.getDoctors();
          setDoctors(res.data);
        } catch (err) {
          console.error(err);
          showMsg("Failed to load doctors list.", "error");
        } finally {
          setLoading(false);
        }
      }
    };
    fetchDoctorsIfNeeded();
  }, [bookingState.showBooking, doctors, showMsg]);

  // ── Step 1: Submit booking form ────────────────────────────────────────────
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await appointmentService.bookAppointment(
        bookingState.bookingData,
      );
      dispatch({ type: "PROCEED_TO_PAYMENT", payload: res.data });
    } catch (err) {
      showMsg(
        err.response?.data?.message || "Error creating appointment.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Submit payment ─────────────────────────────────────────────────
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await appointmentService.payAppointment(
        bookingState.pendingApt.appointment_id,
        {
          payment_method: bookingState.payment.method,
        },
      );
      dispatch({ type: "PAYMENT_SUCCESS" });
      loadData();
    } catch (err) {
      showMsg(
        err.response?.data?.message || "Payment failed. Please try again.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // Quick test/dummy payment to allow completing payments during development
  const handleDummyPayment = async () => {
    if (!bookingState.pendingApt) return;
    setLoading(true);
    try {
      await appointmentService.payAppointment(
        bookingState.pendingApt.appointment_id,
        {
          payment_method: "dummy",
        },
      );
      dispatch({ type: "PAYMENT_SUCCESS" });
      loadData();
      showMsg("Payment completed using dummy method.");
    } catch (err) {
      showMsg(err.response?.data?.message || "Payment failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Feedback submission ────────────────────────────────────────────────────
  const handleFeedbackSubmit = async (appointmentId, doctorId) => {
    if (!modalState.feedback.comment.trim()) {
      showMsg("Please enter your feedback.", "error");
      return;
    }
    setLoading(true);
    try {
      await feedbackService.addFeedback({
        appointment_id: appointmentId,
        doctor_id: doctorId,
        rating: modalState.feedback.rating,
        comment: modalState.feedback.comment,
      });
      showMsg("Thank you for your feedback!");
      dispatchModal({ type: "CLOSE_ALL" });
      loadData();
    } catch (err) {
      showMsg(
        err.response?.data?.message || "Error submitting feedback.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Reschedule appointment ────────────────────────────────────────────────
  const handleReschedule = async (appointmentId) => {
    if (!modalState.reschedule.date) {
      showMsg("Please select a new date and time.", "error");
      return;
    }
    setLoading(true);
    try {
      await appointmentService.rescheduleAppointment(appointmentId, {
        new_appointment_date: modalState.reschedule.date,
      });
      showMsg("Appointment rescheduled successfully!");
      dispatchModal({ type: "CLOSE_ALL" });
      loadData();
    } catch (err) {
      showMsg(
        err.response?.data?.message || "Error rescheduling appointment.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Cancel appointment ────────────────────────────────────────────────────
  const handleCancel = async (appointmentId) => {
    if (!modalState.cancel.reason.trim()) {
      showMsg("Please provide a reason for cancellation.", "error");
      return;
    }
    if (
      !window.confirm(
        "Are you sure you want to cancel this appointment? This action cannot be undone.",
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await appointmentService.cancelAppointment(appointmentId, {
        reason: modalState.cancel.reason,
      });
      showMsg(
        "Appointment cancelled successfully! You may be eligible for a refund.",
      );
      dispatchModal({ type: "CLOSE_ALL" });
      loadData();
    } catch (err) {
      showMsg(
        err.response?.data?.message || "Error cancelling appointment.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Download prescription as PDF ────────────────────────────────────────────
  const handleDownloadPrescription = async (prescriptionId) => {
    setLoading(true);
    try {
      const response =
        await prescriptionService.downloadPrescription(prescriptionId);
      const prescData = response.data;

      // Generate HTML for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Prescription - ${prescData.patient_name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              color: #333;
            }
            .header {
              border-bottom: 3px solid #667eea;
              padding-bottom: 15px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #667eea;
              margin: 0;
              font-size: 28px;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            .section {
              margin-bottom: 25px;
            }
            .section h2 {
              color: #667eea;
              font-size: 16px;
              border-bottom: 2px solid #667eea;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .two-column {
              display: flex;
              gap: 40px;
              margin-bottom: 20px;
            }
            .column {
              flex: 1;
            }
            .field {
              margin-bottom: 12px;
            }
            .field-label {
              font-weight: bold;
              color: #333;
              font-size: 12px;
            }
            .field-value {
              color: #666;
              margin-top: 4px;
              font-size: 14px;
            }
            .medications-list {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              line-height: 1.6;
              color: #333;
            }
            .doctor-info {
              background: #f0f4ff;
              padding: 15px;
              border-left: 4px solid #667eea;
              margin: 20px 0;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #999;
            }
            @media print {
              body { margin: 0; padding: 10mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏥 Medical Prescription</h1>
            <p>Prescription ID: ${prescData.id}</p>
            <p>Date Issued: ${prescData.prescription_date}</p>
          </div>

          <div class="two-column">
            <div class="column">
              <div class="section">
                <h2>Patient Information</h2>
                <div class="field">
                  <div class="field-label">Name:</div>
                  <div class="field-value">${prescData.patient_name}</div>
                </div>
                <div class="field">
                  <div class="field-label">Email:</div>
                  <div class="field-value">${prescData.patient_email}</div>
                </div>
                <div class="field">
                  <div class="field-label">Phone:</div>
                  <div class="field-value">${prescData.patient_phone || "N/A"}</div>
                </div>
              </div>
            </div>

            <div class="column">
              <div class="section">
                <h2>Doctor Information</h2>
                <div class="field">
                  <div class="field-label">Doctor:</div>
                  <div class="field-value">Dr. ${prescData.doctor_name}</div>
                </div>
                <div class="field">
                  <div class="field-label">Specialization:</div>
                  <div class="field-value">${prescData.doctor_specialization}</div>
                </div>
                <div class="field">
                  <div class="field-label">Qualification:</div>
                  <div class="field-value">${prescData.doctor_qualification}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Appointment Details</h2>
            <div class="field">
              <div class="field-label">Date & Time:</div>
              <div class="field-value">${prescData.appointment_date}</div>
            </div>
          </div>

          <div class="section">
            <h2>Diagnosis</h2>
            <div class="field-value">${prescData.diagnosis || "No diagnosis provided"}</div>
          </div>

          <div class="section">
            <h2>Medications</h2>
            <div class="medications-list">${prescData.medications.replace(/\n/g, "<br>")}</div>
          </div>

          <div class="section">
            <h2>Instructions</h2>
            <div class="field-value">${prescData.instructions || "No additional instructions provided"}</div>
          </div>

          <div class="doctor-info">
            <strong>Important:</strong> Please follow the medication schedule as prescribed. If you experience any adverse reactions, contact your doctor immediately.
          </div>

          <div class="footer">
            <p>This is a computer-generated prescription. It is valid for 6 months from the date of issue.</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;

      // Create a new window to print the PDF
      const printWindow = window.open("", "", "width=800,height=600");
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();

      showMsg("Prescription ready for download!");
    } catch (err) {
      showMsg(
        err.response?.data?.message || "Error downloading prescription.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Print appointment summary ──────────────────────────────────────────────
  const handlePrint = (appointment) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Appointment Summary - Dr. ${appointment.doctor_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
          .header { border-bottom: 2px solid #1976d2; margin-bottom: 30px; padding-bottom: 10px; }
          .header h1 { color: #1976d2; margin: 0; }
          .details-grid { display: grid; grid-template-columns: 150px 1fr; gap: 15px; margin-bottom: 30px; }
          .label { font-weight: bold; color: #666; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 12px; }
          .footer { margin-top: 50px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏥 Appointment Summary</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        <div class="details-grid">
          <div class="label">Doctor:</div>
          <div>Dr. ${appointment.doctor_name}</div>
          <div class="label">Date & Time:</div>
          <div>${new Date(appointment.appointment_date).toLocaleString()}</div>
          <div class="label">Status:</div>
          <div><span class="status" style="background: ${statusColor(appointment.status)}22; color: ${statusColor(appointment.status)}; border: 1px solid ${statusColor(appointment.status)}">${appointment.status}</span></div>
          <div class="label">Reason:</div>
          <div>${appointment.reason || "N/A"}</div>
          <div class="label">Payment:</div>
          <div>${appointment.payment_status === "paid" ? `Paid ₹${appointment.payment_amount} via ${appointment.payment_method}` : "Pending"}</div>
        </div>
        ${
          appointment.notes
            ? `
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #1976d2;">
            <h3 style="margin-top: 0;">Doctor's Notes</h3>
            <p>${appointment.notes}</p>
          </div>
        `
            : ""
        }
        <div class="footer">
          <p>Please bring this summary with you to the hospital. Arrive 10 minutes before your scheduled time.</p>
        </div>
      </body>
      </html>
    `;
    const printWindow = window.open("", "", "width=800,height=600");
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    // Small delay to ensure styles are loaded before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const resetBooking = () => {
    dispatch({ type: "RESET" });
  };

  const selectedDoctor = doctors.find(
    (d) => String(d.id) === String(bookingState.bookingData.doctor_id),
  );

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
            <FaHospital /> Patient Dashboard
          </h1>
          <div className="user-info">
            <span>Welcome, {user.name}</span>
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
                <FaCalendarAlt /> Appointments
              </span>,
            ],
            [
              "prescriptions",
              <span>
                <FaPills /> Prescriptions
              </span>,
            ],
            [
              "history",
              <span>
                <FaFileMedical /> Medical History
              </span>,
            ],
            [
              "doctors",
              <span>
                <FaUserMd /> Doctors
              </span>,
            ],
            [
              "chat",
              <span>
                <FaComments /> Chat
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

        {/* ── CHAT TAB ── */}
        {activeTab === "chat" && (
          <div className="tab-content">
            <Chat user={user} />
          </div>
        )}

        {/* ── DOCTORS TAB ── */}
        {activeTab === "doctors" && (
          <div className="tab-content">
            <h2>Our Doctors</h2>
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <div className="doctors-grid">
                {doctors.length === 0 ? (
                  <p className="no-data">No doctors found.</p>
                ) : (
                  doctors.map((doc) => (
                    <div key={doc.id} className="doctor-card-row">
                      <img
                        src={
                          doc.profile_img ||
                          `https://ui-avatars.com/api/?name=${doc.name}&background=random`
                        }
                        alt={doc.name}
                        className="doctor-avatar"
                      />
                      <div className="doctor-info-block">
                        <h3>Dr. {doc.name}</h3>
                        <p className="doctor-specialization">
                          {doc.specialization}
                        </p>
                        <p className="doctor-department">{doc.department}</p>
                        <p className="doctor-qualification">
                          {doc.qualification}
                        </p>
                        <p className="doctor-experience">
                          {doc.experience
                            ? `${doc.experience} yrs experience`
                            : ""}
                        </p>
                        <p className="doctor-fee">
                          Consultation: ₹{doc.consultation_fee || 0}
                        </p>
                        <button
                          className="btn btn-primary btn-profile"
                          onClick={() => navigate(`/doctor/${doc.id}`)}
                          title="View Doctor Profile"
                        >
                          View Profile & Reviews
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ── APPOINTMENTS TAB ── */}
        {activeTab === "appointments" && (
          <div className="tab-content">
            <div className="content-header">
              <h2>My Appointments</h2>
              {!bookingState.showBooking && (
                <button
                  onClick={() => dispatch({ type: "OPEN_BOOKING" })}
                  className="btn btn-primary"
                >
                  <FaPlus /> Book Appointment
                </button>
              )}
            </div>

            {/* ── BOOKING MODAL ── */}
            {bookingState.showBooking && (
              <div className="booking-modal-overlay">
                <div className="booking-modal">
                  {/* Progress bar */}
                  <div className="booking-progress">
                    <div
                      className={`progress-step ${bookingState.step === "form" || bookingState.step === "payment" || bookingState.step === "success" ? "active" : ""}`}
                    >
                      <div className="progress-dot">1</div>
                      <span>Select Doctor</span>
                    </div>
                    <div className="progress-line" />
                    <div
                      className={`progress-step ${bookingState.step === "payment" || bookingState.step === "success" ? "active" : ""}`}
                    >
                      <div className="progress-dot">2</div>
                      <span>Payment</span>
                    </div>
                    <div className="progress-line" />
                    <div
                      className={`progress-step ${bookingState.step === "success" ? "active" : ""}`}
                    >
                      <div className="progress-dot">3</div>
                      <span>Confirmed</span>
                    </div>
                  </div>

                  {bookingState.step === "form" && (
                    <div className="booking-step">
                      <h3>
                        <FaCalendarAlt /> Book Appointment
                      </h3>
                      <form onSubmit={handleBookingSubmit}>
                        <div className="form-group">
                          <label>Select Doctor</label>
                          <select
                            value={bookingState.bookingData.doctor_id}
                            required
                            onChange={(e) =>
                              dispatch({
                                type: "SET_BOOKING_FIELD",
                                field: "doctor_id",
                                value: e.target.value,
                              })
                            }
                          >
                            <option value="">Choose a doctor...</option>
                            {doctors.map((d) => (
                              <option key={d.id} value={d.id}>
                                Dr. {d.name} — {d.specialization} (
                                {d.department}) · ₹{d.consultation_fee || 0}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedDoctor && (
                          <div className="doctor-fee-banner">
                            <FaCreditCard /> Consultation fee:{" "}
                            <strong>
                              ₹{selectedDoctor.consultation_fee || 0}
                            </strong>
                            <span> — payable after booking</span>
                          </div>
                        )}

                        <div className="form-group">
                          <label>Date & Time</label>
                          <input
                            type="datetime-local"
                            required
                            value={bookingState.bookingData.appointment_date}
                            onChange={(e) =>
                              dispatch({
                                type: "SET_BOOKING_FIELD",
                                field: "appointment_date",
                                value: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="form-group">
                          <label>Reason for Visit</label>
                          <textarea
                            rows="3"
                            placeholder="Describe your symptoms or reason..."
                            value={bookingState.bookingData.reason}
                            onChange={(e) =>
                              dispatch({
                                type: "SET_BOOKING_FIELD",
                                field: "reason",
                                value: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="form-actions">
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                          >
                            {loading ? "Processing..." : "Proceed to Payment →"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={resetBooking}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* ── STEP 2: Payment ── */}
                  {bookingState.step === "payment" &&
                    bookingState.pendingApt && (
                      <div className="booking-step">
                        <h3>
                          <FaCreditCard /> Complete Payment
                        </h3>
                        <div className="payment-summary">
                          <div className="payment-summary-row">
                            <span>Consultation Fee</span>
                            <strong>
                              ₹{bookingState.pendingApt.payment_amount}
                            </strong>
                          </div>
                          <div className="payment-summary-row total">
                            <span>Total Due</span>
                            <strong>
                              ₹{bookingState.pendingApt.payment_amount}
                            </strong>
                          </div>
                        </div>

                        <form onSubmit={handlePaymentSubmit}>
                          <div className="form-group">
                            <label>Payment Method</label>
                            <div className="payment-methods">
                              {PAYMENT_METHODS.map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  className={`payment-method-btn ${bookingState.payment.method === m ? "selected" : ""}`}
                                  onClick={() =>
                                    dispatch({
                                      type: "SET_PAYMENT_FIELD",
                                      field: "method",
                                      value: m,
                                    })
                                  }
                                >
                                  {m === "Credit Card" && <FaCreditCard />}
                                  {m === "Debit Card" && <FaCreditCard />}
                                  {m === "UPI" && <FaMobileAlt />}
                                  {m === "Net Banking" && <FaUniversity />}
                                  {m === "Cash" && <FaMoneyBillWave />} {m}
                                </button>
                              ))}
                            </div>
                          </div>

                          {(bookingState.payment.method === "Credit Card" ||
                            bookingState.payment.method === "Debit Card") && (
                            <div className="card-form">
                              <div className="form-group">
                                <label>Card Number</label>
                                <input
                                  type="text"
                                  placeholder="1234 5678 90"
                                  value={bookingState.payment.cardNumber}
                                  required
                                  onChange={(e) =>
                                    dispatch({
                                      type: "SET_PAYMENT_FIELD",
                                      field: "cardNumber",
                                      value: e.target.value
                                        .replace(/\D/g, "")
                                        .replace(/(.{4})/g, "$1 ")
                                        .trim(),
                                    })
                                  }
                                />
                              </div>
                              <div className="form-group">
                                <label>Cardholder Name</label>
                                <input
                                  type="text"
                                  placeholder="Name on card"
                                  value={bookingState.payment.cardName}
                                  required
                                  onChange={(e) =>
                                    dispatch({
                                      type: "SET_PAYMENT_FIELD",
                                      field: "cardName",
                                      value: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="form-row">
                                <div className="form-group">
                                  <label>Expiry (MM/YY)</label>
                                  <input
                                    type="text"
                                    placeholder="MM/YY"
                                    value={bookingState.payment.cardExpiry}
                                    required
                                    onChange={(e) =>
                                      dispatch({
                                        type: "SET_PAYMENT_FIELD",
                                        field: "cardExpiry",
                                        value: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="form-group">
                                  <label>CVV</label>
                                  <input
                                    type="password"
                                    maxLength="3"
                                    placeholder="•••"
                                    value={bookingState.payment.cardCvv}
                                    required
                                    onChange={(e) =>
                                      dispatch({
                                        type: "SET_PAYMENT_FIELD",
                                        field: "cardCvv",
                                        value: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {bookingState.payment.method === "UPI" && (
                            <div className="form-group">
                              <label>UPI ID</label>
                              <input
                                type="text"
                                placeholder="yourname@upi"
                                value={bookingState.payment.upiId}
                                required
                                onChange={(e) =>
                                  dispatch({
                                    type: "SET_PAYMENT_FIELD",
                                    field: "upiId",
                                    value: e.target.value,
                                  })
                                }
                              />
                            </div>
                          )}

                          {bookingState.payment.method === "Net Banking" && (
                            <div className="form-group">
                              <label>Select Bank</label>
                              <select required defaultValue="">
                                <option value="" disabled>
                                  Choose your bank
                                </option>
                                {[
                                  "SBI",
                                  "HDFC",
                                  "ICICI",
                                  "Axis",
                                  "Kotak",
                                  "PNB",
                                ].map((b) => (
                                  <option key={b}>{b}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {bookingState.payment.method === "Cash" && (
                            <div className="cash-info">
                              💡 Please pay at the reception desk before your
                              appointment.
                            </div>
                          )}

                          <div className="form-actions">
                            <button
                              type="submit"
                              className="btn btn-primary pay-btn"
                              disabled={loading}
                            >
                              {loading
                                ? "Processing Payment..."
                                : `Pay ₹${bookingState.pendingApt.payment_amount}`}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={handleDummyPayment}
                              disabled={loading}
                              title="Use a dummy/test payment method (development only)"
                            >
                              {loading ? "Processing..." : "Use Dummy Payment"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => dispatch({ type: "GO_TO_FORM" })}
                            >
                              ← Back
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                  {/* ── STEP 3: Success ── */}
                  {bookingState.step === "success" && (
                    <div className="booking-step success-step">
                      <div className="success-icon">
                        <FaCheckCircle />
                      </div>
                      <h3>Appointment Confirmed!</h3>
                      <p>
                        Your payment was successful and your appointment has
                        been scheduled.
                      </p>
                      <p className="success-sub">
                        You will receive a confirmation. Please arrive 10
                        minutes early.
                      </p>
                      <button
                        className="btn btn-primary"
                        onClick={resetBooking}
                      >
                        View My Appointments
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Appointments list */}
            {loading ? (
              <div className="loading">Loading appointments...</div>
            ) : (
              <div className="apt-list">
                {appointments.length === 0 ? (
                  <p className="no-data">
                    No appointments yet. Book your first appointment!
                  </p>
                ) : (
                  <>
                    {appointments.map((apt) => (
                      <div key={apt.id} className="apt-card">
                        <div className="apt-card-header">
                          <div className="apt-patient-info">
                            <span className="apt-patient-name">
                              <FaUserMd /> Dr. {apt.doctor_name}
                            </span>
                            <span className="apt-date">
                              {new Date(apt.appointment_date).toLocaleString()}
                            </span>
                          </div>
                          <div
                            className="apt-status-badge"
                            style={{
                              backgroundColor: statusColor(apt.status) + "22",
                              color: statusColor(apt.status),
                              border: `1px solid ${statusColor(apt.status)}`,
                            }}
                          >
                            {apt.status.replace("_", " ")}
                          </div>
                        </div>
                        <div className="apt-card-body">
                          {apt.reason && (
                            <p className="apt-reason">
                              <strong>Reason:</strong> {apt.reason}
                            </p>
                          )}
                          {apt.notes && (
                            <p className="apt-notes">
                              <strong>
                                <FaFileMedical /> Doctor's Notes:
                              </strong>{" "}
                              {apt.notes}
                            </p>
                          )}
                          <p className={`apt-payment ${apt.payment_status}`}>
                            {apt.payment_status === "paid"
                              ? `💳 Paid ₹${apt.payment_amount} via ${apt.payment_method}`
                              : "⏳ Payment pending"}
                          </p>
                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              marginTop: "10px",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              onClick={() => handlePrint(apt)}
                              className="btn btn-sm"
                              style={{
                                background: "#4CAF50",
                                color: "white",
                              }}
                            >
                              <FaPrint /> Print
                            </button>
                            {apt.status !== "completed" &&
                              apt.status !== "cancelled" && (
                                <>
                                  <button
                                    onClick={() =>
                                      dispatchModal({
                                        type: "OPEN_RESCHEDULE",
                                        payload: apt.id,
                                      })
                                    }
                                    className="btn btn-sm"
                                    style={{
                                      background: "#2196F3",
                                      color: "white",
                                    }}
                                  >
                                    <FaRedo /> Reschedule
                                  </button>
                                  <button
                                    onClick={() =>
                                      dispatchModal({
                                        type: "OPEN_CANCEL",
                                        payload: apt.id,
                                      })
                                    }
                                    className="btn btn-sm"
                                    style={{
                                      background: "#f44336",
                                      color: "white",
                                    }}
                                  >
                                    <FaTimes /> Cancel
                                  </button>
                                </>
                              )}
                            {apt.status === "completed" && (
                              <button
                                onClick={() =>
                                  dispatchModal({
                                    type: "OPEN_FEEDBACK",
                                    payload: apt.id,
                                  })
                                }
                                className="btn btn-sm"
                                style={{
                                  background: "#FF9800",
                                  color: "white",
                                }}
                              >
                                <FaStar /> Leave Feedback
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Feedback Form Modal */}
                    {modalState.feedback.id && (
                      <div className="modal-overlay">
                        <div className="modal-card">
                          <h3>
                            <FaStar /> Leave Feedback
                          </h3>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const apt = appointments.find(
                                (a) => a.id === modalState.feedback.id,
                              );
                              handleFeedbackSubmit(apt.id, apt.doctor_id);
                            }}
                          >
                            <div className="form-group">
                              <label>Rating</label>
                              <div className="rating-selector">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() =>
                                      dispatchModal({
                                        type: "SET_FEEDBACK_FIELD",
                                        field: "rating",
                                        value: star,
                                      })
                                    }
                                    style={{
                                      fontSize: "32px",
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      opacity:
                                        star <= modalState.feedback.rating
                                          ? 1
                                          : 0.3,
                                    }}
                                  >
                                    ⭐
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="form-group">
                              <label>Comment</label>
                              <textarea
                                rows="4"
                                placeholder="Share your experience..."
                                value={modalState.feedback.comment}
                                onChange={(e) =>
                                  dispatchModal({
                                    type: "SET_FEEDBACK_FIELD",
                                    field: "comment",
                                    value: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                            <div className="modal-actions">
                              <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                              >
                                {loading ? "Submitting..." : "Submit Feedback"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() =>
                                  dispatchModal({ type: "CLOSE_ALL" })
                                }
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {/* Reschedule Modal */}
                    {modalState.reschedule.id && (
                      <div className="modal-overlay">
                        <div className="modal-card">
                          <h3>
                            <FaRedo /> Reschedule Appointment
                          </h3>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleReschedule(modalState.reschedule.id);
                            }}
                          >
                            <div className="form-group">
                              <label>Select New Date & Time</label>
                              <input
                                type="datetime-local"
                                value={modalState.reschedule.date}
                                onChange={(e) =>
                                  dispatchModal({
                                    type: "SET_RESCHEDULE_DATE",
                                    payload: e.target.value,
                                  })
                                }
                                min={new Date().toISOString().slice(0, 16)}
                                className="form-control"
                                required
                              />
                            </div>
                            <div className="form-actions">
                              <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                              >
                                {loading
                                  ? "Rescheduling..."
                                  : "Confirm Reschedule"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() =>
                                  dispatchModal({ type: "CLOSE_ALL" })
                                }
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {/* Cancel Modal */}
                    {modalState.cancel.id && (
                      <div className="modal-overlay">
                        <div className="modal-card">
                          <h3>
                            <FaTimes /> Cancel Appointment
                          </h3>
                          <p style={{ color: "#666", marginBottom: "20px" }}>
                            Please provide a reason for cancellation. You may be
                            eligible for a refund.
                          </p>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleCancel(modalState.cancel.id);
                            }}
                          >
                            <div className="form-group">
                              <label>Reason for Cancellation</label>
                              <textarea
                                value={modalState.cancel.reason}
                                onChange={(e) =>
                                  dispatchModal({
                                    type: "SET_CANCEL_REASON",
                                    payload: e.target.value,
                                  })
                                }
                                className="form-control"
                                placeholder="Please tell us why you're cancelling..."
                                rows="4"
                                required
                              />
                            </div>
                            <div className="form-actions">
                              <button
                                type="submit"
                                className="btn btn-danger"
                                disabled={loading}
                              >
                                {loading
                                  ? "Cancelling..."
                                  : "Cancel Appointment"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() =>
                                  dispatchModal({ type: "CLOSE_ALL" })
                                }
                              >
                                Keep Appointment
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PRESCRIPTIONS TAB ── */}
        {activeTab === "prescriptions" && (
          <div className="tab-content">
            <h2>My Prescriptions</h2>
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <div className="prescriptions-grid">
                {prescriptions.length === 0 ? (
                  <p className="no-data">No prescriptions available.</p>
                ) : (
                  prescriptions.map((rx) => (
                    <div key={rx.id} className="prescription-card">
                      <div className="card-header">
                        <h3>Dr. {rx.doctor_name}</h3>
                        <span className="date">
                          {new Date(rx.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="card-body">
                        <div className="field">
                          <strong>Diagnosis:</strong>
                          <p>{rx.diagnosis}</p>
                        </div>
                        <div className="field">
                          <strong>Medications:</strong>
                          <p>{rx.medications}</p>
                        </div>
                        <div className="field">
                          <strong>Instructions:</strong>
                          <p>{rx.instructions || "No special instructions"}</p>
                        </div>
                      </div>
                      <div className="card-footer">
                        <button
                          onClick={() => handleDownloadPrescription(rx.id)}
                          className="btn btn-sm"
                          style={{
                            background: "#667eea",
                            color: "white",
                          }}
                        >
                          <FaDownload /> Download PDF
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MEDICAL HISTORY TAB ── */}
        {activeTab === "history" && (
          <div className="tab-content">
            <h2>📋 Complete Medical History</h2>
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <>
                {/* Summary from prescriptions pulled in appointments */}
                {medicalHistory.length === 0 ? (
                  <div className="history-empty">
                    <div className="history-empty-icon">
                      <FaBoxOpen />
                    </div>
                    <p>No medical history records found.</p>
                    <p className="history-empty-sub">
                      Your medical history will appear here after your
                      appointments.
                    </p>
                  </div>
                ) : (
                  <div className="history-timeline">
                    {medicalHistory.map((record, idx) => (
                      <div key={record.id} className="timeline-item">
                        <div className="timeline-dot" />
                        {idx < medicalHistory.length - 1 && (
                          <div className="timeline-line" />
                        )}
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <h3>{record.condition}</h3>
                            <span className="timeline-date">
                              {record.diagnosed_date
                                ? new Date(
                                    record.diagnosed_date,
                                  ).toLocaleDateString("en-IN", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })
                                : "Date not recorded"}
                            </span>
                          </div>
                          {record.description && (
                            <p className="timeline-desc">
                              {record.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientDashboard;

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "./ThemeContext";
import {
  doctorService,
  departmentService,
  billingService,
  patientService,
  inventoryService,
} from "../services/api";
import "./Dashboard.css";
import {
  FaUserShield,
  FaChartLine,
  FaSignOutAlt,
  FaUserMd,
  FaUserInjured,
  FaBuilding,
  FaFileInvoiceDollar,
  FaBoxes,
  FaPlus,
  FaEdit,
  FaTrash,
  FaExclamationTriangle,
  FaMoon,
  FaSun,
} from "react-icons/fa"; // This line is not part of the change, just for context
import DataTable from "./DataTable";

const EMPTY_DOCTOR = {
  name: "",
  email: "",
  password: "",
  phone: "",
  specialization: "",
  qualification: "",
  experience: "",
  consultation_fee: "",
  department_id: "",
};

const EMPTY_INVENTORY = {
  name: "",
  category: "",
  quantity: "",
  unit: "",
  threshold: "10",
  expiry_date: "",
  supplier: "",
};

const EMPTY_DEPARTMENT = {
  name: "",
  description: "",
};

const initialDepartmentState = {
  showForm: false,
  departmentData: EMPTY_DEPARTMENT,
};

function departmentReducer(state, action) {
  switch (action.type) {
    case "TOGGLE_FORM":
      return {
        ...state,
        showForm: !state.showForm,
        departmentData: EMPTY_DEPARTMENT,
      };
    case "CLOSE_FORM":
      return { ...state, showForm: false, departmentData: EMPTY_DEPARTMENT };
    case "SET_FIELD":
      return {
        ...state,
        departmentData: {
          ...state.departmentData,
          [action.field]: action.value,
        },
      };
    default:
      return state;
  }
}

const initialInventoryState = {
  showForm: false,
  editingItem: null,
  itemData: EMPTY_INVENTORY,
  showDeleteConfirm: null,
};

function inventoryReducer(state, action) {
  switch (action.type) {
    case "OPEN_ADD_FORM":
      return {
        ...state,
        showForm: true,
        editingItem: null,
        itemData: EMPTY_INVENTORY,
      };
    case "OPEN_EDIT_FORM":
      return {
        ...state,
        showForm: true,
        editingItem: action.payload,
        itemData: { ...EMPTY_INVENTORY, ...action.payload },
      };
    case "CLOSE_FORM":
      return { ...state, showForm: false, editingItem: null };
    case "SET_FIELD":
      return {
        ...state,
        itemData: { ...state.itemData, [action.field]: action.value },
      };
    case "SET_DELETE_CONFIRM":
      return { ...state, showDeleteConfirm: action.payload };
    default:
      return state;
  }
}

const initialDoctorState = {
  showForm: false,
  editingDoctor: null, // null for 'add' mode, doctor object for 'edit'
  doctorData: EMPTY_DOCTOR,
  showDeleteConfirm: null, // holds doctor ID for deletion
};

function doctorReducer(state, action) {
  switch (action.type) {
    case "OPEN_ADD_FORM":
      return {
        ...state,
        showForm: true,
        editingDoctor: null,
        doctorData: EMPTY_DOCTOR,
      };
    case "OPEN_EDIT_FORM":
      return {
        ...state,
        showForm: true,
        editingDoctor: action.payload,
        doctorData: {
          name: action.payload.name || "",
          email: action.payload.email || "",
          password: "", // Always clear password on open
          phone: action.payload.phone || "",
          specialization: action.payload.specialization || "",
          qualification: action.payload.qualification || "",
          experience: action.payload.experience || "",
          consultation_fee: action.payload.consultation_fee || "",
          department_id: action.payload.department_id || "",
        },
      };
    case "CLOSE_FORM":
      return { ...state, showForm: false, editingDoctor: null };
    case "SET_FIELD":
      return {
        ...state,
        doctorData: { ...state.doctorData, [action.field]: action.value },
      };
    case "SET_DELETE_CONFIRM":
      return { ...state, showDeleteConfirm: action.payload };
    default:
      return state;
  }
}

function SuperAdminDashboard({ user, onLogout }) {
  const getApiErrorMessage = (err, defaultMessage) => {
    if (err.isAxiosError && !err.response) {
      return "Network Error: Could not connect to the backend. Please ensure it's running.";
    }
    return err.response?.data?.message || defaultMessage;
  };

  const [activeTab, setActiveTab] = useState("doctors");
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [billingReports, setBillingReports] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // Doctor management state
  const [doctorState, dispatchDoctor] = React.useReducer(
    doctorReducer,
    initialDoctorState,
  );

  // Department management state
  const [departmentState, dispatchDepartment] = React.useReducer(
    departmentReducer,
    initialDepartmentState,
  );
  const [inventoryState, dispatchInventory] = React.useReducer(
    inventoryReducer,
    initialInventoryState,
  );

  const [showDeletePatientConfirm, setShowDeletePatientConfirm] =
    useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const showMsg = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "doctors":
          const [docsRes, deptsRes] = await Promise.all([
            doctorService.getDoctors(),
            departmentService.getDepartments(),
          ]);
          setDoctors(docsRes.data);
          setDepartments(deptsRes.data);
          break;
        case "departments":
          const deptRes = await departmentService.getDepartments();
          setDepartments(deptRes.data);
          break;
        case "billing":
          const billRes = await billingService.getBillingReports();
          setBillingReports(billRes.data.bills);
          setTotalRevenue(billRes.data.total_revenue);
          break;
        case "patients":
          const patRes = await patientService.getPatients();
          setPatients(patRes.data);
          break;
        case "inventory":
          const invRes = await inventoryService.getItems();
          setInventoryItems(invRes.data);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Submit add / edit ──────────────────────────────────────────────────────
  const handleDoctorSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...doctorState.doctorData,
      department_id: doctorState.doctorData.department_id
        ? parseInt(doctorState.doctorData.department_id)
        : null,
      experience: doctorState.doctorData.experience
        ? parseInt(doctorState.doctorData.experience)
        : null,
      consultation_fee: doctorState.doctorData.consultation_fee
        ? parseFloat(doctorState.doctorData.consultation_fee)
        : null,
    };

    try {
      if (doctorState.editingDoctor) {
        await doctorService.updateDoctor(doctorState.editingDoctor.id, payload);
        showMsg("Doctor updated successfully!");
      } else {
        await doctorService.addDoctor(payload);
        showMsg("Doctor added successfully!");
      }
      dispatchDoctor({ type: "CLOSE_FORM" });
      loadData();
    } catch (err) {
      console.error("Error saving doctor:", err);
      showMsg(getApiErrorMessage(err, "Error saving doctor."), "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Delete doctor ──────────────────────────────────────────────────────────
  const handleDeleteDoctor = async (id) => {
    setLoading(true);
    try {
      await doctorService.deleteDoctor(id);
      showMsg("Doctor deleted successfully!");
      dispatchDoctor({ type: "SET_DELETE_CONFIRM", payload: null });
      loadData();
    } catch (err) {
      console.error("Error deleting doctor:", err);
      showMsg(getApiErrorMessage(err, "Error deleting doctor."), "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Delete patient ─────────────────────────────────────────────────────────
  const handleDeletePatient = async (id) => {
    setLoading(true);
    try {
      await patientService.deletePatient(id);
      showMsg("Patient deleted successfully!");
      setShowDeletePatientConfirm(null);
      loadData();
    } catch (err) {
      console.error("Error deleting patient:", err);
      showMsg(getApiErrorMessage(err, "Error deleting patient."), "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Add Department ─────────────────────────────────────────────────────────
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await departmentService.addDepartment(departmentState.departmentData);
      showMsg("Department added successfully!");
      dispatchDepartment({ type: "CLOSE_FORM" });
      loadData();
    } catch (err) {
      console.error("Error adding department:", err);
      showMsg(getApiErrorMessage(err, "Error adding department."), "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Delete Department ─────────────────────────────────────────────────────────
  const handleDeleteDepartment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department?"))
      return;
    setLoading(true);
    try {
      await departmentService.deleteDepartment(id);
      showMsg("Department deleted successfully!");
      loadData();
    } catch (err) {
      console.error("Error deleting department:", err);
      showMsg(getApiErrorMessage(err, "Error deleting department."), "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Inventory Logic ────────────────────────────────────────────────────────
  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (inventoryState.editingItem) {
        await inventoryService.updateItem(
          inventoryState.editingItem.id,
          inventoryState.itemData,
        );
        showMsg("Item updated successfully!");
      } else {
        await inventoryService.addItem(inventoryState.itemData);
        showMsg("Item added successfully!");
      }
      dispatchInventory({ type: "CLOSE_FORM" });
      loadData();
    } catch (err) {
      console.error("Error saving item:", err);
      showMsg(getApiErrorMessage(err, "Error saving item."), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInventory = async (id) => {
    setLoading(true);
    try {
      await inventoryService.deleteItem(id);
      showMsg("Item deleted successfully!");
      dispatchInventory({ type: "SET_DELETE_CONFIRM", payload: null });
      loadData();
    } catch (err) {
      console.error("Error deleting item:", err);
      showMsg(getApiErrorMessage(err, "Error deleting item."), "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>
            <FaUserShield /> Super Admin Dashboard
          </h1>
          <div className="user-info">
            <span>Welcome, {user.name}</span>
            <Link
              to="/analytics"
              className="btn btn-primary"
              style={{ marginRight: "10px" }}
            >
              <FaChartLine /> Analytics
            </Link>
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
              "doctors",
              <span>
                <FaUserMd /> Manage Doctors
              </span>,
            ],
            [
              "patients",
              <span>
                <FaUserInjured /> Manage Patients
              </span>,
            ],
            [
              "departments",
              <span>
                <FaBuilding /> Manage Departments
              </span>,
            ],
            [
              "billing",
              <span>
                <FaFileInvoiceDollar /> Billing Reports
              </span>,
            ],
            [
              "inventory",
              <span>
                <FaBoxes /> Inventory
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

        {/* ── DOCTORS TAB ── */}
        {activeTab === "doctors" && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Doctors Management</h2>
              <button
                onClick={() => dispatchDoctor({ type: "OPEN_ADD_FORM" })}
                className="btn btn-primary"
              >
                <FaPlus /> Add Doctor
              </button>
            </div>

            {/* Add / Edit Form */}
            {doctorState.showForm && (
              <div className="form-container">
                <h3>
                  {doctorState.editingDoctor ? (
                    <span>
                      <FaEdit /> Edit Dr. {doctorState.editingDoctor.name}
                    </span>
                  ) : (
                    "Add New Doctor"
                  )}
                </h3>
                <form onSubmit={handleDoctorSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        value={doctorState.doctorData.name}
                        onChange={(e) =>
                          dispatchDoctor({
                            type: "SET_FIELD",
                            field: "name",
                            value: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        value={doctorState.doctorData.email}
                        onChange={(e) =>
                          dispatchDoctor({
                            type: "SET_FIELD",
                            field: "email",
                            value: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>
                        {doctorState.editingDoctor
                          ? "New Password (leave blank to keep)"
                          : "Password *"}
                      </label>
                      <input
                        type="password"
                        value={doctorState.doctorData.password}
                        onChange={(e) =>
                          dispatchDoctor({
                            type: "SET_FIELD",
                            field: "password",
                            value: e.target.value,
                          })
                        }
                        required={!doctorState.editingDoctor}
                        placeholder={
                          doctorState.editingDoctor
                            ? "Leave blank to keep current"
                            : ""
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        value={doctorState.doctorData.phone}
                        onChange={(e) =>
                          dispatchDoctor({
                            type: "SET_FIELD",
                            field: "phone",
                            value: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Department *</label>
                      <select
                        value={doctorState.doctorData.department_id}
                        onChange={(e) =>
                          dispatchDoctor({
                            type: "SET_FIELD",
                            field: "department_id",
                            value: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Specialization</label>
                      <input
                        type="text"
                        value={doctorState.doctorData.specialization}
                        onChange={(e) =>
                          dispatchDoctor({
                            type: "SET_FIELD",
                            field: "specialization",
                            value: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Qualification</label>
                      <input
                        type="text"
                        value={doctorState.doctorData.qualification}
                        onChange={(e) =>
                          dispatchDoctor({
                            type: "SET_FIELD",
                            field: "qualification",
                            value: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Experience (years)</label>
                      <input
                        type="number"
                        value={doctorState.doctorData.experience}
                        onChange={(e) =>
                          dispatchDoctor({
                            type: "SET_FIELD",
                            field: "experience",
                            value: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Consultation Fee (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={doctorState.doctorData.consultation_fee}
                      onChange={(e) =>
                        dispatchDoctor({
                          type: "SET_FIELD",
                          field: "consultation_fee",
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
                      {loading
                        ? "Saving..."
                        : doctorState.editingDoctor
                          ? "Update Doctor"
                          : "Add Doctor"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        dispatchDoctor({ type: "CLOSE_FORM" });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {doctorState.showDeleteConfirm && (
              <div className="modal-overlay">
                <div className="modal-card">
                  <div className="modal-icon">
                    <FaTrash />
                  </div>
                  <h3>Delete Doctor?</h3>
                  <p>
                    This will permanently delete the doctor and all their
                    associated records.
                    <br />
                    This action <strong>cannot be undone</strong>.
                  </p>
                  <div className="modal-actions">
                    <button
                      className="btn btn-danger"
                      disabled={loading}
                      onClick={() =>
                        handleDeleteDoctor(doctorState.showDeleteConfirm)
                      }
                    >
                      {loading ? "Deleting..." : "Yes, Delete"}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        dispatchDoctor({
                          type: "SET_DELETE_CONFIRM",
                          payload: null,
                        })
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <DataTable
              loading={loading}
              columns={[
                "#",
                "Name",
                "Email",
                "Specialization",
                "Department",
                "Fee (₹)",
                "Actions",
              ]}
              data={doctors}
              emptyMessage="No doctors found. Add your first doctor!"
              renderRow={(doctor, idx) => (
                <tr key={doctor.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <strong>Dr. {doctor.name}</strong>
                  </td>
                  <td>{doctor.email}</td>
                  <td>{doctor.specialization || "-"}</td>
                  <td>{doctor.department || "-"}</td>
                  <td>₹{doctor.consultation_fee || "0"}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() =>
                          dispatchDoctor({
                            type: "OPEN_EDIT_FORM",
                            payload: doctor,
                          })
                        }
                        className="btn btn-sm btn-edit"
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        onClick={() =>
                          dispatchDoctor({
                            type: "SET_DELETE_CONFIRM",
                            payload: doctor.id,
                          })
                        }
                        className="btn btn-sm btn-danger"
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            />
          </div>
        )}

        {/* ── PATIENTS TAB ── */}
        {activeTab === "patients" && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Patients Management</h2>
            </div>

            {showDeletePatientConfirm && (
              <div className="modal-overlay">
                <div className="modal-card">
                  <div className="modal-icon">
                    <FaTrash />
                  </div>
                  <h3>Delete Patient?</h3>
                  <p>
                    This will permanently delete the patient and all their
                    associated records.
                    <br />
                    This action <strong>cannot be undone</strong>.
                  </p>
                  <div className="modal-actions">
                    <button
                      className="btn btn-danger"
                      disabled={loading}
                      onClick={() =>
                        handleDeletePatient(showDeletePatientConfirm)
                      }
                    >
                      {loading ? "Deleting..." : "Yes, Delete"}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowDeletePatientConfirm(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <DataTable
              loading={loading}
              columns={["#", "Name", "Email", "Phone", "Actions"]}
              data={patients}
              emptyMessage="No patients found."
              renderRow={(p, idx) => (
                <tr key={p.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td>{p.email}</td>
                  <td>{p.phone || "-"}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => setShowDeletePatientConfirm(p.id)}
                        className="btn btn-sm btn-danger"
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            />
          </div>
        )}

        {/* ── DEPARTMENTS TAB ── */}
        {activeTab === "departments" && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Departments Management</h2>
              <button
                onClick={() => dispatchDepartment({ type: "TOGGLE_FORM" })}
                className="btn btn-primary"
              >
                {departmentState.showForm ? (
                  "Cancel"
                ) : (
                  <span>
                    <FaPlus /> Add Department
                  </span>
                )}
              </button>
            </div>
            {departmentState.showForm && (
              <div className="form-container">
                <h3>Add New Department</h3>
                <form onSubmit={handleAddDepartment}>
                  <div className="form-group">
                    <label>Department Name *</label>
                    <input
                      type="text"
                      value={departmentState.departmentData.name}
                      onChange={(e) =>
                        dispatchDepartment({
                          type: "SET_FIELD",
                          field: "name",
                          value: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={departmentState.departmentData.description}
                      rows="3"
                      onChange={(e) =>
                        dispatchDepartment({
                          type: "SET_FIELD",
                          field: "description",
                          value: e.target.value,
                        })
                      }
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Adding..." : "Add Department"}
                  </button>
                </form>
              </div>
            )}
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <div className="departments-grid">
                {departments.length === 0 ? (
                  <p className="no-data">No departments found.</p>
                ) : (
                  departments.map((dept) => (
                    <div key={dept.id} className="department-card">
                      <h3>{dept.name}</h3>
                      <p>{dept.description || "No description available"}</p>
                      <div
                        className="action-buttons"
                        style={{ marginTop: "1rem" }}
                      >
                        <button
                          onClick={() => handleDeleteDepartment(dept.id)}
                          className="btn btn-sm btn-danger"
                          disabled={loading}
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ── BILLING TAB ── */}
        {activeTab === "billing" && (
          <div className="tab-content">
            <h2>Billing Reports</h2>
            <div className="stats-card">
              <h3>Total Revenue</h3>
              <div className="stat-value">₹{totalRevenue.toFixed(2)}</div>
            </div>
            <DataTable
              loading={loading}
              columns={[
                "Patient",
                "Amount",
                "Description",
                "Method",
                "Status",
                "Date",
              ]}
              data={billingReports}
              emptyMessage="No billing records found."
              renderRow={(bill) => (
                <tr key={bill.id}>
                  <td>{bill.patient_name}</td>
                  <td>₹{bill.amount}</td>
                  <td>{bill.description || "-"}</td>
                  <td>{bill.payment_method || "-"}</td>
                  <td>
                    <span className={`status status-${bill.status}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td>{new Date(bill.created_at).toLocaleDateString()}</td>
                </tr>
              )}
            />
          </div>
        )}

        {/* ── INVENTORY TAB ── */}
        {activeTab === "inventory" && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Inventory Management</h2>
              <button
                onClick={() => dispatchInventory({ type: "OPEN_ADD_FORM" })}
                className="btn btn-primary"
              >
                <FaPlus /> Add Item
              </button>
            </div>

            {inventoryState.showForm && (
              <div className="form-container">
                <h3>
                  {inventoryState.editingItem ? "Edit Item" : "Add New Item"}
                </h3>
                <form onSubmit={handleInventorySubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Item Name *</label>
                      <input
                        type="text"
                        required
                        value={inventoryState.itemData.name}
                        onChange={(e) =>
                          dispatchInventory({
                            type: "SET_FIELD",
                            field: "name",
                            value: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <input
                        type="text"
                        placeholder="e.g. Medicine, Equipment"
                        value={inventoryState.itemData.category}
                        onChange={(e) =>
                          dispatchInventory({
                            type: "SET_FIELD",
                            field: "category",
                            value: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Quantity *</label>
                      <input
                        type="number"
                        required
                        value={inventoryState.itemData.quantity}
                        onChange={(e) =>
                          dispatchInventory({
                            type: "SET_FIELD",
                            field: "quantity",
                            value: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Unit</label>
                      <input
                        type="text"
                        placeholder="e.g. boxes, strips"
                        value={inventoryState.itemData.unit}
                        onChange={(e) =>
                          dispatchInventory({
                            type: "SET_FIELD",
                            field: "unit",
                            value: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Low Stock Threshold</label>
                      <input
                        type="number"
                        value={inventoryState.itemData.threshold}
                        onChange={(e) =>
                          dispatchInventory({
                            type: "SET_FIELD",
                            field: "threshold",
                            value: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Expiry Date</label>
                      <input
                        type="date"
                        value={inventoryState.itemData.expiry_date}
                        onChange={(e) =>
                          dispatchInventory({
                            type: "SET_FIELD",
                            field: "expiry_date",
                            value: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Supplier</label>
                    <input
                      type="text"
                      value={inventoryState.itemData.supplier}
                      onChange={(e) =>
                        dispatchInventory({
                          type: "SET_FIELD",
                          field: "supplier",
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
                      {loading ? "Saving..." : "Save Item"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => dispatchInventory({ type: "CLOSE_FORM" })}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {inventoryState.showDeleteConfirm && (
              <div className="modal-overlay">
                <div className="modal-card">
                  <h3>Delete Item?</h3>
                  <p>Are you sure you want to delete this inventory item?</p>
                  <div className="modal-actions">
                    <button
                      className="btn btn-danger"
                      onClick={() =>
                        handleDeleteInventory(inventoryState.showDeleteConfirm)
                      }
                    >
                      Yes, Delete
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        dispatchInventory({
                          type: "SET_DELETE_CONFIRM",
                          payload: null,
                        })
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <DataTable
              loading={loading}
              columns={["Name", "Category", "Stock", "Expiry", "Actions"]}
              data={inventoryItems}
              emptyMessage="No inventory items found."
              renderRow={(item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{item.category}</td>
                  <td
                    style={{
                      color:
                        item.quantity <= item.threshold ? "red" : "inherit",
                      fontWeight:
                        item.quantity <= item.threshold ? "bold" : "normal",
                    }}
                  >
                    {item.quantity} {item.unit}{" "}
                    {item.quantity <= item.threshold && (
                      <FaExclamationTriangle />
                    )}
                  </td>
                  <td>{item.expiry_date || "-"}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-sm btn-edit"
                        onClick={() =>
                          dispatchInventory({
                            type: "OPEN_EDIT_FORM",
                            payload: item,
                          })
                        }
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() =>
                          dispatchInventory({
                            type: "SET_DELETE_CONFIRM",
                            payload: item.id,
                          })
                        }
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default SuperAdminDashboard;

from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_mail import Mail, Message
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import jwt
import os
from threading import Thread

app = Flask(__name__, template_folder='templates')
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'hospital.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'

# Flask-Mail configuration
# In production, ensure these environment variables are set.
app.config.update(
    MAIL_SERVER=os.environ.get('MAIL_SERVER'),
    MAIL_PORT=int(os.environ.get('MAIL_PORT', 587)),
    MAIL_USE_TLS=os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', '1', 't'],
    MAIL_USERNAME=os.environ.get('MAIL_USERNAME'),
    MAIL_PASSWORD=os.environ.get('MAIL_PASSWORD'),
    MAIL_DEFAULT_SENDER=os.environ.get('MAIL_DEFAULT_SENDER', 'noreply@hospital.com')
)

# If mail server is not configured, emails will be printed to the console.
if not app.config.get('MAIL_SERVER'):
    app.config['MAIL_SUPPRESS_SEND'] = True

mail = Mail(app)
# More specific CORS configuration for development
CORS(app, resources={r"/api/*": {
    "origins": "*",  # In production, you should restrict this to your frontend's domain
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Authorization", "Content-Type"]
}})

db = SQLAlchemy(app)

# ── Models ────────────────────────────────────────────────────────────────────

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Department(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Doctor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('department.id'))
    specialization = db.Column(db.String(100))
    qualification = db.Column(db.String(200))
    experience = db.Column(db.Integer)
    consultation_fee = db.Column(db.Float)
    user = db.relationship('User', backref='doctor_profile')
    department = db.relationship('Department', backref='doctors')

class Patient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date_of_birth = db.Column(db.Date)
    blood_group = db.Column(db.String(5))
    address = db.Column(db.Text)
    emergency_contact = db.Column(db.String(20))
    user = db.relationship('User', backref='patient_profile')

class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patient.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctor.id'), nullable=False)
    appointment_date = db.Column(db.DateTime, nullable=False)
    # status: pending_payment | scheduled | confirmed | completed | cancelled
    status = db.Column(db.String(20), default='pending_payment')
    reason = db.Column(db.Text)
    notes = db.Column(db.Text)
    payment_status = db.Column(db.String(20), default='unpaid')  # unpaid | paid
    payment_amount = db.Column(db.Float, default=0)
    payment_method = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    patient = db.relationship('Patient', backref='appointments')
    doctor = db.relationship('Doctor', backref='appointments')

class Prescription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointment.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patient.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctor.id'), nullable=False)
    diagnosis = db.Column(db.Text)
    medications = db.Column(db.Text)
    instructions = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    appointment = db.relationship('Appointment', backref='prescription')
    patient = db.relationship('Patient', backref='prescriptions')
    doctor = db.relationship('Doctor', backref='prescriptions')

class MedicalHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patient.id'), nullable=False)
    condition = db.Column(db.String(200))
    description = db.Column(db.Text)
    diagnosed_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    patient = db.relationship('Patient', backref='medical_history')

class Billing(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patient.id'), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointment.id'))
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')
    payment_method = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    patient = db.relationship('Patient', backref='bills')
    appointment = db.relationship('Appointment', backref='billing')

class DoctorAvailability(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctor.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.String(5), nullable=False)  # HH:MM format
    is_available = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    doctor = db.relationship('Doctor', backref='availability_slots')

class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointment.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patient.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctor.id'), nullable=False)
    rating = db.Column(db.Integer, default=5)  # 1-5 stars
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    appointment = db.relationship('Appointment', backref='feedback')
    patient = db.relationship('Patient', backref='feedbacks')
    doctor = db.relationship('Doctor', backref='feedbacks')

class InventoryItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50))
    quantity = db.Column(db.Integer, default=0)
    unit = db.Column(db.String(20)) # e.g., boxes, strips, bottles
    threshold = db.Column(db.Integer, default=10) # Low stock alert level
    expiry_date = db.Column(db.Date)
    supplier = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)




# ── Helpers ───────────────────────────────────────────────────────────────────

def send_async_email(app, msg):
    with app.app_context():
        try:
            mail.send(msg)
        except Exception as e:
            # In a real app, you'd want to log this error.
            print(f"Error sending email: {e}")

def send_email(to, subject, template, **kwargs):
    """Sends an asynchronous email."""
    # Do not send emails if mail is not configured
    if not app.config.get('MAIL_USERNAME'):
        print("MAIL_USERNAME not configured. Skipping email.")
        # Also print the would-be email to console for debugging
        print("--- WOULD BE EMAIL ---")
        print(f"To: {to}")
        print(f"Subject: {subject}")
        print("----------------------")
        return

    msg = Message(subject, recipients=[to], sender=app.config['MAIL_DEFAULT_SENDER'])
    msg.html = render_template(template, **kwargs)
    Thread(target=send_async_email, args=(app, msg)).start()

def send_appointment_reminders():
    """
    Sends reminders for appointments that are within the next 24 hours.
    This function is intended to be run periodically by a scheduler.
    """
    with app.app_context():
        print("Checking for appointments to send reminders...")
        
        now = datetime.utcnow()
        # Look for appointments in a 2-hour window, 24 hours from now
        reminder_window_start = now + timedelta(hours=23)
        reminder_window_end = now + timedelta(hours=25)

        appointments_to_remind = Appointment.query.filter(
            Appointment.appointment_date >= reminder_window_start,
            Appointment.appointment_date <= reminder_window_end,
            Appointment.status == 'scheduled'
        ).all()

        if not appointments_to_remind:
            print("No appointments found in the reminder window.")
            return

        for apt in appointments_to_remind:
            try:
                patient_user = User.query.get(apt.patient.user_id)
                print(f"Sending reminder for appointment {apt.id} to {patient_user.email}...")
                send_email(
                    patient_user.email,
                    'Appointment Reminder',
                    'email/appointment_reminder.html',
                    appointment=apt,
                    patient=patient_user
                )
            except Exception as e:
                print(f"Error sending reminder for appointment {apt.id}: {e}")
        
        print(f"Sent {len(appointments_to_remind)} reminders.")

def generate_token(user_id, role):
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.utcnow() + timedelta(days=1)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def token_required(f):
    def decorator(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        try:
            token = token.split(' ')[1]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
        except Exception as e:
            return jsonify({'message': 'Invalid token'}), 401
        return f(current_user, *args, **kwargs)
    decorator.__name__ = f.__name__
    return decorator

# ── Auth ──────────────────────────────────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already exists'}), 400
    hashed_password = generate_password_hash(data['password'])
    user = User(email=data['email'], password=hashed_password,
                role=data.get('role', 'patient'), name=data['name'],
                phone=data.get('phone'))
    db.session.add(user)
    db.session.commit()
    if user.role == 'patient':
        db.session.add(Patient(user_id=user.id))
        db.session.commit()

    # Send welcome email
    try:
        send_email(user.email, 'Welcome to the Hospital Management System',
                   'email/welcome.html', user=user)
    except Exception as e:
        print(f"Failed to send welcome email: {e}") # Log error but don't fail registration

    token = generate_token(user.id, user.role)
    return jsonify({'token': token,
                    'user': {'id': user.id, 'email': user.email,
                             'name': user.name, 'role': user.role}}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'message': 'Invalid credentials'}), 401
    token = generate_token(user.id, user.role)
    return jsonify({'token': token,
                    'user': {'id': user.id, 'email': user.email,
                             'name': user.name, 'role': user.role}})

# ── Appointments ──────────────────────────────────────────────────────────────

@app.route('/api/appointments', methods=['POST'])
@token_required
def book_appointment(current_user):
    if current_user.role != 'patient':
        return jsonify({'message': 'Only patients can book appointments'}), 403
    data = request.json
    patient = Patient.query.filter_by(user_id=current_user.id).first()
    doctor = Doctor.query.get(data['doctor_id'])
    fee = doctor.consultation_fee if doctor and doctor.consultation_fee else 0

    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=data['doctor_id'],
        appointment_date=datetime.fromisoformat(data['appointment_date']),
        reason=data.get('reason'),
        status='pending_payment',
        payment_status='unpaid',
        payment_amount=fee
    )
    db.session.add(appointment)
    db.session.commit()
    return jsonify({
        'message': 'Appointment created. Please complete payment.',
        'appointment_id': appointment.id,
        'payment_amount': fee
    }), 201

@app.route('/api/appointments/<int:id>/pay', methods=['POST'])
@token_required
def pay_appointment(current_user, id):
    """Patient pays for an appointment to confirm it."""
    appointment = Appointment.query.get(id)
    if not appointment:
        return jsonify({'message': 'Appointment not found'}), 404

    patient = Patient.query.filter_by(user_id=current_user.id).first()
    if appointment.patient_id != patient.id:
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.json
    appointment.payment_status = 'paid'
    appointment.payment_method = data.get('payment_method', 'card')
    appointment.status = 'scheduled'

    # Create billing record
    bill = Billing(
        patient_id=patient.id,
        appointment_id=appointment.id,
        amount=appointment.payment_amount,
        description=f'Consultation fee',
        status='paid',
        payment_method=data.get('payment_method', 'card')
    )
    db.session.add(bill)
    db.session.commit()

    # Send confirmation email
    try:
        patient_user = User.query.get(appointment.patient.user_id)
        send_email(patient_user.email, 'Your Appointment is Confirmed',
                   'email/appointment_confirmation.html',
                   appointment=appointment,
                   patient=patient_user)
    except Exception as e:
        print(f"Failed to send appointment confirmation email: {e}")

    return jsonify({'message': 'Payment successful. Appointment confirmed!'})

@app.route('/api/appointments', methods=['GET'])
@token_required
def get_appointments(current_user):
    if current_user.role == 'patient':
        patient = Patient.query.filter_by(user_id=current_user.id).first()
        appointments = Appointment.query.filter_by(patient_id=patient.id).all()
    elif current_user.role in ['doctor', 'admin']:
        doctor = Doctor.query.filter_by(user_id=current_user.id).first()
        appointments = Appointment.query.filter_by(doctor_id=doctor.id).all() if doctor else Appointment.query.all()
    else:
        appointments = Appointment.query.all()

    result = []
    for apt in appointments:
        result.append({
            'id': apt.id,
            'patient_id': apt.patient_id,
            'patient_name': apt.patient.user.name,
            'doctor_name': apt.doctor.user.name,
            'appointment_date': apt.appointment_date.isoformat(),
            'status': apt.status,
            'reason': apt.reason,
            'notes': apt.notes,
            'payment_status': apt.payment_status,
            'payment_amount': apt.payment_amount,
            'payment_method': apt.payment_method,
        })
    return jsonify(result)

@app.route('/api/appointments/<int:id>', methods=['PUT'])
@token_required
def update_appointment(current_user, id):
    if current_user.role not in ['doctor', 'admin', 'super_admin']:
        return jsonify({'message': 'Unauthorized'}), 403
    appointment = Appointment.query.get(id)
    if not appointment:
        return jsonify({'message': 'Appointment not found'}), 404
    data = request.json
    if 'status' in data:
        appointment.status = data['status']
    if 'notes' in data:
        appointment.notes = data['notes']
    db.session.commit()
    return jsonify({'message': 'Appointment updated successfully'})

@app.route('/api/appointments/<int:id>/reschedule', methods=['POST'])
@token_required
def reschedule_appointment(current_user, id):
    """Reschedule an appointment to a new date/time."""
    appointment = Appointment.query.get(id)
    if not appointment:
        return jsonify({'message': 'Appointment not found'}), 404
    
    patient = Patient.query.filter_by(user_id=current_user.id).first()
    if appointment.patient_id != patient.id and current_user.role not in ['admin', 'super_admin']:
        return jsonify({'message': 'Unauthorized'}), 403
    
    if appointment.status == 'cancelled':
        return jsonify({'message': 'Cannot reschedule a cancelled appointment'}), 400
    
    data = request.json
    new_date = datetime.fromisoformat(data['new_appointment_date'])
    
    # Check if the new date is in the future
    if new_date < datetime.utcnow():
        return jsonify({'message': 'Cannot reschedule to a past date'}), 400
    
    appointment.appointment_date = new_date
    appointment.status = 'scheduled'
    db.session.commit()
    
    # Send reschedule notification email
    try:
        patient_user = User.query.get(appointment.patient.user_id)
        send_email(patient_user.email, 'Your Appointment Has Been Rescheduled',
                   'email/appointment_update.html',
                   appointment=appointment,
                   patient=patient_user,
                   update_type='rescheduled')
    except Exception as e:
        print(f"Failed to send reschedule notification email: {e}")
    
    return jsonify({
        'message': 'Appointment rescheduled successfully',
        'appointment_id': appointment.id,
        'new_date': appointment.appointment_date.isoformat()
    }), 200

@app.route('/api/appointments/<int:id>/cancel', methods=['POST'])
@token_required
def cancel_appointment(current_user, id):
    """Cancel an appointment."""
    appointment = Appointment.query.get(id)
    if not appointment:
        return jsonify({'message': 'Appointment not found'}), 404
    
    patient = Patient.query.filter_by(user_id=current_user.id).first()
    if appointment.patient_id != patient.id and current_user.role not in ['admin', 'super_admin']:
        return jsonify({'message': 'Unauthorized'}), 403
    
    if appointment.status == 'cancelled':
        return jsonify({'message': 'Appointment is already cancelled'}), 400
    
    if appointment.status == 'completed':
        return jsonify({'message': 'Cannot cancel a completed appointment'}), 400
    
    data = request.json
    cancellation_reason = data.get('reason', 'No reason provided')
    
    appointment.status = 'cancelled'
    appointment.notes = f"Cancelled - {cancellation_reason}"
    
    # Refund logic (if payment was made)
    if appointment.payment_status == 'paid':
        appointment.payment_status = 'refunded'
    
    db.session.commit()
    
    # Send cancellation notification email
    try:
        patient_user = User.query.get(appointment.patient.user_id)
        send_email(patient_user.email, 'Your Appointment Has Been Cancelled',
                   'email/appointment_update.html',
                   appointment=appointment,
                   patient=patient_user,
                   update_type='cancelled',
                   reason=cancellation_reason)
    except Exception as e:
        print(f"Failed to send cancellation notification email: {e}")
    
    return jsonify({
        'message': 'Appointment cancelled successfully',
        'refund_status': appointment.payment_status
    }), 200

# ── Prescriptions ─────────────────────────────────────────────────────────────

@app.route('/api/prescriptions', methods=['GET'])
@token_required
def get_prescriptions(current_user):
    if current_user.role == 'patient':
        patient = Patient.query.filter_by(user_id=current_user.id).first()
        prescriptions = Prescription.query.filter_by(patient_id=patient.id).all()
    else:
        prescriptions = Prescription.query.all()
    result = []
    for rx in prescriptions:
        result.append({
            'id': rx.id,
            'doctor_name': rx.doctor.user.name,
            'patient_name': rx.patient.user.name,
            'diagnosis': rx.diagnosis,
            'medications': rx.medications,
            'instructions': rx.instructions,
            'created_at': rx.created_at.isoformat()
        })
    return jsonify(result)

@app.route('/api/prescriptions', methods=['POST'])
@token_required
def add_prescription(current_user):
    if current_user.role not in ['doctor', 'admin']:
        return jsonify({'message': 'Only doctors can add prescriptions'}), 403
    data = request.json
    doctor = Doctor.query.filter_by(user_id=current_user.id).first()
    prescription = Prescription(
        appointment_id=data['appointment_id'],
        patient_id=data['patient_id'],
        doctor_id=doctor.id,
        diagnosis=data['diagnosis'],
        medications=data['medications'],
        instructions=data.get('instructions')
    )
    db.session.add(prescription)
    db.session.commit()
    return jsonify({'message': 'Prescription added successfully'}), 201

@app.route('/api/prescriptions/<int:id>/pdf', methods=['GET'])
@token_required
def download_prescription_pdf(current_user, id):
    """Generate and return prescription as JSON (frontend handles PDF generation)."""
    prescription = Prescription.query.get(id)
    if not prescription:
        return jsonify({'message': 'Prescription not found'}), 404
    
    # Authorization check
    if current_user.role == 'patient':
        patient = Patient.query.filter_by(user_id=current_user.id).first()
        if prescription.patient_id != patient.id:
            return jsonify({'message': 'Unauthorized'}), 403
    elif current_user.role not in ['doctor', 'admin', 'super_admin']:
        return jsonify({'message': 'Unauthorized'}), 403
    
    # Get related data
    patient = Patient.query.get(prescription.patient_id)
    doctor = Doctor.query.get(prescription.doctor_id)
    user = User.query.get(patient.user_id)
    doctor_user = User.query.get(doctor.user_id)
    appointment = Appointment.query.get(prescription.appointment_id)
    
    prescription_data = {
        'id': prescription.id,
        'prescription_date': prescription.created_at.strftime('%d-%m-%Y %H:%M') if prescription.created_at else '',
        'patient_name': user.name,
        'patient_email': user.email,
        'patient_phone': user.phone,
        'doctor_name': doctor_user.name,
        'doctor_specialization': doctor.specialization,
        'doctor_qualification': doctor.qualification,
        'appointment_date': appointment.appointment_date.strftime('%d-%m-%Y %H:%M') if appointment else '',
        'diagnosis': prescription.diagnosis,
        'medications': prescription.medications,
        'instructions': prescription.instructions,
    }
    
    return jsonify(prescription_data), 200

# ── Medical History ───────────────────────────────────────────────────────────

@app.route('/api/medical-history', methods=['GET'])
@token_required
def get_medical_history(current_user):
    if current_user.role == 'patient':
        patient = Patient.query.filter_by(user_id=current_user.id).first()
        history = MedicalHistory.query.filter_by(patient_id=patient.id).all()
    else:
        patient_id = request.args.get('patient_id')
        history = MedicalHistory.query.filter_by(patient_id=patient_id).all() if patient_id else []
    result = []
    for record in history:
        result.append({
            'id': record.id,
            'condition': record.condition,
            'description': record.description,
            'diagnosed_date': record.diagnosed_date.isoformat() if record.diagnosed_date else None,
            'created_at': record.created_at.isoformat()
        })
    return jsonify(result)

# ── Patients ──────────────────────────────────────────────────────────────────

@app.route('/api/patients', methods=['GET'])
@token_required
def get_patients(current_user):
    if current_user.role not in ['doctor', 'admin', 'super_admin']:
        return jsonify({'message': 'Unauthorized'}), 403
    patients = Patient.query.all()
    result = []
    for patient in patients:
        # Gather full medical history for each patient
        history = MedicalHistory.query.filter_by(patient_id=patient.id).all()
        history_list = [{
            'id': h.id, 'condition': h.condition,
            'description': h.description,
            'diagnosed_date': h.diagnosed_date.isoformat() if h.diagnosed_date else None
        } for h in history]
        # Gather prescriptions
        prescriptions = Prescription.query.filter_by(patient_id=patient.id).all()
        rx_list = [{
            'id': rx.id, 'diagnosis': rx.diagnosis,
            'medications': rx.medications,
            'doctor_name': rx.doctor.user.name,
            'created_at': rx.created_at.isoformat()
        } for rx in prescriptions]
        result.append({
            'id': patient.id,
            'user_id': patient.user_id,
            'name': patient.user.name,
            'email': patient.user.email,
            'phone': patient.user.phone,
            'blood_group': patient.blood_group,
            'date_of_birth': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
            'medical_history': history_list,
            'prescriptions': rx_list
        })
    return jsonify(result)


@app.route('/api/patients/<int:id>', methods=['DELETE'])
@token_required
def delete_patient(current_user, id):
    # Only admin or super_admin can delete patients
    if current_user.role not in ['admin', 'super_admin']:
        return jsonify({'message': 'Unauthorized'}), 403
    try:
        patient = Patient.query.get(id)
        if not patient:
            return jsonify({'message': 'Patient not found'}), 404

        # Delete related prescriptions, appointments, billing
        Prescription.query.filter_by(patient_id=patient.id).delete()
        for apt in Appointment.query.filter_by(patient_id=patient.id).all():
            Billing.query.filter_by(appointment_id=apt.id).delete()
            Prescription.query.filter_by(appointment_id=apt.id).delete()
        Appointment.query.filter_by(patient_id=patient.id).delete()
        Billing.query.filter_by(patient_id=patient.id).delete()

        # Delete patient and its user
        user = User.query.get(patient.user_id)
        if user:
            db.session.delete(user)
        db.session.delete(patient)
        db.session.commit()
        return jsonify({'message': 'Patient deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500

# ── Doctors ───────────────────────────────────────────────────────────────────

@app.route('/api/doctors', methods=['GET'])
@token_required
def get_doctors(current_user):
    doctors = Doctor.query.all()
    result = []
    for doctor in doctors:
        # Dummy profile image (use a unique avatar service or static placeholder)
        profile_img = f"https://ui-avatars.com/api/?name={doctor.user.name.replace(' ', '+')}&background=667eea&color=fff&size=128"
        result.append({
            'id': doctor.id,
            'user_id': doctor.user_id,
            'name': doctor.user.name,
            'email': doctor.user.email,
            'phone': doctor.user.phone,
            'specialization': doctor.specialization,
            'qualification': doctor.qualification,
            'experience': doctor.experience,
            'department': doctor.department.name if doctor.department else None,
            'department_id': doctor.department_id,
            'consultation_fee': doctor.consultation_fee,
            'profile_img': profile_img
        })
    return jsonify(result)

@app.route('/api/doctors', methods=['POST'])
@token_required
def add_doctor(current_user):
    if current_user.role != 'super_admin':
        return jsonify({'message': 'Only super admin can add doctors'}), 403
    try:
        data = request.json
        if not data.get('email') or not data.get('password') or not data.get('name'):
            return jsonify({'message': 'Name, email and password are required'}), 400
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'message': 'Email already exists'}), 400

        hashed_password = generate_password_hash(data['password'])
        user = User(email=data['email'], password=hashed_password, role='doctor',
                    name=data['name'], phone=data.get('phone'))
        db.session.add(user)
        db.session.commit()

        dept_id = data.get('department_id')
        if dept_id:
            dept_id = int(dept_id)

        doctor = Doctor(
            user_id=user.id,
            department_id=dept_id,
            specialization=data.get('specialization'),
            qualification=data.get('qualification'),
            experience=int(data['experience']) if data.get('experience') else None,
            consultation_fee=float(data['consultation_fee']) if data.get('consultation_fee') else None
        )
        db.session.add(doctor)
        db.session.commit()
        return jsonify({'message': 'Doctor added successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500

@app.route('/api/doctors/<int:id>', methods=['PUT'])
@token_required
def update_doctor(current_user, id):
    """Edit doctor details — Super Admin only."""
    if current_user.role != 'super_admin':
        return jsonify({'message': 'Only super admin can edit doctors'}), 403
    try:
        doctor = Doctor.query.get(id)
        if not doctor:
            return jsonify({'message': 'Doctor not found'}), 404
        data = request.json
        # Update User fields
        user = User.query.get(doctor.user_id)
        if 'name' in data:
            user.name = data['name']
        if 'phone' in data:
            user.phone = data['phone']
        if 'email' in data:
            existing = User.query.filter_by(email=data['email']).first()
            if existing and existing.id != user.id:
                return jsonify({'message': 'Email already in use'}), 400
            user.email = data['email']
        if 'password' in data and data['password']:
            user.password = generate_password_hash(data['password'])
        # Update Doctor fields
        if 'department_id' in data and data['department_id']:
            doctor.department_id = int(data['department_id'])
        if 'specialization' in data:
            doctor.specialization = data['specialization']
        if 'qualification' in data:
            doctor.qualification = data['qualification']
        if 'experience' in data and data['experience']:
            doctor.experience = int(data['experience'])
        if 'consultation_fee' in data and data['consultation_fee']:
            doctor.consultation_fee = float(data['consultation_fee'])
        db.session.commit()
        return jsonify({'message': 'Doctor updated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500

@app.route('/api/doctors/<int:id>', methods=['DELETE'])
@token_required
def delete_doctor(current_user, id):
    """Delete a doctor — Super Admin only."""
    if current_user.role != 'super_admin':
        return jsonify({'message': 'Only super admin can delete doctors'}), 403
    try:
        doctor = Doctor.query.get(id)
        if not doctor:
            return jsonify({'message': 'Doctor not found'}), 404
        user_id = doctor.user_id
        # Remove related prescriptions & appointments first
        Prescription.query.filter_by(doctor_id=doctor.id).delete()
        for apt in Appointment.query.filter_by(doctor_id=doctor.id).all():
            Billing.query.filter_by(appointment_id=apt.id).delete()
            Prescription.query.filter_by(appointment_id=apt.id).delete()
        Appointment.query.filter_by(doctor_id=doctor.id).delete()
        db.session.delete(doctor)
        user = User.query.get(user_id)
        if user:
            db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'Doctor deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500

# ── Doctor Availability ───────────────────────────────────────────────────────

@app.route('/api/doctors/<int:id>/availability', methods=['GET'])
def get_doctor_availability(id):
    """Get available slots for a doctor."""
    doctor = Doctor.query.get(id)
    if not doctor:
        return jsonify({'message': 'Doctor not found'}), 404
    
    slots = DoctorAvailability.query.filter_by(doctor_id=id, is_available=True).all()
    result = [{
        'id': s.id, 'date': s.date.isoformat(), 'time': s.time
    } for s in slots]
    return jsonify(result)

@app.route('/api/doctors/<int:id>/availability', methods=['POST'])
@token_required
def add_doctor_availability(current_user, id):
    """Add availability slots for a doctor — Admin only."""
    if current_user.role not in ['super_admin', 'admin']:
        return jsonify({'message': 'Unauthorized'}), 403
    
    doctor = Doctor.query.get(id)
    if not doctor:
        return jsonify({'message': 'Doctor not found'}), 404
    
    data = request.json
    try:
        slot = DoctorAvailability(doctor_id=id, date=datetime.strptime(data['date'], '%Y-%m-%d').date(), time=data['time'])
        db.session.add(slot)
        db.session.commit()
        return jsonify({'message': 'Availability slot added successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500

# ── Feedback ──────────────────────────────────────────────────────────────────

@app.route('/api/feedback', methods=['POST'])
@token_required
def add_feedback(current_user):
    """Add feedback/review for a doctor."""
    if current_user.role != 'patient':
        return jsonify({'message': 'Only patients can add feedback'}), 403
    
    data = request.json
    patient = Patient.query.filter_by(user_id=current_user.id).first()
    try:
        feedback = Feedback(
            appointment_id=data['appointment_id'],
            patient_id=patient.id,
            doctor_id=data['doctor_id'],
            rating=int(data.get('rating', 5)),
            comment=data.get('comment')
        )
        db.session.add(feedback)
        db.session.commit()
        return jsonify({'message': 'Feedback added successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500

@app.route('/api/doctors/<int:id>/feedback', methods=['GET'])
def get_doctor_feedback(id):
    """Get all feedback for a doctor."""
    doctor = Doctor.query.get(id)
    if not doctor:
        return jsonify({'message': 'Doctor not found'}), 404
    
    feedbacks = Feedback.query.filter_by(doctor_id=id).all()
    avg_rating = sum(f.rating for f in feedbacks) / len(feedbacks) if feedbacks else 0
    
    result = {
        'doctor_id': id,
        'average_rating': round(avg_rating, 1),
        'total_reviews': len(feedbacks),
        'reviews': [{
            'id': f.id, 'rating': f.rating, 'comment': f.comment,
            'patient_name': f.patient.user.name, 'created_at': f.created_at.isoformat()
        } for f in feedbacks]
    }
    return jsonify(result)

@app.route('/api/doctors/<int:id>/profile', methods=['GET'])
def get_doctor_profile(id):
    """Get detailed doctor profile with reviews and availability."""
    doctor = Doctor.query.get(id)
    if not doctor:
        return jsonify({'message': 'Doctor not found'}), 404
    
    feedbacks = Feedback.query.filter_by(doctor_id=id).all()
    avg_rating = sum(f.rating for f in feedbacks) / len(feedbacks) if feedbacks else 0
    
    result = {
        'id': doctor.id,
        'name': doctor.user.name,
        'email': doctor.user.email,
        'phone': doctor.user.phone,
        'specialization': doctor.specialization,
        'qualification': doctor.qualification,
        'experience': doctor.experience,
        'department': doctor.department.name if doctor.department else None,
        'consultation_fee': doctor.consultation_fee,
        'average_rating': round(avg_rating, 1),
        'total_reviews': len(feedbacks),
        'reviews': [{
            'id': f.id, 'rating': f.rating, 'comment': f.comment,
            'patient_name': f.patient.user.name, 'created_at': f.created_at.isoformat()
        } for f in feedbacks]
    }
    return jsonify(result)

# ── Departments ───────────────────────────────────────────────────────────────

@app.route('/api/departments', methods=['GET'])
def get_departments():
    departments = Department.query.all()
    return jsonify([{'id': d.id, 'name': d.name, 'description': d.description}
                    for d in departments])

@app.route('/api/departments', methods=['POST'])
@token_required
def add_department(current_user):
    if current_user.role != 'super_admin':
        return jsonify({'message': 'Only super admin can add departments'}), 403
    data = request.json
    dept = Department(name=data['name'], description=data.get('description'))
    db.session.add(dept)
    db.session.commit()
    return jsonify({'message': 'Department added successfully'}), 201

# ── Billing ───────────────────────────────────────────────────────────────────

@app.route('/api/billing/reports', methods=['GET'])
@token_required
def get_billing_reports(current_user):
    if current_user.role != 'super_admin':
        return jsonify({'message': 'Only super admin can view billing reports'}), 403
    bills = Billing.query.all()
    total_revenue = sum(b.amount for b in bills if b.status == 'paid')
    result = [{
        'id': b.id, 'patient_name': b.patient.user.name,
        'amount': b.amount, 'description': b.description,
        'status': b.status, 'payment_method': b.payment_method,
        'created_at': b.created_at.isoformat()
    } for b in bills]
    return jsonify({'bills': result, 'total_revenue': total_revenue})

@app.route('/api/billing', methods=['POST'])
@token_required
def create_bill(current_user):
    if current_user.role not in ['admin', 'super_admin']:
        return jsonify({'message': 'Unauthorized'}), 403
    data = request.json
    bill = Billing(patient_id=data['patient_id'], appointment_id=data.get('appointment_id'),
                   amount=data['amount'], description=data.get('description'),
                   status=data.get('status', 'pending'))
    db.session.add(bill)
    db.session.commit()
    return jsonify({'message': 'Bill created successfully'}), 201

# ── Inventory ─────────────────────────────────────────────────────────────────

@app.route('/api/inventory', methods=['GET'])
@token_required
def get_inventory(current_user):
    if current_user.role not in ['admin', 'super_admin']:
        return jsonify({'message': 'Unauthorized'}), 403
    items = InventoryItem.query.all()
    result = [{
        'id': i.id, 'name': i.name, 'category': i.category,
        'quantity': i.quantity, 'unit': i.unit, 'threshold': i.threshold,
        'expiry_date': i.expiry_date.isoformat() if i.expiry_date else None,
        'supplier': i.supplier
    } for i in items]
    return jsonify(result)

@app.route('/api/inventory', methods=['POST'])
@token_required
def add_inventory_item(current_user):
    if current_user.role not in ['admin', 'super_admin']:
        return jsonify({'message': 'Unauthorized'}), 403
    data = request.json
    expiry = datetime.strptime(data['expiry_date'], '%Y-%m-%d').date() if data.get('expiry_date') else None
    item = InventoryItem(
        name=data['name'], category=data.get('category'),
        quantity=int(data.get('quantity', 0)), unit=data.get('unit'),
        threshold=int(data.get('threshold', 10)), expiry_date=expiry,
        supplier=data.get('supplier')
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({'message': 'Item added successfully'}), 201

@app.route('/api/inventory/<int:id>', methods=['PUT'])
@token_required
def update_inventory_item(current_user, id):
    if current_user.role not in ['admin', 'super_admin']:
        return jsonify({'message': 'Unauthorized'}), 403
    item = InventoryItem.query.get(id)
    if not item:
        return jsonify({'message': 'Item not found'}), 404
    data = request.json
    if 'name' in data: item.name = data['name']
    if 'category' in data: item.category = data['category']
    if 'quantity' in data: item.quantity = int(data['quantity'])
    if 'unit' in data: item.unit = data['unit']
    if 'threshold' in data: item.threshold = int(data['threshold'])
    if 'expiry_date' in data:
        item.expiry_date = datetime.strptime(data['expiry_date'], '%Y-%m-%d').date() if data['expiry_date'] else None
    if 'supplier' in data: item.supplier = data['supplier']
    db.session.commit()
    return jsonify({'message': 'Item updated successfully'})

@app.route('/api/inventory/<int:id>', methods=['DELETE'])
@token_required
def delete_inventory_item(current_user, id):
    if current_user.role not in ['admin', 'super_admin']:
        return jsonify({'message': 'Unauthorized'}), 403
    item = InventoryItem.query.get(id)
    if item:
        db.session.delete(item)
        db.session.commit()
    return jsonify({'message': 'Item deleted successfully'})

# ── Analytics ─────────────────────────────────────────────────────────────────

@app.route('/api/analytics/summary', methods=['GET'])
@token_required
def get_analytics_summary(current_user):
    """Get admin analytics: revenue, appointments, patients, top doctors."""
    if current_user.role not in ['admin', 'super_admin']:
        return jsonify({'message': 'Unauthorized'}), 403
    
    # Revenue this month
    current_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    this_month_revenue = db.session.query(db.func.sum(Billing.amount)).filter(
        Billing.created_at >= current_month_start,
        Billing.status.in_(['paid', 'completed'])
    ).scalar() or 0
    
    # Total revenue
    total_revenue = db.session.query(db.func.sum(Billing.amount)).filter(
        Billing.status.in_(['paid', 'completed'])
    ).scalar() or 0
    
    # Appointment counts
    total_appointments = Appointment.query.count()
    completed_appointments = Appointment.query.filter_by(status='completed').count()
    pending_appointments = Appointment.query.filter_by(status='pending_payment').count()
    scheduled_appointments = Appointment.query.filter_by(status='scheduled').count()
    cancelled_appointments = Appointment.query.filter_by(status='cancelled').count()
    
    # Patient count
    total_patients = Patient.query.count()
    
    # Doctor count
    total_doctors = Doctor.query.count()
    
    # Top 5 doctors (by number of appointments)
    top_doctors = db.session.query(
        Doctor.id,
        User.name,
        Doctor.specialization,
        db.func.count(Appointment.id).label('appointment_count'),
        db.func.avg(Feedback.rating).label('avg_rating')
    ).outerjoin(User, Doctor.user_id == User.id)\
     .outerjoin(Appointment, Doctor.id == Appointment.doctor_id)\
     .outerjoin(Feedback, Doctor.id == Feedback.doctor_id)\
     .group_by(Doctor.id, User.name, Doctor.specialization)\
     .order_by(db.func.count(Appointment.id).desc())\
     .limit(5).all()
    
    top_doctors_list = [
        {
            'id': doc[0],
            'name': doc[1],
            'specialization': doc[2],
            'appointment_count': doc[3] or 0,
            'avg_rating': round(doc[4], 2) if doc[4] else 0
        }
        for doc in top_doctors
    ]
    
    # Patient registrations this month
    new_patients_this_month = Patient.query.join(User).filter(
        User.created_at >= current_month_start
    ).count()
    
    return jsonify({
        'revenue': {
            'this_month': float(this_month_revenue),
            'total': float(total_revenue)
        },
        'appointments': {
            'total': total_appointments,
            'completed': completed_appointments,
            'pending': pending_appointments,
            'scheduled': scheduled_appointments,
            'cancelled': cancelled_appointments
        },
        'patients': {
            'total': total_patients,
            'new_this_month': new_patients_this_month
        },
        'doctors': {
            'total': total_doctors,
            'top_5': top_doctors_list
        }
    }), 200

# ── Init ──────────────────────────────────────────────────────────────────────

@app.route('/api/init', methods=['POST'])
def initialize_db():
    db.create_all()
    seed_database()
    return jsonify({'message': 'Database initialized successfully'})

def seed_database():
    """Seeds the database with initial data if it's not already seeded."""
    if User.query.filter_by(email='admin@hospital.com').first():
        return

    print("Seeding database with initial data...")
    admin = User(email='admin@hospital.com',
                 password=generate_password_hash('admin123'),
                 role='super_admin', name='Super Admin', phone='1234567890')
    db.session.add(admin)

    departments = [
        Department(name='Cardiology', description='Heart and cardiovascular system'),
        Department(name='Neurology', description='Brain and nervous system'),
        Department(name='Orthopedics', description='Bones and joints'),
        Department(name='Pediatrics', description='Children healthcare'),
    ]
    for dept in departments:
        db.session.add(dept)

    db.session.commit()
    print("Database seeded.")

@app.cli.command("send-reminders")
def send_reminders_command():
    """Sends reminders for upcoming appointments."""
    send_appointment_reminders()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_database()
    app.run(debug=True, port=5000)
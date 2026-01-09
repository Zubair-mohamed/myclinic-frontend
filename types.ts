
// FIX: Removed self-import of `View` which was causing a conflict.
export enum View {
  Dashboard = 'Dashboard',
  Appointments = 'Appointments',
  WaitingQueue = 'WaitingQueue',
  Pharmacy = 'Pharmacy',
  Reminders = 'Reminders',
  Wallet = 'Wallet',
  Emergency = 'Emergency',
  Admin = 'Admin',
  Hospitals = 'Hospitals',
  Profile = 'Profile',
  Specialties = 'Specialties',
  QueueHistory = 'QueueHistory',
  Availability = 'Availability',
  AppointmentTypes = 'AppointmentTypes',
  Analytics = 'Analytics',
  MedicalRecords = 'MedicalRecords',
  PatientRegistration = 'PatientRegistration',
  HospitalManagement = 'HospitalManagement',
  Notifications = 'Notifications',
}

export interface I18nString {
    en: string;
    ar: string;
}

export interface Specialty {
    _id: string;
    name: I18nString;
    // FIX: Changed from `string` to optional `Hospital` to match populated API response and handle partial data.
    hospital?: Hospital;
}

export interface Hospital {
    _id: string;
    name: I18nString;
    address: string;
    manager?: User;
    // FIX: Made optional to handle API responses where this field might not be populated.
    refundPolicyPercentage?: number;
    latitude?: number;
    longitude?: number;
}

export interface Availability {
    dayOfWeek: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
    isAvailable: boolean;
    startTime: string;
    endTime: string;
    hospital?: string | Hospital; // Updated to allow both string ID and Hospital object
    announcement: string;
    _id?: string;
}

export interface MedicalProfile {
    bloodType?: string;
    height?: number; // cm
    weight?: number; // kg
    allergies?: string[];
    chronicConditions?: string[];
}

export interface User {
  _id: string;
  name: I18nString;
  email: string;
  phone?: string;
  dateOfBirth?: string; // ISO Date String
  role: 'patient' | 'doctor' | 'hospital staff' | 'hospital manager' | 'super admin';
  hospitals?: Hospital[];
  isActive: boolean;
  isDisabled?: boolean;
  disabledAt?: string; // ISO Date String
  disabledReason?: string;
  disabledBy?: string | User; // User ID or populated User
  specialties?: Specialty[];
  availability?: Availability[];
  avatar?: string;
  medicalProfile?: MedicalProfile;
}

export interface Notification {
  _id: string;
    title?: I18nString | string;
    message: I18nString | string;
    body?: I18nString | string;
  type: 'appointment' | 'reminder' | 'wallet' | 'system';
  isRead: boolean;
  createdAt: string;
}

export interface AppointmentType {
    _id: string;
    name: I18nString;
    duration: number; // in minutes
    cost: number;
    hospital: string; // Hospital ID
    specialty: Specialty;
}

export interface Appointment {
    _id:string;
    user: User; // Populated user field
    doctor: User; // Populated doctor field
    hospital: Hospital; // Populated hospital field
    appointmentType: AppointmentType;
    date: string;
    time: string;
    status: 'Upcoming' | 'Completed' | 'Cancelled' | 'NoShow';
    cost: number;
    isRefunded: boolean;
    reminderSet?: boolean;
    reports?: MedicalReport[];
    createdAt?: string;
}

// CHANGED: Structure for Symptom Diagnosis
export interface AIAnalysisResult {
    possibleCondition: string;
    urgency: 'High' | 'Medium' | 'Low';
    explanation: string;
    recommendedSpecialtyId: string; // ID of the matched specialty in DB
    recommendedSpecialtyName: string;
    advice: string;
}


export interface QueueItem {
    _id: string;
    user?: User;
    walkInName?: string;
    doctor: User; // Now populated
    hospital: Hospital; // Now populated
    queueNumber: string;
    status: 'Waiting' | 'Serving' | 'Done' | 'Left' | 'RemovedByAdmin' | 'Held'; // Added 'Held'
    checkInTime: string;
    isUser?: boolean; // Frontend-only flag
}

export interface QueueState {
    nowServing: QueueItem | null;
    waiting: QueueItem[];
    held: QueueItem[]; // Added held list
    doctors: User[]; // List of doctors in the hospital
    userStatus: {
        inQueue: boolean;
        doctorId: string | null;
        position: number | null;
        estimatedWaitTime: number;
        status?: QueueItem['status'] | null; // Added status field
    };
    todaysAppointments: Appointment[];
}

export interface PharmacyLocation {
    _id?: string; // Made optional for new locations
    name: string;
    address: string;
    distance: string;
}

export interface Medication {
    _id: string;
    name: string;
    price: number;
    form: string;
    availableAt?: PharmacyLocation[];
    pharmacy?: {
        _id: string;
        name: I18nString | string;
        address: string;
        distance?: string;
        hospital?: Hospital | string;
    };
}

export interface Wallet {
    _id: string;
    user: string; // User ID
    balance: number;
    currency: string;
}


export interface Transaction {
    _id: string;
    user: string;
    amount: number;
    type: 'debit' | 'credit';
    transactionType: 'Appointment Fee' | 'Refund' | 'Deposit' | 'Admin Credit' | 'Initial Balance';
    status: 'Completed' | 'Pending' | 'Failed';
    description: string;
    referenceId: string; // e.g., Appointment ID
    createdAt: string;
}

export interface Reminder {
    _id:string;
    medication: string;
    dosage: string;
    time: string;
    period: 'Morning' | 'Afternoon' | 'Evening';
}

export interface EmergencyContact {
    _id: string;
    name: string;
    relation: string;
    phone: string;
}

export interface MedicalReport {
    _id: string;
    patient: User | string;
    appointment?: string; // Appointment ID
    uploadedBy?: User; // Optional populated user
    title: string;
    description: string;
    fileType: string;
    fileData: string; // Base64
    uploadedAt: string;
}

export interface DashboardData {
    // Patient
    upcomingAppointment?: { doctor: { name: I18nString; availability: Availability[] } } | null;
    upcomingAppointmentsList?: Appointment[];
    nextReminder?: { medication: string } | null;
    walletBalance?: number;
    todaysReminders?: Reminder[];
    // Doctor
    todaysAppointments?: number;
    nextPatient?: { user: { name: I18nString } } | null;
    currentQueue?: QueueItem[];
    // Admin
    totalPatients?: number;
    totalAppointmentsToday?: number;
    totalRevenueToday?: number;
    appointmentsBySpecialty?: { name: I18nString; count: number }[];
    latestAppointments?: Partial<Appointment>[];
    appointmentsByStatus?: { name: string; value: number }[];
    revenueOverLast7Days?: { date: string; revenue: number }[];
}

export interface AnalyticsData {
    revenueOverTime: { date: string; revenue: number }[];
    appointmentsByStatus: { name: string; value: number }[];
    topDoctors: { name: I18nString; count: number }[];
    topSpecialties: { name: I18nString; count: number }[];
    kpis: {
        totalRevenue: number;
        totalAppointments: number;
        avgRevenuePerAppointment: number;
        cancellationRate: number;
    };
}

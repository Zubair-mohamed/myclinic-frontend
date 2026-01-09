
import { API_BASE_URL } from '../config';
import { encryptData } from './encryption';
import i18n from '../i18n';

const getRefreshToken = () => localStorage.getItem('refresh_token');

const persistAuth = (data: any) => {
    if (data?.token) localStorage.setItem('token', data.token);
    if (data?.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
    if (data?.user) localStorage.setItem('user', JSON.stringify(data.user));
};

const tryRefreshTokens = async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    const resp = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!resp.ok) return false;
    const data = await resp.json();
    persistAuth(data);
    return true;
};

export const apiFetch = async (url: string, options: RequestInit = {}, allowRetry: boolean = true) => {
    const originalBody = options.body;
    const token = localStorage.getItem('token');

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Ensure backend gets the active locale for all responses/messages
    const activeLocale = i18n?.language || 'en';
    headers['X-Locale'] = activeLocale;
    headers['Accept-Language'] = activeLocale;

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // --- ENCRYPTION LOGIC ---
    // If there is a body and it's an object, encrypt it.
    // We exclude FormData (for file uploads) from this logic for now.
    if (options.body && typeof options.body === 'string' && !url.includes('/upload')) {
        try {
            const parsed = JSON.parse(options.body as string);

            // Skip encryption for large base64/file uploads (e.g., medical reports)
            const hasLargeFile = typeof parsed.fileData === 'string' && parsed.fileData.length > 200000; // ~200 KB threshold
            if (hasLargeFile) {
                // Leave body as-is to avoid bloat or backend decrypt issues
            } else {
                const encryptedPayload = encryptData(parsed);
                options.body = JSON.stringify({ payload: encryptedPayload });
            }
        } catch (e) {
            console.warn("Could not encrypt body, sending as plain text", e);
        }
    }
    // ------------------------

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        // Don't trigger a global logout for a failed login attempt.
        // Let the login form handle the specific error message from the backend.
        const isLoginAttempt = url.endsWith('/auth/login');
        if (!isLoginAttempt) {
            // Try token refresh once before forcing logout
            if (allowRetry) {
                const refreshed = await tryRefreshTokens().catch(() => false);
                if (refreshed) {
                    // Retry original request with fresh token; reapply original body so encryption runs again
                    const retryOptions = { ...options, body: originalBody };
                    return apiFetch(url, retryOptions, false);
                }
            }

            window.dispatchEvent(new Event('auth-error'));
        }

        const errorData = await response.json().catch(() => ({ error: 'Unauthorized' }));
        const error = new Error(errorData.error || 'Unauthorized');
        (error as any).status = 401;
        (error as any).data = errorData;
        throw error;
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown API error occurred' }));
        const error = new Error(errorData.error || `HTTP error! status: ${response.status}`);
        // Attach status and data to the error object for frontend handling
        (error as any).status = response.status;
        (error as any).data = errorData;
        throw error;
    }

    // Handle responses with no content (e.g., DELETE requests)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return null;
    }

    return response.json();
};

// --- API Service Layer ---

// Auth
export const auth = {
    me: () => apiFetch(`${API_BASE_URL}/auth/me`),
    login: (credentials: any) => apiFetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify(credentials)
    }),
    register: (data: any) => apiFetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    verifyRegistration: (data: any) => apiFetch(`${API_BASE_URL}/auth/verify-registration`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    sendOtp: (email: string) => apiFetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        body: JSON.stringify({ email })
    }),
    verifyOtp: (email: string, otp: string) => apiFetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ email, otp })
    }),
    resetPassword: (data: any) => apiFetch(`${API_BASE_URL}/auth/resetpassword-otp`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
};

// Users & Profile
export const users = {
    getAll: () => apiFetch(`${API_BASE_URL}/users`),
    getDoctors: (queryString: string = '') => apiFetch(`${API_BASE_URL}/users/doctors${queryString}`),
    create: (data: any) => apiFetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => apiFetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    toggleStatus: (id: string) => apiFetch(`${API_BASE_URL}/users/${id}/toggle-status`, {
        method: 'PUT'
    }),
    disableUser: (id: string, data: any) => apiFetch(`${API_BASE_URL}/users/${id}/disable`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    reactivateUser: (id: string) => apiFetch(`${API_BASE_URL}/users/${id}/reactivate`, {
        method: 'POST'
    }),
    deleteUser: (id: string, data: any) => apiFetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        body: JSON.stringify(data)
    }),
    requestDeleteOtpForUser: (id: string) => apiFetch(`${API_BASE_URL}/users/${id}/delete/request-otp`, {
        method: 'POST'
    }),
    addFunds: (id: string, data: any) => apiFetch(`${API_BASE_URL}/users/${id}/add-funds`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateProfile: (data: any) => apiFetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    changePassword: (data: any) => apiFetch(`${API_BASE_URL}/users/change-password`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    updateAvatar: (avatar: string) => apiFetch(`${API_BASE_URL}/users/profile/picture`, {
        method: 'PUT',
        body: JSON.stringify({ avatar })
    }),
    requestDeleteOtp: () => apiFetch(`${API_BASE_URL}/users/profile/delete/request-otp`, {
        method: 'POST'
    }),
    deleteAccount: (data: any) => apiFetch(`${API_BASE_URL}/users/profile`, {
        method: 'DELETE',
        body: JSON.stringify(data)
    }),
    disableAccount: (data: any) => apiFetch(`${API_BASE_URL}/users/profile/disable`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    requestReactivationOtp: (email: string) => apiFetch(`${API_BASE_URL}/users/profile/reactivate/request-otp`, {
        method: 'POST',
        body: JSON.stringify({ email })
    }),
    reactivateAccount: (data: any) => apiFetch(`${API_BASE_URL}/users/profile/reactivate`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    getDoctorReminderPreferences: () => apiFetch(`${API_BASE_URL}/users/profile/doctor-reminders`),
    updateDoctorReminderPreferences: (preferences: any) => apiFetch(`${API_BASE_URL}/users/profile/doctor-reminders`, {
        method: 'PUT',
        body: JSON.stringify({ preferences })
    }),
    getAvailability: (userId?: string) => apiFetch(`${API_BASE_URL}/users/availability${userId ? `?userId=${userId}` : ''}`),
    updateAvailability: (data: any) => apiFetch(`${API_BASE_URL}/users/availability`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    markUnavailable: (id: string, data: any) => apiFetch(`${API_BASE_URL}/users/doctors/${id}/unavailability`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    restoreAvailability: (id: string) => apiFetch(`${API_BASE_URL}/users/doctors/${id}/availability/restore`, {
        method: 'POST'
    }),
    registerPatient: (data: any) => apiFetch(`${API_BASE_URL}/users/patient`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
};

// Hospitals & Specialties
export const hospitals = {
    getAll: () => apiFetch(`${API_BASE_URL}/hospitals`),
    create: (data: any) => apiFetch(`${API_BASE_URL}/hospitals`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => apiFetch(`${API_BASE_URL}/hospitals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id: string) => apiFetch(`${API_BASE_URL}/hospitals/${id}`, {
        method: 'DELETE'
    }),
    getSpecialties: () => apiFetch(`${API_BASE_URL}/specialties`),
    createSpecialty: (name: string) => apiFetch(`${API_BASE_URL}/specialties`, {
        method: 'POST',
        body: JSON.stringify({ name })
    }),
    updateSpecialty: (id: string, name: string) => apiFetch(`${API_BASE_URL}/specialties/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name })
    }),
    deleteSpecialty: (id: string) => apiFetch(`${API_BASE_URL}/specialties/${id}`, {
        method: 'DELETE'
    }),
    assignDoctorsToSpecialty: (id: string, doctorIds: string[]) => apiFetch(`${API_BASE_URL}/specialties/${id}/assign-doctors`, {
        method: 'PUT',
        body: JSON.stringify({ doctorIds })
    }),
    getPublicSpecialties: () => apiFetch(`${API_BASE_URL}/specialties/public`),
};

export const appointmentTypes = {
    getAll: () => apiFetch(`${API_BASE_URL}/appointment-types`),
    create: (data: any) => apiFetch(`${API_BASE_URL}/appointment-types`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => apiFetch(`${API_BASE_URL}/appointment-types/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id: string) => apiFetch(`${API_BASE_URL}/appointment-types/${id}`, {
        method: 'DELETE'
    }),
    getPublic: () => apiFetch(`${API_BASE_URL}/appointment-types/public`),
    getBySpecialtyAndHospital: (specialtyId: string, hospitalId: string) =>
        apiFetch(`${API_BASE_URL}/appointment-types/by-spec-hosp?specialtyId=${specialtyId}&hospitalId=${hospitalId}`),
};

// Notifications
export const notifications = {
    getPreferences: () => apiFetch(`${API_BASE_URL}/notifications/preferences`),
    updatePreferences: (preferences: any) => apiFetch(`${API_BASE_URL}/notifications/preferences`, {
        method: 'PUT',
        body: JSON.stringify({ preferences })
    }),
    broadcast: (data: any) => apiFetch(`${API_BASE_URL}/notifications/broadcast`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    targeted: (data: any) => apiFetch(`${API_BASE_URL}/notifications/targeted`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    getAll: () => apiFetch(`${API_BASE_URL}/notifications`),
    getUnreadCount: () => apiFetch(`${API_BASE_URL}/notifications/unread-count`),
    markAsRead: () => apiFetch(`${API_BASE_URL}/notifications/mark-read`, {
        method: 'POST'
    }),
    registerFcmToken: (token: string) => apiFetch(`${API_BASE_URL}/notifications/register-token`, {
        method: 'POST',
        body: JSON.stringify({ token })
    }),
    triggerReminders: () => apiFetch(`${API_BASE_URL}/notifications/trigger-reminders`, {
        method: 'POST'
    }),
};

// Dashboard
export const dashboard = {
    get: () => apiFetch(`${API_BASE_URL}/dashboard`),
};

// Analytics
export const analytics = {
    get: (startDate: string, endDate: string) =>
        apiFetch(`${API_BASE_URL}/analytics?startDate=${startDate}&endDate=${endDate}`),
};

// Appointments
// Appointments
export const appointments = {
    getAll: () => apiFetch(`${API_BASE_URL}/appointments`),
    getById: (id: string) => apiFetch(`${API_BASE_URL}/appointments/${id}`),
    getUnavailabilityOptions: (id: string) => apiFetch(`${API_BASE_URL}/appointments/${id}/unavailability-options`),
    reschedule: (id: string, data: any) => apiFetch(`${API_BASE_URL}/appointments/${id}/reschedule`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    create: (data: any) => apiFetch(`${API_BASE_URL}/appointments`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    checkAvailability: (doctorId: string, date: string, appointmentTypeId: string, hospitalId: string) =>
        apiFetch(`${API_BASE_URL}/appointments/availability/doctor/${doctorId}?date=${date}&appointmentTypeId=${appointmentTypeId}&hospitalId=${hospitalId}`),
    analyze: (symptoms: string, language: string) => apiFetch(`${API_BASE_URL}/appointments/analyze`, {
        method: 'POST',
        body: JSON.stringify({ symptoms, language })
    }),
    updateStatus: (id: string, status: string) => apiFetch(`${API_BASE_URL}/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
    }),
    setReminder: (id: string, option: string) => apiFetch(`${API_BASE_URL}/appointments/${id}/set-reminder`, {
        method: 'POST',
        body: JSON.stringify({ reminderOption: option })
    }),
    updateType: (id: string, data: any) => apiFetch(`${API_BASE_URL}/appointment-types/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
};

// Queue
export const queue = {
    getStatus: () => apiFetch(`${API_BASE_URL}/queue/status`),
    getDoctorStatus: (doctorId: string) => apiFetch(`${API_BASE_URL}/queue/doctor/${doctorId}`),
    getAdminInit: () => apiFetch(`${API_BASE_URL}/queue/admin/init`),
    getHistory: () => apiFetch(`${API_BASE_URL}/queue/history`),
    join: (doctorId: string, hospitalId: string) => apiFetch(`${API_BASE_URL}/queue/join`, {
        method: 'POST',
        body: JSON.stringify({ doctorId, hospitalId })
    }),
    leave: () => apiFetch(`${API_BASE_URL}/queue/leave`, { method: 'DELETE' }),
    callNext: (doctorId: string) => apiFetch(`${API_BASE_URL}/queue/next/${doctorId}`, { method: 'POST' }),
    hold: (queueItemId: string) => apiFetch(`${API_BASE_URL}/queue/hold/${queueItemId}`, { method: 'POST' }),
    requeue: (queueItemId: string) => apiFetch(`${API_BASE_URL}/queue/requeue/${queueItemId}`, { method: 'POST' }),
    remove: (queueItemId: string) => apiFetch(`${API_BASE_URL}/queue/remove/${queueItemId}`, { method: 'DELETE' }),
    checkIn: (appointmentId: string) => apiFetch(`${API_BASE_URL}/queue/check-in`, {
        method: 'POST',
        body: JSON.stringify({ appointmentId })
    }),
    addWalkIn: (doctorId: string, name: string) => apiFetch(`${API_BASE_URL}/queue/walk-in/${doctorId}`, {
        method: 'POST',
        body: JSON.stringify({ name })
    }),
    addWalkInBySpecialty: (specialtyId: string, name: string) => apiFetch(`${API_BASE_URL}/queue/walk-in/specialty`, {
        method: 'POST',
        body: JSON.stringify({ name, specialtyId })
    }),
};

// Reports
export const reports = {
    upload: (data: any) => apiFetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    delete: (id: string) => apiFetch(`${API_BASE_URL}/reports/${id}`, {
        method: 'DELETE'
    }),
    getByPatient: (patientId: string) => apiFetch(`${API_BASE_URL}/reports/patient/${patientId}`),
};


// Wallet
export const wallet = {
    get: () => apiFetch(`${API_BASE_URL}/wallet`),
    getTransactions: () => apiFetch(`${API_BASE_URL}/wallet/transactions`),
    deposit: (amount: number) => apiFetch(`${API_BASE_URL}/wallet/deposit`, {
        method: 'POST',
        body: JSON.stringify({ amount })
    }),
    redeemCode: (code: string) => apiFetch(`${API_BASE_URL}/wallet/redeem-code`, {
        method: 'POST',
        body: JSON.stringify({ code })
    }),
};

// Pharmacy
export const pharmacy = {
    getAll: () => apiFetch(`${API_BASE_URL}/pharmacy`),
    create: (data: any) => apiFetch(`${API_BASE_URL}/pharmacy`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => apiFetch(`${API_BASE_URL}/pharmacy/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id: string) => apiFetch(`${API_BASE_URL}/pharmacy/${id}`, {
        method: 'DELETE'
    }),
};

// Emergency Contacts
export const emergencyContacts = {
    getAll: () => apiFetch(`${API_BASE_URL}/emergency-contacts`),
    create: (data: any) => apiFetch(`${API_BASE_URL}/emergency-contacts`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => apiFetch(`${API_BASE_URL}/emergency-contacts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id: string) => apiFetch(`${API_BASE_URL}/emergency-contacts/${id}`, {
        method: 'DELETE'
    }),
};


// Patient History
export const patientHistory = {
    get: (patientId?: string) => apiFetch(`${API_BASE_URL}/patient/history${patientId ? `/${patientId}` : ''}`),
};

// Reminders
export const reminders = {
    getAll: () => apiFetch(`${API_BASE_URL}/reminders`),
    create: (data: any) => apiFetch(`${API_BASE_URL}/reminders`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    delete: (id: string) => apiFetch(`${API_BASE_URL}/reminders/${id}`, {
        method: 'DELETE'
    }),
};
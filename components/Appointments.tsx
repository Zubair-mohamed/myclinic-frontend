import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Appointment, Specialty, AppointmentType, User, Hospital } from '../types';
import { CalendarIcon, XCircleIcon, BellIcon, BellSnoozeIcon, InfoCircleIcon, ClockIcon, CheckCircleIcon, AlertTriangleIcon, MapPinIcon, DocumentTextIcon, SearchIcon, UserCircleIcon, UserPlusIcon, WalletIcon, ChevronDownIcon, BuildingOfficeIcon, ClipboardListIcon, PlusIcon } from './Icons';
import { apiFetch } from '../utils/api';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { getTranslatedName } from '../utils/translation';
import MedicalRecords from './MedicalRecords';

type AiChatHistoryItem = {
    role: 'user' | 'model';
    text: string;
};

type AiChatResponse = {
    text: string;
    isComplete: boolean;
    options?: string[];
    recommendation?: {
        specialtyId?: string;
        specialtyName?: string;
        doctorId?: string;
        doctorName?: string;
        urgency?: 'Low' | 'Medium' | 'High' | string;
        reason?: string;
    };
};

const statusStyles = {
    Upcoming: 'bg-blue-100 text-blue-700 border border-blue-200',
    Completed: 'bg-green-100 text-green-700 border border-green-200',
    Cancelled: 'bg-red-100 text-red-700 border border-red-200',
    NoShow: 'bg-gray-200 text-gray-700 border border-gray-300'
};

interface AppointmentsProps {
    bookingPrefill: {
        specialtyId: string;
        hospitalId: string;
        appointmentTypeId: string;
        doctorId: string;
        patientId?: string;
    } | null;
    onPrefillConsumed: () => void;
}

// --- Modern Appointment Card ---
const AppointmentCard: React.FC<{ 
    appt: Appointment;
    onStatusChange: (id: string, status: Appointment['status']) => void;
    onSetReminder: (appt: Appointment) => void;
    onViewReports?: (patientId: string, patientName: string) => void;
    isPatient: boolean;
    isAdmin: boolean;
}> = ({ appt, onStatusChange, onSetReminder, onViewReports, isPatient, isAdmin }) => {
    const { t } = useTranslation();

    const getStatusTranslation = (status: Appointment['status']) => {
        const key = `appointments.status${status}`;
        return t(key as any);
    };

    const handleCancel = () => {
        if (window.confirm(t('appointments.confirmCancel'))) {
            onStatusChange(appt._id, 'Cancelled');
        }
    };

    return (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(getTranslatedName(isPatient ? (appt.doctor?.name || {en: 'Doctor', ar: 'طبيب'}) : (appt.user?.name || {en: 'Patient', ar: 'مريض'})))}&background=E6F0FF&color=006FEE&size=128`} 
                        alt="Avatar" 
                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" 
                    />
                    <div className="absolute bottom-0 end-0 bg-white rounded-full p-1 border shadow-sm">
                        {isPatient ? <UserCircleIcon className="w-3 h-3 text-primary"/> : <UserPlusIcon className="w-3 h-3 text-secondary"/>}
                    </div>
                </div>
                <div>
                    <p className="font-bold text-dark text-lg">
                        {getTranslatedName(isPatient ? (appt.doctor?.name || {en: 'Doctor', ar: 'طبيب'}) : (appt.user?.name || {en: 'Patient', ar: 'مريض'}))}
                    </p>
                    <div className="flex items-center text-sm text-gray-500 mt-0.5">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium me-2 text-gray-700">
                            {getTranslatedName(appt.appointmentType?.name || {en: 'Consultation', ar: 'كشف'})}
                        </span>
                        <span className="flex items-center">
                            <ClockIcon className="w-3 h-3 me-1"/>
                            {appt.date ? new Date(appt.date).toLocaleDateString() : 'N/A'} • {appt.time || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-3 self-end md:self-auto flex-wrap justify-end">
                 {!isPatient && onViewReports && appt.user && (
                    <button 
                        onClick={() => onViewReports(
                            typeof appt.user === 'object' ? appt.user._id : appt.user,
                            getTranslatedName(typeof appt.user === 'object' ? appt.user.name : {en: 'Patient', ar: 'مريض'})
                        )}
                        className="flex items-center text-xs font-bold text-primary hover:bg-primary-light px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-primary-light"
                    >
                        <DocumentTextIcon className="w-4 h-4 me-1.5" />
                        {t('appointments.viewReports')}
                    </button>
                 )}

                 {isAdmin ? (
                    <div className="relative">
                        <select
                            value={appt.status}
                            onChange={(e) => onStatusChange(appt._id, e.target.value as Appointment['status'])}
                            className={`appearance-none ps-4 pe-8 py-1.5 text-xs font-bold rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 transition-colors ${statusStyles[appt.status]}`}
                        >
                            <option value="Upcoming">{getStatusTranslation('Upcoming')}</option>
                            <option value="Completed">{getStatusTranslation('Completed')}</option>
                            <option value="Cancelled">{getStatusTranslation('Cancelled')}</option>
                            <option value="NoShow">{getStatusTranslation('NoShow')}</option>
                        </select>
                        <ChevronDownIcon className="w-3 h-3 absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"/>
                    </div>
                ) : (
                    <span className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${statusStyles[appt.status]}`}>
                        {getStatusTranslation(appt.status)}
                    </span>
                )}

                {isPatient && appt.status === 'Upcoming' && (
                    <div className="flex items-center gap-2 border-s ps-4 ms-2 border-gray-200">
                        {appt.reminderSet ? (
                            <span className="p-2 bg-green-50 text-green-600 rounded-full" title={t('appointments.reminderSet')!}>
                                <BellSnoozeIcon className="w-5 h-5" />
                            </span>
                        ) : (
                             <button onClick={() => onSetReminder(appt)} className="p-2 text-gray-400 hover:text-secondary hover:bg-secondary-light rounded-full transition-colors" title={t('appointments.setReminder')!}>
                                <BellIcon className="w-5 h-5" />
                            </button>
                        )}
                        <button 
                            onClick={handleCancel} 
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" 
                            title={t('common.cancel')!}
                        >
                            <XCircleIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const SetReminderModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    appointment: Appointment | null;
    onReminderSet: (updatedAppointment: Appointment) => void;
}> = ({ isOpen, onClose, appointment, onReminderSet }) => {
    const { t } = useTranslation();
    const [reminderOption, setReminderOption] = useState('1-hour-before');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async () => {
        if (!appointment) return;
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            const updatedAppointment = await apiFetch(`${API_BASE_URL}/appointments/${appointment._id}/set-reminder`, {
                method: 'POST',
                body: JSON.stringify({ reminderOption }),
            });
            setSuccess(t('appointments.reminderSuccess'));
            onReminderSet(updatedAppointment);
            setTimeout(() => {
                onClose();
                setSuccess('');
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('appointments.reminderError'));
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen || !appointment) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-2">{t('appointments.reminderModalTitle')}</h3>
                <p className="text-sm text-gray-600 mb-4">
                    {t('appointments.reminderWith', { 
                        name: getTranslatedName(appointment.doctor?.name || {en: 'Doctor', ar: 'طبيب'}), 
                        date: appointment.date ? new Date(appointment.date).toLocaleDateString() : 'N/A', 
                        time: appointment.time || 'N/A' 
                    })}
                </p>
                
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                {success && <p className="text-green-600 text-sm mb-4">{success}</p>}
                
                <fieldset className="space-y-2">
                    <legend className="block text-sm font-medium text-gray-700">{t('appointments.remindMe')}</legend>
                    {['1-hour-before', '1-day-before', '2-days-before'].map(option => (
                        <div key={option} className="flex items-center">
                            <input id={option} name="reminder-option" type="radio" value={option} checked={reminderOption === option} onChange={(e) => setReminderOption(e.target.value)} className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"/>
                            <label htmlFor={option} className="ms-3 block text-sm text-gray-700">{t(`appointments.${option.replace(/-/g, '')}` as any)}</label>
                        </div>
                    ))}
                </fieldset>
                
                <div className="mt-6 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md">{t('common.cancel')}</button>
                    <button onClick={handleSubmit} disabled={isLoading || !!success} className="py-2 px-4 bg-primary text-white rounded-md disabled:bg-gray-400">
                        {isLoading ? t('appointments.settingReminder') : t('appointments.confirmReminder')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConflictModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    conflictDetails: any;
}> = ({ isOpen, onClose, conflictDetails }) => {
    const { t } = useTranslation();
    if (!isOpen || !conflictDetails) return null;

    const isDuplicate = conflictDetails?.isDuplicate === true || conflictDetails?.diffMinutes === 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl transform transition-all scale-100">
                <div className="flex items-center mb-4 text-amber-600">
                    <AlertTriangleIcon className="w-8 h-8 me-3" />
                    <h3 className="text-lg font-bold">{t('appointments.conflictWarningTitle')}</h3>
                </div>
                
                <p className="text-gray-600 mb-4">
                    {isDuplicate
                        ? t('appointments.duplicateBookingMessage')
                        : t('appointments.conflictWarningMessage', {
                            doctorName: getTranslatedName(conflictDetails.doctorName),
                            time: conflictDetails.time
                        })}
                </p>
                
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-6">
                    <h4 className="font-bold text-amber-800 mb-2 flex items-center text-sm">
                        <ClockIcon className="w-4 h-4 me-2"/>
                        {t('appointments.existingAppointment')}
                    </h4>
                    <div className="ps-6 space-y-1 text-sm text-amber-900">
                        <p><span className="font-semibold">{t('appointments.serviceLabel')}:</span> {getTranslatedName(conflictDetails.appointmentType)}</p>
                        <p><span className="font-semibold">{t('appointments.doctorLabel')}:</span> {getTranslatedName(conflictDetails.doctorName)}</p>
                        <p><span className="font-semibold">{t('appointments.time')}:</span> <span dir="ltr">{conflictDetails.time} - {new Date(conflictDetails.date).toLocaleDateString()}</span></p>
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                        {t('common.ok')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const LocationVerifier: React.FC<{
    targetLat?: number;
    targetLng?: number;
    onVerified: (verified: boolean) => void;
}> = ({ targetLat, targetLng, onVerified }) => {
    const { t } = useTranslation();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [distance, setDistance] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        setStatus('idle');
        setDistance(null);
        setErrorMsg('');
        onVerified(false);
    }, [targetLat, targetLng]); 

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; 
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; 
    };

    const handleVerify = () => {
        if (!targetLat || !targetLng) {
             onVerified(true);
             setStatus('success');
             return;
        }

        setStatus('loading');
        setErrorMsg('');

        if (!navigator.geolocation) {
            setStatus('error');
            setErrorMsg('Geolocation is not supported by your browser.');
            onVerified(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                const dist = calculateDistance(userLat, userLng, targetLat, targetLng);
                setDistance(dist);
                
                if (dist <= 100) {
                    setStatus('success');
                    onVerified(true);
                } else {
                    setStatus('error');
                    setErrorMsg(t('appointments.outsideServiceArea', { distance: dist.toFixed(1) }));
                    onVerified(false);
                }
            },
            (err) => {
                setStatus('error');
                if (err.code === err.PERMISSION_DENIED) {
                    setErrorMsg(t('appointments.permissionDeniedHelp'));
                } else {
                    setErrorMsg(t('appointments.locationPermissionDenied'));
                }
                onVerified(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    return (
        <div className={`border-2 rounded-xl p-4 transition-all duration-300 ${status === 'success' ? 'border-green-200 bg-green-50' : status === 'error' ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
            <div className="flex items-start">
                <div className={`p-2 rounded-full me-3 ${status === 'success' ? 'bg-green-100 text-green-600' : status === 'error' ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'}`}>
                    <MapPinIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h4 className={`font-bold text-sm mb-1 ${status === 'error' ? 'text-red-700' : 'text-dark'}`}>
                        {t('appointments.verifyLocation')} <span className="text-red-500">*</span>
                    </h4>
                    <p className={`text-xs mb-3 ${status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
                        {status === 'idle' && t('appointments.locationRequiredMessage')}
                        {status === 'loading' && t('appointments.detecting')}
                        {status === 'success' && t('appointments.locationConfirmed')}
                        {status === 'error' && errorMsg}
                    </p>
                    
                    {status === 'success' && distance !== null && (
                        <p className="text-xs font-medium text-green-700 mb-2">{t('appointments.distanceInfo', { distance: distance.toFixed(1) })}</p>
                    )}

                    <button 
                        onClick={handleVerify} 
                        disabled={status === 'loading' || status === 'success'}
                        className={`text-xs px-4 py-2 rounded-lg font-bold transition-all shadow-sm active:scale-95 ${
                            status === 'success' 
                            ? 'bg-green-200 text-green-800 cursor-default' 
                            : status === 'loading' 
                                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                : status === 'error'
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-primary text-white hover:bg-primary-dark'
                        }`}
                    >
                        {status === 'success' ? <><CheckCircleIcon className="w-4 h-4 inline me-1"/>{t('appointments.locationConfirmed')}</> : 
                         status === 'loading' ? t('appointments.detecting') : 
                         status === 'error' ? t('appointments.retryVerification') :
                         t('appointments.verifyLocation')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ViewReportsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
    patientName: string;
}> = ({ isOpen, onClose, patientId, patientName }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-fade-in">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-dark flex items-center">
                        <DocumentTextIcon className="w-6 h-6 me-2 text-primary" />
                        {t('medicalRecords.patientReportsTitle', { name: patientName })}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
                        <XCircleIcon className="w-7 h-7" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-white">
                    <MedicalRecords patientId={patientId} />
                </div>
            </div>
        </div>
    );
};

const PaymentConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    doctorName: string;
    serviceName: string;
    cost: number;
}> = ({ isOpen, onClose, onConfirm, doctorName, serviceName, cost }) => {
    const { t, i18n } = useTranslation();
    const currencySymbol = i18n.language === 'ar' ? 'د.ل' : 'LYD';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-fade-in">
                <div className="flex items-center mb-6 text-primary">
                    <WalletIcon className="w-8 h-8 me-3" />
                    <h3 className="text-xl font-bold">{t('appointments.paymentTitle')}</h3>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-600">{t('appointments.doctorLabel')}</span>
                        <span className="font-semibold text-dark">{doctorName}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-600">{t('appointments.serviceLabel')}</span>
                        <span className="font-semibold text-dark">{serviceName}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="font-bold text-gray-800">TOTAL</span>
                        <span className="font-bold text-xl text-success">{cost.toFixed(2)} {currencySymbol}</span>
                    </div>
                </div>

                <p className="text-center text-lg font-medium text-gray-800 mb-6">
                    {t('appointments.paymentQuestion', { cost: `${cost.toFixed(2)} ${currencySymbol}` })}
                </p>

                <p className="text-xs text-gray-500 text-center mb-6 italic bg-blue-50 p-2 rounded">
                    {t('appointments.paymentNote')}
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition-colors"
                    >
                        {t('appointments.paymentNo')}
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className="px-4 py-3 bg-success text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg"
                    >
                        {t('appointments.paymentYes')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const AppointmentCardSkeleton: React.FC = () => (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between animate-pulse">
        <div className="flex items-center w-full">
            <div className="w-14 h-14 rounded-full bg-gray-200 me-4"></div>
            <div className="flex-1">
                <div className="h-5 bg-gray-300 rounded w-3/5 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-2/5 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
        </div>
        <div className="h-8 w-24 bg-gray-200 rounded-full"></div>
    </div>
);

interface AvailableDateOption {
    dateString: string;
    displayDate: string;
    dayName: string;
    startTime: string;
    endTime: string;
}

const Appointments: React.FC<AppointmentsProps> = ({ bookingPrefill, onPrefillConsumed }) => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    
    // --- TAB STATE ---
    const [activeTab, setActiveTab] = useState<'list' | 'book'>('list');

    // --- FILTERS STATE ---
    const [filterDoctor, setFilterDoctor] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const [mode, setMode] = useState<'ai' | 'manual'>('ai');
    const [symptoms, setSymptoms] = useState('');
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
    const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('');
    const [specialtySearch, setSpecialtySearch] = useState(''); // State for searching specialties
    const [selectedAppointmentTypeId, setSelectedAppointmentTypeId] = useState('');
    
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

    const [aiChatHistory, setAiChatHistory] = useState<AiChatHistoryItem[]>([]);
    const [aiChatOptions, setAiChatOptions] = useState<string[]>([]);
    const [pendingAiDoctorId, setPendingAiDoctorId] = useState<string | null>(null);
    const aiChatHistoryRef = useRef<AiChatHistoryItem[]>([]);
    
    const [bookingState, setBookingState] = useState<{ status: 'idle' | 'booking' | 'success' | 'error', message: string, index: number | null }>({ status: 'idle', message: '', index: null });
    
    const [doctors, setDoctors] = useState<User[]>([]);
    const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    // Location verification disabled in dashboard booking.
    const [isManualLocationVerified, setIsManualLocationVerified] = useState(true);
    const [availableDates, setAvailableDates] = useState<AvailableDateOption[]>([]);
    const [calculatedSlot, setCalculatedSlot] = useState<{ nextAvailableTime: string, queuePosition: number } | null>(null);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [selectedApptForReminder, setSelectedApptForReminder] = useState<Appointment | null>(null);

    const [conflictModalOpen, setConflictModalOpen] = useState(false);
    const [conflictDetails, setConflictDetails] = useState<any>(null);

    const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
    const [selectedPatientForReports, setSelectedPatientForReports] = useState<{id: string, name: string} | null>(null);

    const [allPatients, setAllPatients] = useState<User[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<User | null>(null);
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentConfirmationData, setPaymentConfirmationData] = useState<any>(null);

    const isPatient = user?.role === 'patient';
    const isAdmin = user?.role === 'hospital staff' || user?.role === 'hospital manager' || user?.role === 'super admin';
    const canBook = isPatient || isAdmin; 
    const isStaffBooking = isAdmin;

    const currencySymbol = i18n.language === 'ar' ? 'د.ل' : 'LYD';

    const fetchAppointments = useCallback(async () => {
        setIsLoadingAppointments(true);
        setFetchError(null);
        try {
            const data = await apiFetch(`${API_BASE_URL}/appointments`);
            // Ensure data is an array
            if (Array.isArray(data)) {
                setAppointments(data);
            } else {
                console.error('Invalid appointments data format:', data);
                setAppointments([]);
                setFetchError('Invalid data format received from server');
            }
        } catch (error) {
            console.error('Error fetching appointments:', error);
            setFetchError(error instanceof Error ? error.message : 'An unknown error occurred');
            setAppointments([]); // Set empty array on error
        } finally {
            setIsLoadingAppointments(false);
        }
    }, []);

    // Filter Logic
    const uniqueDoctors = useMemo(() => {
        // Extract unique doctors from the appointments list for the filter dropdown
        const map = new Map<string, User>();
        if (appointments && appointments.length > 0) {
            appointments.forEach(a => {
                if (a.doctor) {
                    const doctorId = typeof a.doctor === 'object' ? a.doctor._id : a.doctor;
                    const doctorObj = typeof a.doctor === 'object' ? a.doctor : null;
                    if (doctorId && doctorObj) {
                        map.set(doctorId, doctorObj);
                    }
                }
            });
        }
        return Array.from(map.values());
    }, [appointments]);

    const filteredAppointments = useMemo(() => {
        if (!appointments || appointments.length === 0) return [];
        return appointments.filter(appt => {
            // Safely check doctor
            const matchDoctor = filterDoctor ? (appt.doctor && (typeof appt.doctor === 'object' ? appt.doctor._id : appt.doctor) === filterDoctor) : true;
            const matchStatus = filterStatus ? appt.status === filterStatus : true;
            const matchDate = filterDate ? appt.date === filterDate : true; 
            return matchDoctor && matchStatus && matchDate;
        });
    }, [appointments, filterDoctor, filterStatus, filterDate]);

    const clearFilters = () => {
        setFilterDoctor('');
        setFilterDate('');
        setFilterStatus('');
    };

    useEffect(() => {
        if (isStaffBooking) {
            const fetchPatients = async () => {
                try {
                    const users = await apiFetch(`${API_BASE_URL}/users`); 
                    const patients = users.filter((u: User) => u.role === 'patient');
                    setAllPatients(patients);
                    if (bookingPrefill?.patientId) {
                        const prefilledPatient = patients.find(p => p._id === bookingPrefill.patientId);
                        if (prefilledPatient) setSelectedPatient(prefilledPatient);
                    }
                } catch (error) {
                    console.error("Failed to fetch patients for staff", error);
                }
            };
            fetchPatients();
        }
    }, [isStaffBooking, bookingPrefill]);

    useEffect(() => {
        const fetchBookingData = async () => {
            if (canBook) {
                try {
                    const [specialtiesData, typesData] = await Promise.all([
                        apiFetch(`${API_BASE_URL}/specialties/public`),
                        apiFetch(`${API_BASE_URL}/appointment-types/public`)
                    ]);
                    setSpecialties(specialtiesData);
                    setAppointmentTypes(typesData);
                } catch (error) {
                    console.error("Failed to fetch booking data", error);
                }
            }
        };
        fetchBookingData();
        fetchAppointments();
        if (isStaffBooking) {
            setMode('manual');
        }
    }, [fetchAppointments, canBook, isStaffBooking]);

    useEffect(() => {
        if (bookingPrefill) {
            const { specialtyId, hospitalId, appointmentTypeId, doctorId } = bookingPrefill;
            setActiveTab('book'); // Switch to booking tab automatically
            setMode('manual');
            setSelectedSpecialtyId(specialtyId);
            setSelectedAppointmentTypeId(appointmentTypeId);
            const prefillDoctors = async () => {
                setIsLoadingDoctors(true);
                try {
                    const data = await apiFetch(`${API_BASE_URL}/users/doctors?specialtyId=${specialtyId}&hospitalId=${hospitalId}`);
                    setDoctors(data);
                    setSelectedDoctorId(doctorId);
                } catch (error) {
                    console.error("Failed to prefill doctors:", error);
                } finally {
                    setIsLoadingDoctors(false);
                }
            };
            prefillDoctors();
            onPrefillConsumed();
        }
    }, [bookingPrefill, onPrefillConsumed]);

    useEffect(() => {
        if (mode === 'manual' && selectedSpecialtyId) {
            const fetchDoctors = async () => {
                setIsLoadingDoctors(true);
                const selectedSpec = specialties.find(s => s._id === selectedSpecialtyId);
                if (!selectedSpec || !selectedSpec.hospital) return;
                const hospital = selectedSpec.hospital as any;
                const hospitalId = hospital._id || hospital;
                try {
                    const data = await apiFetch(`${API_BASE_URL}/users/doctors?specialtyId=${selectedSpecialtyId}&hospitalId=${hospitalId}`);
                    setDoctors(data);
                } catch (error) {
                    console.error(error);
                } finally {
                    setIsLoadingDoctors(false);
                }
            };
            fetchDoctors();
        }
    }, [mode, selectedSpecialtyId, specialties]);

    useEffect(() => {
        aiChatHistoryRef.current = aiChatHistory;
    }, [aiChatHistory]);

    useEffect(() => {
        if (mode === 'manual' && pendingAiDoctorId && doctors.length > 0) {
            const exists = doctors.some(d => d._id === pendingAiDoctorId);
            if (exists) {
                setSelectedDoctorId(pendingAiDoctorId);
                setPendingAiDoctorId(null);
            }
        }
    }, [mode, pendingAiDoctorId, doctors]);

    useEffect(() => {
        if (mode === 'manual' && selectedDoctorId && selectedSpecialtyId) {
            const doctor = doctors.find(d => d._id === selectedDoctorId);
            const selectedSpec = specialties.find(s => s._id === selectedSpecialtyId);
            if (doctor && doctor.availability && selectedSpec && selectedSpec.hospital) {
                const hospitalObj = selectedSpec.hospital as any;
                const hospitalId = hospitalObj._id || hospitalObj;
                const options: AvailableDateOption[] = [];
                const today = new Date();
                for (let i = 0; i < 14; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() + i);
                    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
                    const schedule = doctor.availability.find(d => {
                        if (!d.isAvailable) return false;
                        if (d.dayOfWeek !== dayOfWeek) return false;
                        const availHospId = (typeof d.hospital === 'object' && d.hospital) ? (d.hospital as any)._id : d.hospital;
                        return String(availHospId) === String(hospitalId);
                    });
                    if (schedule) {
                        // FIX: Manually construct YYYY-MM-DD from local date components to avoid UTC shifts
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const dateString = `${year}-${month}-${day}`;

                        options.push({
                            dateString: dateString,
                            displayDate: date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' }),
                            dayName: date.toLocaleDateString(i18n.language, { weekday: 'long' }),
                            startTime: schedule.startTime,
                            endTime: schedule.endTime
                        });
                    }
                }
                setAvailableDates(options);
                setSelectedDate('');
            }
        }
    }, [mode, selectedDoctorId, selectedSpecialtyId, doctors, specialties, i18n.language]);

    useEffect(() => {
        if (mode === 'manual' && selectedDoctorId && selectedDate && selectedAppointmentTypeId) {
            const fetchNextSlot = async () => {
                setIsLoadingSlots(true);
                setCalculatedSlot(null);
                setBookingState({ status: 'idle', message: '', index: null });
                try {
                    const selectedSpec = specialties.find(s => s._id === selectedSpecialtyId);
                    const hospitalData = selectedSpec?.hospital as any;
                    const hospitalId = hospitalData?._id || (typeof hospitalData === 'string' ? hospitalData : null);
                    if (!hospitalId) { setIsLoadingSlots(false); return; }
                    const data = await apiFetch(`${API_BASE_URL}/appointments/availability/doctor/${selectedDoctorId}?date=${selectedDate}&appointmentTypeId=${selectedAppointmentTypeId}&hospitalId=${hospitalId}`);
                    if (data.nextAvailableTime) {
                        setCalculatedSlot(data);
                    } else {
                        setBookingState({ status: 'error', message: data.message || t('appointments.noSlots'), index: -1 });
                    }
                } catch (error) {
                    const msg = error instanceof Error ? error.message : 'Error fetching schedule';
                    setBookingState({ status: 'error', message: msg, index: -1 });
                } finally {
                    setIsLoadingSlots(false);
                }
            };
            fetchNextSlot();
        }
    }, [mode, selectedDoctorId, selectedDate, selectedAppointmentTypeId, selectedSpecialtyId, specialties, t]);

    const filteredPatients = useMemo(() => {
        if (!patientSearchTerm) return [];
        const lower = patientSearchTerm.toLowerCase();
        return allPatients.filter(p => 
            getTranslatedName(p.name).toLowerCase().includes(lower) ||
            p.phone?.includes(lower)
        ).slice(0, 5); // Limit results
    }, [allPatients, patientSearchTerm]);

    const filteredSpecialties = useMemo(() => {
        if (!specialtySearch) return specialties;
        const lower = specialtySearch.toLowerCase();
        return specialties.filter(s => 
            getTranslatedName(s.name).toLowerCase().includes(lower) ||
            getTranslatedName(s.hospital?.name).toLowerCase().includes(lower)
        );
    }, [specialties, specialtySearch]);

    const sendAiChatMessage = async (message: string) => {
        const trimmed = message.trim();
        if (!trimmed) {
            setBookingState({ status: 'error', message: t('appointments.symptomsRequired'), index: null });
            return;
        }

        setBookingState({ status: 'idle', message: '', index: null });
        setIsLoadingAnalysis(true);

        const historyToSend = aiChatHistoryRef.current;

        setAiChatHistory(prev => [...prev, { role: 'user', text: trimmed }]);
        setSymptoms('');
        setAiChatOptions([]);

        try {
            const result = await apiFetch(`${API_BASE_URL}/ai/chat`, {
                method: 'POST',
                body: JSON.stringify({
                    message: trimmed,
                    history: historyToSend,
                    language: i18n.language,
                }),
            }) as AiChatResponse;

            setAiChatHistory(prev => [...prev, { role: 'model', text: result.text || '' }]);

            const options = Array.isArray(result.options) ? result.options.filter(Boolean) : [];
            setAiChatOptions(options);

            if (result.isComplete && result.recommendation?.specialtyId) {
                const specialtyId = String(result.recommendation.specialtyId);
                handleProceedToManualBooking(specialtyId);

                if (result.recommendation.doctorId) {
                    setPendingAiDoctorId(String(result.recommendation.doctorId));
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : t('appointments.suggestionError');
            setBookingState({ status: 'error', message: errorMessage, index: null });
        } finally {
            setIsLoadingAnalysis(false);
        }
    };

    const handleProceedToManualBooking = (specialtyId: string) => {
        const exists = specialties.some(s => s._id === specialtyId);
        if (exists) {
            setSelectedSpecialtyId(specialtyId);
            setMode('manual');
            resetManualForm();
        } else {
            setBookingState({ status: 'error', message: 'Suggested specialty not found in this hospital.', index: null });
        }
    };

    const executeBooking = async (bookingData: any, index: number) => {
        setBookingState({ status: 'booking', message: '', index });
        try {
            await apiFetch(`${API_BASE_URL}/appointments`, {
                method: 'POST',
                body: JSON.stringify(bookingData),
            });
            setBookingState({ status: 'success', message: t('appointments.bookingSuccess'), index });
            setConflictModalOpen(false);
            setIsPaymentModalOpen(false);
            fetchAppointments();
            if (index === -1) {
                setTimeout(() => { 
                    setBookingState({ status: 'idle', message: '', index: null });
                    setCalculatedSlot(null);
                    setSelectedDate('');
                    setIsManualLocationVerified(true);
                    if (isStaffBooking) {
                        setSelectedPatient(null);
                        setPatientSearchTerm('');
                    }
                    // Auto-switch back to list view on success for better UX
                    setActiveTab('list');
                }, 2000);
            }
        } catch (error: any) {
            if (error.status === 409 && error.data?.conflictDetails) {
                setConflictDetails(error.data.conflictDetails);
                setConflictModalOpen(true);
                setBookingState({ status: 'idle', message: '', index: null });
                return;
            }
            const errorMessage = error instanceof Error ? error.message : t('appointments.bookingError');
            setBookingState({ status: 'error', message: errorMessage, index });
        }
    };
    
    const handleManualBook = async () => {
        if (isStaffBooking && !selectedPatient) {
            setBookingState({ status: 'error', message: 'Please select a patient.', index: null });
            return;
        }

        const selectedSpec = specialties.find(s => s._id === selectedSpecialtyId);
        const selectedType = appointmentTypes.find(t => t._id === selectedAppointmentTypeId);
        const selectedDoctor = doctors.find(d => d._id === selectedDoctorId);

        if (!selectedSpec || !selectedSpec.hospital || !selectedDoctorId || !selectedDate || !calculatedSlot || !selectedAppointmentTypeId) {
            setBookingState({ status: 'error', message: 'Please complete all steps.', index: null });
            return;
        }
        const hospitalData = selectedSpec.hospital as any;
        const hospitalId = hospitalData._id || hospitalData;
        
        const appointmentData: any = {
            appointmentTypeId: selectedAppointmentTypeId,
            date: selectedDate, // Use the exact YYYY-MM-DD string we generated
            time: calculatedSlot.nextAvailableTime,
            doctorId: selectedDoctorId,
            hospitalId: hospitalId,
        };

        if (isStaffBooking && selectedPatient) {
            appointmentData.patientId = selectedPatient._id;
            setPaymentConfirmationData({
                bookingData: appointmentData,
                doctorName: getTranslatedName(selectedDoctor?.name),
                serviceName: getTranslatedName(selectedType?.name),
                cost: selectedType?.cost || 0
            });
            setIsPaymentModalOpen(true);
            return;
        }

        executeBooking(appointmentData, -1);
    };
    
    const handlePaymentConfirmed = () => {
        if (paymentConfirmationData) {
            const dataWithCashFlag = { 
                ...paymentConfirmationData.bookingData, 
                cashPayment: true 
            };
            executeBooking(dataWithCashFlag, -1);
        }
    };

    const handleStatusChange = async (id: string, status: Appointment['status']) => {
        try {
            const updatedAppointment = await apiFetch(`${API_BASE_URL}/appointments/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ status }),
            });
            setAppointments(prev => prev.map(a => a._id === id ? updatedAppointment : a));
        } catch (error) {
            console.error('Failed to update status', error);
            setFetchError(error instanceof Error ? error.message : 'Failed to update status');
        }
    };

    const handleOpenReminderModal = (appt: Appointment) => {
        setSelectedApptForReminder(appt);
        setIsReminderModalOpen(true);
    };

    const handleReminderSet = (updatedAppointment: Appointment) => {
        setAppointments(prev => prev.map(a => a._id === updatedAppointment._id ? updatedAppointment : a));
        setIsReminderModalOpen(false);
        setSelectedApptForReminder(null);
    };

    const handleViewReports = (patientId: string, patientName: string) => {
        setSelectedPatientForReports({ id: patientId, name: patientName });
        setIsReportsModalOpen(true);
    };

    const resetManualForm = () => {
        setSelectedDoctorId('');
        setSelectedAppointmentTypeId('');
        setSelectedDate('');
        setCalculatedSlot(null);
        setDoctors([]);
        setAvailableDates([]);
        setIsManualLocationVerified(true);
    };
    
    const filteredAppointmentTypes = useMemo(() => {
        if (!selectedSpecialtyId) return [];
        return appointmentTypes.filter(type => type.specialty._id === selectedSpecialtyId);
    }, [selectedSpecialtyId, appointmentTypes]);
    
    const getSelectedManualHospital = () => {
         const selectedSpec = specialties.find(s => s._id === selectedSpecialtyId);
         return selectedSpec?.hospital as Hospital | undefined;
    }

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold text-dark">{t('appointments.title')}</h1>
                <p className="text-gray-500 mt-1">{t('appointments.description')}</p>
            </div>

            {canBook && (
                <div className="flex justify-center">
                    <div className="bg-gray-100 p-1 rounded-xl inline-flex space-x-1 rtl:space-x-reverse">
                        <button 
                            onClick={() => setActiveTab('list')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                                activeTab === 'list' 
                                ? 'bg-white text-primary shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <div className="flex items-center">
                                <CalendarIcon className="w-4 h-4 me-2"/>
                                {t('appointments.mySchedule')}
                            </div>
                        </button>
                        <button 
                            onClick={() => setActiveTab('book')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                                activeTab === 'book' 
                                ? 'bg-white text-primary shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <div className="flex items-center">
                                <PlusIcon className="w-4 h-4 me-2"/>
                                {t('appointments.bookNew')}
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* TAB CONTENT */}
            <div className="mt-6">
                
                {/* 1. BOOKING TAB */}
                {activeTab === 'book' && canBook && (
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6 max-w-2xl mx-auto animate-fade-in">
                        {/* ... (Existing Booking Code remains exactly the same, preserved in XML) */}
                        <h2 className="text-2xl font-bold text-dark border-b border-gray-100 pb-4 flex items-center">
                            {t(isStaffBooking ? 'appointments.bookForPatient' : 'appointments.bookNew')}
                        </h2>
                        
                        {/* Enhanced Patient Selection for Staff */}
                        {isStaffBooking && (
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-gray-700">{t('appointments.selectPatient')}</label>
                                {!selectedPatient ? (
                                    <div className="relative">
                                        <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input 
                                            type="text" 
                                            className="w-full ps-10 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                            placeholder={t('appointments.searchPatientPlaceholder')}
                                            value={patientSearchTerm}
                                            onChange={e => setPatientSearchTerm(e.target.value)}
                                        />
                                        {filteredPatients.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-100 rounded-xl shadow-xl mt-2 max-h-60 overflow-y-auto p-2">
                                                {filteredPatients.map(p => (
                                                    <button 
                                                        key={p._id} 
                                                        onClick={() => {
                                                            setSelectedPatient(p);
                                                            setPatientSearchTerm('');
                                                        }}
                                                        className="w-full text-start p-3 hover:bg-blue-50 rounded-lg transition-colors flex items-center"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold me-3">
                                                            {getTranslatedName(p.name).charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-dark block">{getTranslatedName(p.name)}</span>
                                                            <span className="text-xs text-gray-500">{p.phone}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 relative overflow-hidden animate-fade-in">
                                        <div className="absolute top-0 right-0 p-2">
                                            <button onClick={() => setSelectedPatient(null)} className="text-red-400 hover:text-red-600 bg-white rounded-full p-1 shadow-sm">
                                                <XCircleIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-start">
                                            <div className="w-12 h-12 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center text-xl font-bold text-primary me-4">
                                                {getTranslatedName(selectedPatient.name).charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-dark text-lg leading-tight">{getTranslatedName(selectedPatient.name)}</p>
                                                <p className="text-sm text-gray-600 mt-1 flex items-center"><UserCircleIcon className="w-3 h-3 me-1"/> {selectedPatient.phone}</p>
                                                {selectedPatient.email && <p className="text-xs text-gray-500 mt-0.5">{selectedPatient.email}</p>}
                                            </div>
                                        </div>
                                        {/* Medical Info Preview */}
                                        <div className="mt-4 pt-3 border-t border-blue-100 grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-gray-500 block mb-0.5">{t('medicalRecords.bloodType')}</span>
                                                <span className="font-bold bg-white px-2 py-1 rounded text-dark inline-block shadow-sm">{selectedPatient.medicalProfile?.bloodType || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block mb-0.5">{t('medicalRecords.allergies')}</span>
                                                <span className="font-bold bg-white px-2 py-1 rounded text-red-600 inline-block shadow-sm truncate max-w-full">
                                                    {selectedPatient.medicalProfile?.allergies?.length ? selectedPatient.medicalProfile.allergies[0] : 'None'}
                                                    {selectedPatient.medicalProfile?.allergies?.length && selectedPatient.medicalProfile.allergies.length > 1 ? '...' : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!isStaffBooking && (
                        <div className="bg-gray-100 p-1 rounded-lg flex">
                            <button onClick={() => setMode('ai')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all duration-200 ${mode === 'ai' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                {t('appointments.aiSuggestion')}
                            </button>
                            <button onClick={() => setMode('manual')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all duration-200 ${mode === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                {t('appointments.manualBooking')}
                            </button>
                        </div>
                        )}

                        {mode === 'ai' && !isStaffBooking ? (
                        <>
                            <div>
                                <label htmlFor="symptoms" className="block text-sm font-bold text-gray-700 mb-2">{t('appointments.describeSymptoms')}</label>
                                <textarea
                                    id="symptoms"
                                    rows={4}
                                    value={symptoms}
                                    onChange={(e) => setSymptoms(e.target.value)}
                                    className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                                    placeholder={t('appointments.symptomsPlaceholder')}
                                />
                            </div>
                            
                            {bookingState.status === 'error' && bookingState.index === null && <p className="text-red-500 text-sm font-medium bg-red-50 p-2 rounded-lg">{bookingState.message}</p>}
                            
                            <button onClick={() => sendAiChatMessage(symptoms)} disabled={isLoadingAnalysis} className="w-full py-3 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dark hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                                {isLoadingAnalysis ? t('appointments.gettingSuggestions') : t('appointments.getSuggestions')}
                            </button>
                            
                            {isLoadingAnalysis && (
                                <div className="p-4 rounded-xl bg-gray-50 animate-pulse mt-4">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            )}

                            {(aiChatHistory.length > 0) && (
                                <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm animate-fade-in">
                                    <div className="flex items-center mb-3 text-primary">
                                        <InfoCircleIcon className="w-5 h-5 me-2" />
                                        <h3 className="text-base font-bold">{t('appointments.aiSuggestion')}</h3>
                                    </div>

                                    <div className="space-y-2 max-h-72 overflow-y-auto">
                                        {aiChatHistory.map((m, idx) => (
                                            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm border ${
                                                    m.role === 'user'
                                                        ? 'bg-primary-light text-dark border-primary-light'
                                                        : 'bg-gray-50 text-gray-700 border-gray-100'
                                                }`}>
                                                    {m.text}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {aiChatOptions.length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {aiChatOptions.slice(0, 4).map((opt) => (
                                                <button
                                                    key={opt}
                                                    onClick={() => sendAiChatMessage(opt)}
                                                    disabled={isLoadingAnalysis}
                                                    className="px-3 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 hover:border-primary-light hover:bg-primary-light transition-all disabled:opacity-70"
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                        ) : (
                        <div className="space-y-5">
                            {/* Modern Grid Specialty Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex justify-between items-center">
                                    {t('appointments.selectSpecialty')}
                                    <span className="text-[10px] font-normal bg-gray-100 px-2 py-0.5 rounded-full">{filteredSpecialties.length}</span>
                                </label>
                                
                                <div className="relative">
                                    <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder={t('hospitals.availableServices')} // Reusing generic search placeholder could be better
                                        value={specialtySearch}
                                        onChange={e => setSpecialtySearch(e.target.value)}
                                        className="w-full ps-9 p-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary-light focus:border-primary transition-all mb-2"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                    {filteredSpecialties.map(spec => (
                                        <div 
                                            key={spec._id} 
                                            onClick={() => {
                                                setSelectedSpecialtyId(spec._id);
                                                resetManualForm();
                                            }}
                                            className={`cursor-pointer p-3 rounded-xl border transition-all duration-200 flex flex-col items-start gap-1 relative overflow-hidden ${
                                                selectedSpecialtyId === spec._id 
                                                ? 'border-primary bg-primary-light ring-1 ring-primary shadow-sm' 
                                                : 'border-gray-200 bg-white hover:border-primary-light hover:shadow-sm'
                                            }`}
                                        >
                                            {selectedSpecialtyId === spec._id && (
                                                <div className="absolute top-2 right-2 text-primary">
                                                    <CheckCircleIcon className="w-4 h-4" />
                                                </div>
                                            )}
                                            <ClipboardListIcon className={`w-5 h-5 ${selectedSpecialtyId === spec._id ? 'text-primary' : 'text-gray-400'}`} />
                                            <span className={`font-bold text-sm leading-tight ${selectedSpecialtyId === spec._id ? 'text-primary-dark' : 'text-gray-700'}`}>
                                                {getTranslatedName(spec.name)}
                                            </span>
                                            <span className="text-[10px] text-gray-500 flex items-center truncate w-full">
                                                <BuildingOfficeIcon className="w-3 h-3 me-1 inline" />
                                                {getTranslatedName(spec.hospital?.name)}
                                            </span>
                                        </div>
                                    ))}
                                    {filteredSpecialties.length === 0 && (
                                        <div className="col-span-2 text-center py-4 text-sm text-gray-400">
                                            No specialties found.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('appointments.selectDoctor')}</label>
                                <div className="relative">
                                    <select id="doctor-manual" value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)} disabled={!selectedSpecialtyId || isLoadingDoctors} className="w-full p-3 ps-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all appearance-none disabled:opacity-60">
                                        <option value="" disabled>{isLoadingDoctors ? t('common.loading') : t('appointments.chooseDoctor')}</option>
                                        {doctors.map(doc => (<option key={doc._id} value={doc._id}>{getTranslatedName(doc.name)}</option>))}
                                    </select>
                                    <ChevronDownIcon className="w-4 h-4 absolute end-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('appointments.selectAppointmentType')}</label>
                                <div className="relative">
                                    <select id="appointmentType-manual" value={selectedAppointmentTypeId} onChange={e => setSelectedAppointmentTypeId(e.target.value)} disabled={!selectedSpecialtyId || filteredAppointmentTypes.length ===0} className="w-full p-3 ps-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all appearance-none disabled:opacity-60">
                                        <option value="" disabled>{t('appointments.appointmentType')}</option>
                                        {filteredAppointmentTypes.map(type => (<option key={type._id} value={type._id}>{getTranslatedName(type.name)} (~{type.duration} mins)</option>))}
                                    </select>
                                    <ChevronDownIcon className="w-4 h-4 absolute end-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('appointments.selectDate')}</label>
                                {availableDates.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pe-1">
                                        {availableDates.map((option) => (
                                            <button
                                                key={option.dateString}
                                                onClick={() => setSelectedDate(option.dateString)}
                                                disabled={!selectedAppointmentTypeId}
                                                className={`p-3 rounded-xl border text-start transition-all duration-200 ${
                                                    selectedDate === option.dateString
                                                        ? 'border-primary bg-primary text-white shadow-lg scale-[1.02]'
                                                        : 'border-gray-200 bg-white hover:border-primary text-gray-700'
                                                } ${!selectedAppointmentTypeId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <div className="font-bold text-sm">{option.dayName}</div>
                                                <div className={`text-xs ${selectedDate === option.dateString ? 'text-white/80' : 'text-gray-500'}`}>{option.displayDate}</div>
                                                <div className={`text-xs mt-1 font-mono ${selectedDate === option.dateString ? 'text-white/90' : 'text-gray-400'}`} dir="ltr">{option.startTime} - {option.endTime}</div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-6 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500">
                                        {selectedDoctorId ? "No availability found." : "Select doctor first."}
                                    </div>
                                )}
                            </div>
                            
                            {isLoadingSlots && <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>}

                            {calculatedSlot && (
                                <div className="p-4 bg-gradient-to-r from-blue-50 to-white rounded-xl border border-blue-100 animate-fade-in shadow-sm">
                                    <div className="flex items-start">
                                        <div className="bg-blue-100 p-2 rounded-full me-3">
                                            <CheckCircleIcon className="w-5 h-5 text-primary"/>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-primary">{t('queue.queueDetails')}</h4>
                                            <div className="mt-2 space-y-1 text-sm text-gray-700">
                                                <p className="flex justify-between w-full gap-4"><span className="font-medium">{t('queue.queueNo')}:</span> <span className="text-lg font-bold text-dark">{calculatedSlot.queuePosition}</span></p>
                                                <p className="flex justify-between w-full gap-4"><span className="font-medium">{t('appointments.slotWaitTime')}:</span> <span className="font-bold font-mono bg-white px-2 rounded border">{calculatedSlot.nextAvailableTime}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Location verification removed from dashboard booking */}
                            
                            {(bookingState.status === 'error' && bookingState.index === -1) && <p className="text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium border border-red-100">{bookingState.message}</p>}
                            {(bookingState.status === 'success' && bookingState.index === -1) && <p className="text-green-600 bg-green-50 p-3 rounded-lg text-sm font-medium border border-green-100">{bookingState.message}</p>}
                            
                            <button 
                                onClick={handleManualBook} 
                                disabled={!calculatedSlot || bookingState.status === 'booking'} 
                                className="w-full py-3 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary-dark focus:ring-4 focus:ring-primary-light disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed transition-all mt-2"
                            >
                                {bookingState.status === 'booking' ? bookingState.message || t('appointments.booking') : t('appointments.bookNow')}
                            </button>
                        </div>
                        )}
                    </div>
                )}

                {/* 2. LIST TAB */}
                {activeTab === 'list' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-dark ps-1">{t(isAdmin ? 'appointments.allAppointments' : isPatient ? 'appointments.yourAppointments' : 'appointments.yourSchedule')}</h2>
                        </div>

                        {/* --- FILTER BAR --- */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                {/* Doctor Filter */}
                                <div className="w-full md:w-1/3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('appointments.filterByDoctor')}</label>
                                    <div className="relative">
                                        <select 
                                            value={filterDoctor} 
                                            onChange={(e) => setFilterDoctor(e.target.value)} 
                                            className="w-full p-2.5 ps-3 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary appearance-none text-sm"
                                        >
                                            <option value="">{t('appointments.allDoctors')}</option>
                                            {uniqueDoctors.map(doc => (
                                                <option key={doc._id} value={doc._id}>{getTranslatedName(doc.name)}</option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="w-4 h-4 absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                                    </div>
                                </div>

                                {/* Date Filter */}
                                <div className="w-full md:w-1/3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('appointments.filterByDate')}</label>
                                    <div className="relative">
                                        <input 
                                            type="date" 
                                            value={filterDate} 
                                            onChange={(e) => setFilterDate(e.target.value)} 
                                            className="w-full p-2.5 ps-3 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Status Filter */}
                                <div className="w-full md:w-1/3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('appointments.filterByStatus')}</label>
                                    <div className="relative">
                                        <select 
                                            value={filterStatus} 
                                            onChange={(e) => setFilterStatus(e.target.value)} 
                                            className="w-full p-2.5 ps-3 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary appearance-none text-sm"
                                        >
                                            <option value="">{t('appointments.allStatuses')}</option>
                                            <option value="Upcoming">{t('appointments.statusUpcoming')}</option>
                                            <option value="Completed">{t('appointments.statusCompleted')}</option>
                                            <option value="Cancelled">{t('appointments.statusCancelled')}</option>
                                            <option value="NoShow">{t('appointments.statusNoShow')}</option>
                                        </select>
                                        <ChevronDownIcon className="w-4 h-4 absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                                    </div>
                                </div>

                                {/* Reset Button */}
                                <div className="w-full md:w-auto pb-0.5">
                                    <button 
                                        onClick={clearFilters}
                                        className="w-full md:w-auto px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition-colors text-sm"
                                    >
                                        {t('appointments.clearFilters')}
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {isLoadingAppointments ? (
                            Array(3).fill(0).map((_, i) => <AppointmentCardSkeleton key={i} />)
                        ) : fetchError ? (
                            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-center font-medium"><p>{fetchError}</p></div>
                        ) : filteredAppointments.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredAppointments.map(appt => <AppointmentCard key={appt._id} appt={appt} onStatusChange={handleStatusChange} onSetReminder={handleOpenReminderModal} onViewReports={handleViewReports} isPatient={isPatient} isAdmin={isAdmin} />)}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                                <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
                                <p className="text-gray-500 font-medium">{t('appointments.noAppointments')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
             <SetReminderModal
                isOpen={isReminderModalOpen}
                onClose={() => setIsReminderModalOpen(false)}
                appointment={selectedApptForReminder}
                onReminderSet={handleReminderSet}
            />

            <ConflictModal
                isOpen={conflictModalOpen}
                onClose={() => {
                    setConflictModalOpen(false);
                    setConflictDetails(null);
                }}
                conflictDetails={conflictDetails}
            />

            {paymentConfirmationData && (
                <PaymentConfirmationModal 
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onConfirm={handlePaymentConfirmed}
                    doctorName={paymentConfirmationData.doctorName}
                    serviceName={paymentConfirmationData.serviceName}
                    cost={paymentConfirmationData.cost}
                />
            )}

            {selectedPatientForReports && (
                <ViewReportsModal
                    isOpen={isReportsModalOpen}
                    onClose={() => {
                        setIsReportsModalOpen(false);
                        setSelectedPatientForReports(null);
                    }}
                    patientId={selectedPatientForReports.id}
                    patientName={selectedPatientForReports.name}
                />
            )}
        </div>
    );
};

export default Appointments;
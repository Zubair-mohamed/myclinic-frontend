import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { QueueItem, QueueState, User, Specialty, Appointment, MedicalProfile, MedicalReport } from '../types';
import { queue, appointments, reports, users, hospitals, patientHistory } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ChevronRightIcon, TrashIcon, UserPlusIcon, CalendarIcon, UserCircleIcon, DocumentTextIcon, CloudArrowUpIcon, CheckCircleIcon, InfoCircleIcon, ClockIcon, EyeIcon } from './Icons';
import { getTranslatedName } from '../utils/translation';

// Extending QueueState locally to include 'held' list
interface ExtendedQueueState extends QueueState {
    held: QueueItem[];
}

const StatCard: React.FC<{ title: string; value: React.ReactNode; footer: string; className?: string; isLoading: boolean }> = ({ title, value, footer, className, isLoading }) => (
    <div className={`p-6 rounded-xl shadow-md flex flex-col justify-between ${className}`}>
        <p className="font-medium text-sm opacity-80">{title}</p>
        {isLoading ? (
            <div className="h-10 mt-1 w-20 bg-gray-300/50 rounded animate-pulse"></div>
        ) : (
            <p className="text-3xl font-bold">{value}</p>
        )}
        <p className="text-xs opacity-80 mt-1">{footer}</p>
    </div>
);

const QueueListItem: React.FC<{ item: QueueItem, index: number, onRemove?: (id: string, name: string) => void, onRequeue?: (id: string) => void, isAdminView: boolean, isCurrentUser: boolean, isHeld?: boolean }> = ({ item, index, onRemove, onRequeue, isAdminView, isCurrentUser, isHeld }) => {
    const { t } = useTranslation();
    const displayName = getTranslatedName(item.user?.name) || item.walkInName;
    return (
        <div className={`p-4 rounded-lg flex items-center justify-between group transition-all duration-300 ${isCurrentUser ? 'bg-primary-light border-2 border-primary scale-105 shadow-lg' : isHeld ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
            <div className="flex items-center">
                <div className={`text-xl font-bold w-8 text-center me-4 ${isHeld ? 'text-red-500' : 'text-primary'}`}>
                    {isHeld ? '!' : index + 1}
                </div>
                <div>
                    <p className="font-semibold text-dark">{isCurrentUser ? t('queue.you', { name: displayName }) : displayName}</p>
                    <p className="text-sm text-gray-500">{t('queue.queueNo', { number: item.queueNumber })}</p>
                    {isHeld && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Missed Turn</span>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {isAdminView && isHeld && onRequeue && (
                    <button onClick={() => onRequeue(item._id)} className="text-sm px-3 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-primary hover:text-white hover:border-primary transition-colors shadow-sm">
                        {t('queue.requeue')}
                    </button>
                )}
                {isAdminView && onRemove && (
                    <button onClick={() => onRemove(item._id, displayName || 'Patient')} className="text-gray-400 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

const WalkInModal: React.FC<{ doctor: User; isOpen: boolean; onClose: () => void; onSave: () => Promise<void>; }> = ({ doctor, isOpen, onClose, onSave }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await queue.addWalkIn(doctor._id, name);
            await onSave();
            onClose();
            setName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add patient');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold mb-4">{t('queue.walkInModalTitle', { doctorName: getTranslatedName(doctor.name) })}</h3>
                <div>
                    <label htmlFor="walkInName" className="block text-sm font-medium text-gray-700">{t('queue.patientName')}</label>
                    <input type="text" id="walkInName" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full p-2 border rounded-md" required />
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                <div className="mt-6 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md">{t('common.cancel')}</button>
                    <button type="submit" disabled={isLoading} className="py-2 px-4 bg-primary text-white rounded-md disabled:bg-gray-400">
                        {isLoading ? t('common.processing') : t('queue.addWalkIn')}
                    </button>
                </div>
            </form>
        </div>
    );
};

const WalkInBySpecialtyModal: React.FC<{ specialties: Specialty[]; isOpen: boolean; onClose: () => void; onSave: () => Promise<void>; }> = ({ specialties, isOpen, onClose, onSave }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [specialtyId, setSpecialtyId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (specialties.length > 0) {
            setSpecialtyId(specialties[0]._id);
        }
    }, [specialties]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await queue.addWalkInBySpecialty(specialtyId, name);
            await onSave();
            onClose();
            setName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add patient');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">{t('queue.addWalkIn')}</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="walkInNameSpecialty" className="block text-sm font-medium text-gray-700">{t('queue.patientName')}</label>
                        <input type="text" id="walkInNameSpecialty" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full p-2 border rounded-md" required />
                    </div>
                    <div>
                        <label htmlFor="walkInSpecialty" className="block text-sm font-medium text-gray-700">{t('appointments.chooseSpecialty')}</label>
                        <select id="walkInSpecialty" value={specialtyId} onChange={e => setSpecialtyId(e.target.value)} className="mt-1 block w-full p-2 border rounded-md" required>
                            {specialties.map(spec => <option key={spec._id} value={spec._id}>{getTranslatedName(spec.name)}</option>)}
                        </select>
                    </div>
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                <div className="mt-6 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md">{t('common.cancel')}</button>
                    <button type="submit" disabled={isLoading} className="py-2 px-4 bg-primary text-white rounded-md disabled:bg-gray-400">
                        {isLoading ? t('common.processing') : t('queue.addWalkIn')}
                    </button>
                </div>
            </form>
        </div>
    );
};

// --- Consultation Panel for Doctor ---
const ConsultationPanel: React.FC<{
    queueItem: QueueItem;
    doctorId: string;
    onFinish: () => void;
    onHold: () => void;
}> = ({ queueItem, doctorId, onFinish, onHold }) => {
    const { t } = useTranslation();
    const [history, setHistory] = useState<Appointment[]>([]);
    const [medicalProfile, setMedicalProfile] = useState<MedicalProfile | null>(null);
    const [reportsList, setReportsList] = useState<MedicalReport[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Upload State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isRegisteredUser = !!queueItem.user;
    const patientName = getTranslatedName(queueItem.user?.name) || queueItem.walkInName;

    useEffect(() => {
        if (isRegisteredUser && queueItem.user?._id) {
            const fetchData = async () => {
                setIsLoadingData(true);
                try {
                    const data = await patientHistory.get(queueItem.user!._id);
                    // Filter appointments for THIS doctor only
                    const myHistory = data.appointments.filter((appt: Appointment) => appt.doctor._id === doctorId);
                    setHistory(myHistory);
                    setMedicalProfile(data.profile?.medicalProfile || null);
                    setReportsList(data.reports || []);
                } catch (error) {
                    console.error("Failed to fetch consultation data", error);
                } finally {
                    setIsLoadingData(false);
                }
            };
            fetchData();
        }
    }, [queueItem, isRegisteredUser, doctorId]);

    const handleUploadReport = async (e: React.FormEvent) => {
        e.preventDefault();
        const file = fileInputRef.current?.files?.[0];
        if (!file || !title) return;

        if (!isRegisteredUser) {
            alert(t('queue.consultation.walkInError') || "Cannot upload reports for walk-in guests.");
            return;
        }

        setIsUploading(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64Data = reader.result as string;
            try {
                const newReport = await reports.upload({
                    title,
                    description,
                    fileData: base64Data,
                    fileType: file.type,
                    patientId: queueItem.user?._id // Explicitly pass patient ID
                });
                setUploadSuccess(true);
                setReportsList(prev => [newReport, ...prev]);
                setTimeout(() => setUploadSuccess(false), 3000);
                // Clear form
                setTitle('');
                setDescription('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            } catch (err) {
                alert(t('error') || 'Failed to upload report');
            } finally {
                setIsUploading(false);
            }
        };
    };

    return (
        <div className="bg-white rounded-xl shadow-md border border-primary overflow-hidden mb-6 animate-fade-in">
            <div className="bg-primary text-white p-4 flex justify-between items-center">
                <div className="flex items-center">
                    <UserCircleIcon className="w-8 h-8 me-3" />
                    <div>
                        <h3 className="font-bold text-lg">{t('queue.consultation.activeSession')}</h3>
                        <p className="text-sm opacity-90">{t('queue.consultation.patient')}: <span className="font-bold">{patientName}</span></p>
                    </div>
                </div>
                <div className="bg-white/20 px-3 py-1 rounded text-sm font-mono">
                    {queueItem.queueNumber}
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Patient Vitals & Info */}
                <div className="lg:col-span-1 space-y-6 border-e pe-4">
                    {isRegisteredUser ? (
                        <>
                            <div>
                                <h4 className="font-bold text-gray-700 mb-3 flex items-center"><InfoCircleIcon className="w-4 h-4 me-2" />{t('medicalRecords.healthProfile')}</h4>
                                {isLoadingData ? <div className="h-20 bg-gray-100 rounded animate-pulse"></div> : (
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-red-50 p-2 rounded border border-red-100">
                                            <p className="text-xs text-red-600 font-bold">{t('medicalRecords.bloodType')}</p>
                                            <p className="font-bold text-dark">{medicalProfile?.bloodType || '--'}</p>
                                        </div>
                                        <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                            <p className="text-xs text-blue-600 font-bold">{t('medicalRecords.height')}</p>
                                            <p className="font-bold text-dark">{medicalProfile?.height || '--'}</p>
                                        </div>
                                        <div className="bg-amber-50 p-2 rounded border border-amber-100">
                                            <p className="text-xs text-amber-600 font-bold">{t('medicalRecords.weight')}</p>
                                            <p className="font-bold text-dark">{medicalProfile?.weight || '--'}</p>
                                        </div>
                                        <div className="col-span-3 text-start mt-2">
                                            <p className="text-xs font-bold text-gray-500">{t('medicalRecords.allergies')}:</p>
                                            <p className="text-sm text-red-600 bg-red-50 p-1 rounded">{medicalProfile?.allergies?.join(', ') || t('dashboard.none')}</p>
                                        </div>
                                        <div className="col-span-3 text-start">
                                            <p className="text-xs font-bold text-gray-500">{t('medicalRecords.chronicConditions')}:</p>
                                            <p className="text-sm text-blue-600 bg-blue-50 p-1 rounded">{medicalProfile?.chronicConditions?.join(', ') || t('dashboard.none')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-700 mb-3 flex items-center"><CalendarIcon className="w-4 h-4 me-2" />{t('queue.consultation.pastVisits')}</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {history.length > 0 ? history.map(appt => (
                                        <div key={appt._id} className="text-xs bg-gray-50 p-2 rounded border-s-4 border-primary">
                                            <p className="font-bold">{new Date(appt.date).toLocaleDateString()}</p>
                                            <p className="text-gray-600">{getTranslatedName(appt.appointmentType.name)}</p>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-gray-400 italic">{t('queue.consultation.noPastVisits')}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-700 mb-3 flex items-center"><DocumentTextIcon className="w-4 h-4 me-2" />{t('medicalRecords.uploadedReports')}</h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {reportsList.length > 0 ? reportsList.map(report => (
                                        <div key={report._id} className="text-xs bg-gray-50 p-3 rounded-xl border-s-4 border-secondary flex justify-between items-center group">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-dark truncate text-sm">{report.title}</p>
                                                <p className="text-gray-500">{new Date(report.uploadedAt).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => {
                                                        const win = window.open();
                                                        if (win) {
                                                            win.document.write(`<iframe src="${report.fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                                        }
                                                    }}
                                                    className="p-2 bg-white border rounded-xl text-primary hover:bg-primary hover:text-white transition-colors shadow-sm"
                                                    title={t('common.view') || 'عرض'}
                                                >
                                                    <EyeIcon className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        const link = document.createElement('a');
                                                        link.href = report.fileData;
                                                        link.download = `${report.title}.${report.fileType.split('/')[1] || 'pdf'}`;
                                                        link.click();
                                                    }}
                                                    className="p-2 bg-white border rounded-xl text-secondary hover:bg-secondary hover:text-white transition-colors shadow-sm"
                                                    title={t('common.download') || 'تحميل'}
                                                >
                                                    <CloudArrowUpIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-gray-400 italic">{t('medicalRecords.noReports')}</p>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-gray-100 p-4 rounded text-center text-sm text-gray-500">
                            {t('queue.consultation.walkInPatient') || 'Guest Patient (Walk-in).'}<br />{t('queueHistory.noHistory')}
                        </div>
                    )}
                </div>

                {/* Right Column: Actions & Upload */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <h4 className="font-bold text-gray-700 mb-3 flex items-center"><DocumentTextIcon className="w-5 h-5 me-2" />{t('queue.consultation.actions')}</h4>

                        {isRegisteredUser ? (
                            <form onSubmit={handleUploadReport} className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder={t('queue.consultation.reportTitlePlaceholder')}
                                        className="p-2 text-sm border rounded w-full"
                                        required
                                    />
                                    <div className="relative">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept=".pdf,.jpg,.png"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            required
                                        />
                                        <div className="p-2 text-sm border rounded w-full bg-white flex items-center justify-between">
                                            <span className="text-gray-400 truncate">{fileInputRef.current?.files?.[0]?.name || t('common.selectFile') || 'اختر ملفاً'}</span>
                                            <span className="bg-primary text-white px-2 py-1 rounded text-xs">{t('common.browse') || 'تصفح'}</span>
                                        </div>
                                    </div>
                                </div>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder={t('queue.consultation.notesPlaceholder')}
                                    className="w-full p-2 text-sm border rounded h-20"
                                />
                                <div className="flex justify-between items-center">
                                    <button
                                        type="submit"
                                        disabled={isUploading}
                                        className="flex items-center px-6 py-3 bg-secondary text-white rounded-2xl text-base font-bold hover:bg-secondary-dark disabled:bg-gray-300 shadow-md transition-all active:scale-95"
                                    >
                                        {isUploading ? t('queue.consultation.uploading') : <><CloudArrowUpIcon className="w-5 h-5 me-2" />{t('queue.consultation.uploadAndEmail')}</>}
                                    </button>
                                    {uploadSuccess && <span className="text-green-600 text-sm font-bold flex items-center"><CheckCircleIcon className="w-5 h-5 me-1" /> {t('queue.consultation.sent')}</span>}
                                </div>
                            </form>
                        ) : (
                            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                                {t('queue.consultation.walkInUploadDisabled') || 'Digital uploads and emailing are disabled for unregistered Walk-in patients.'}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t">
                        <button
                            onClick={onHold}
                            className="flex items-center px-8 py-4 bg-amber-100 text-amber-800 rounded-2xl font-black hover:bg-amber-200 transition-all shadow-sm active:scale-95 text-lg"
                        >
                            <ClockIcon className="w-6 h-6 me-2" />
                            {t('queue.consultation.hold')}
                        </button>
                        <button
                            onClick={onFinish}
                            className="flex items-center px-10 py-4 bg-success text-white rounded-2xl font-black shadow-lg hover:bg-green-700 transition-all hover:scale-105 active:scale-95 text-lg"
                        >
                            {t('queue.consultation.finish')} <ChevronRightIcon className="w-6 h-6 ms-2" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const WaitingQueue: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();

    const [queueState, setQueueState] = useState<ExtendedQueueState | null>(null);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    // ... (other state variables remain)
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
    const [isWalkInBySpecialtyModalOpen, setIsWalkInBySpecialtyModalOpen] = useState(false);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);

    const isAdmin = user && ['doctor', 'hospital staff', 'hospital manager', 'super admin'].includes(user.role);
    const isPatient = user?.role === 'patient';
    const isDoctorRole = user?.role === 'doctor';

    const refreshPatientQueue = useCallback(async () => {
        try {
            const data: ExtendedQueueState = await queue.getStatus();
            setQueueState(data);
            if (data.userStatus.inQueue) {
                setSelectedDoctorId(data.userStatus.doctorId);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('queue.errors.unknown'));
        }
    }, [t]);

    const refreshAdminQueue = useCallback(async (doctorId: string | null) => {
        if (!doctorId) return;
        try {
            const data: ExtendedQueueState = await queue.getDoctorStatus(doctorId);
            setQueueState(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('queue.errors.unknown'));
        }
    }, [t]);

    // ... (UseEffects remain unchanged)
    // Fetch specialties for hospital staff
    useEffect(() => {
        if (user?.role === 'hospital staff') {
            const fetchSpecialties = async () => {
                try {
                    const data = await hospitals.getSpecialties();
                    setSpecialties(data);
                } catch (err) {
                    console.error("Failed to fetch specialties for queue", err);
                }
            };
            fetchSpecialties();
        }
    }, [user?.role]);

    // Initial data load effect
    useEffect(() => {
        const initialLoad = async () => {
            setIsLoading(true);
            setError(null);
            try {
                if (isPatient) {
                    await refreshPatientQueue();
                } else if (isAdmin) {
                    const data = await queue.getAdminInit();
                    setQueueState({
                        nowServing: data.nowServing,
                        waiting: data.waiting,
                        held: data.held || [],
                        doctors: data.doctors,
                        userStatus: { inQueue: false, doctorId: null, position: null, estimatedWaitTime: 0, status: null },
                        todaysAppointments: [],
                    });
                    setSelectedDoctorId(data.initialDoctorId);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : t('queue.errors.loadFailed'));
            } finally {
                setIsLoading(false);
            }
        };
        initialLoad();
    }, [isPatient, isAdmin, refreshPatientQueue, t]);

    // Polling for real-time updates
    useEffect(() => {
        if (isLoading || isActionLoading) return;

        const poll = () => {
            if (isPatient) {
                refreshPatientQueue();
            } else if (isAdmin && selectedDoctorId) {
                refreshAdminQueue(selectedDoctorId);
            }
        };

        const intervalId = setInterval(poll, 2500);
        return () => clearInterval(intervalId);
    }, [isLoading, isActionLoading, isPatient, isAdmin, selectedDoctorId, refreshPatientQueue, refreshAdminQueue]);

    // Clock effect
    useEffect(() => {
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timeInterval);
    }, []);


    const handleJoinQueue = async (doctorId: string, hospitalId: string) => {
        setIsActionLoading(true);
        setError(null);
        try {
            await queue.join(doctorId, hospitalId);
            await refreshPatientQueue(); // Immediate refresh after action
        } catch (err) {
            setError(err instanceof Error ? err.message : t('queue.errors.joinFailed'));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleLeaveQueue = async () => {
        setIsActionLoading(true);
        setError(null);
        try {
            await queue.leave();
            await refreshPatientQueue(); // Immediate refresh
        } catch (err) {
            setError(err instanceof Error ? err.message : t('queue.errors.leaveFailed'));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleCallNext = async () => {
        if (!selectedDoctorId) return;
        setIsActionLoading(true);
        setError(null);
        try {
            await queue.callNext(selectedDoctorId);
            await refreshAdminQueue(selectedDoctorId); // Immediate refresh
        } catch (err) {
            setError(err instanceof Error ? err.message : t('queue.errors.callNextFailed'));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleHoldPatient = async (queueItemId: string) => {
        if (!selectedDoctorId) return;
        setIsActionLoading(true);
        setError(null);
        try {
            await queue.hold(queueItemId);
            await refreshAdminQueue(selectedDoctorId);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('queue.errors.holdFailed'));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRequeuePatient = async (queueItemId: string) => {
        if (!selectedDoctorId) return;
        setIsActionLoading(true);
        setError(null);
        try {
            await queue.requeue(queueItemId);
            await refreshAdminQueue(selectedDoctorId);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('queue.errors.requeueFailed'));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRemovePatient = async (queueItemId: string, name: string) => {
        if (window.confirm(t('queue.confirmRemoveText', { name }))) {
            setIsActionLoading(true);
            setError(null);
            try {
                await queue.remove(queueItemId);
                await refreshAdminQueue(selectedDoctorId); // Immediate refresh
            } catch (err) {
                setError(err instanceof Error ? err.message : t('queue.errors.removeFailed'));
            } finally {
                setIsActionLoading(false);
            }
        }
    };

    const handleCheckInScheduled = async (appointmentId: string) => {
        setIsActionLoading(true);
        setError(null);
        try {
            await queue.checkIn(appointmentId);
            await refreshAdminQueue(selectedDoctorId); // Refresh to see new patient in Waiting list
        } catch (err) {
            setError(err instanceof Error ? err.message : t('queue.errors.checkInFailed'));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleOpenWalkInModal = () => {
        if (user?.role === 'hospital staff') {
            setIsWalkInBySpecialtyModalOpen(true);
        } else {
            setIsWalkInModalOpen(true);
        }
    };

    const selectedDoctor = queueState?.doctors.find(d => d._id === selectedDoctorId);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-dark">{t('queue.title')}</h1>
                <p className="text-gray-500 mt-1">{t('queue.description', { time: currentTime.toLocaleTimeString() })}</p>
            </div>

            {error && <div className="bg-red-100 border-s-4 border-red-500 text-red-700 p-4" role="alert"><p>{error}</p></div>}

            {/* DOCTOR CONSULTATION VIEW */}
            {isDoctorRole && queueState?.nowServing && (
                <ConsultationPanel
                    queueItem={queueState.nowServing}
                    doctorId={user._id}
                    onFinish={handleCallNext}
                    onHold={() => handleHoldPatient(queueState.nowServing!._id)}
                />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Now Serving Card */}
                    <div className="md:col-span-2 bg-primary text-white p-6 rounded-xl shadow-lg">
                        <h2 className="text-lg font-semibold opacity-90">{t('queue.nowServing')}</h2>
                        {isLoading && !queueState ? (
                            <div className="h-10 mt-2 w-3/4 bg-blue-400 rounded animate-pulse"></div>
                        ) : queueState?.nowServing ? (
                            <>
                                <p className="text-4xl font-bold mt-1">{getTranslatedName(queueState.nowServing.user?.name) || queueState.nowServing.walkInName}</p>
                                <p className="opacity-80 font-medium">{t('queue.queueNo', { number: queueState.nowServing.queueNumber })}</p>
                            </>
                        ) : (
                            <p className="text-2xl font-bold mt-2">{t('queue.noOneServing')}</p>
                        )}
                    </div>

                    {/* Queue List */}
                    <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold text-dark mb-1">{t('queue.upNext')}</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            {queueState?.waiting && queueState.waiting.length > 0
                                ? t('queue.waitingInLine', { count: queueState.waiting.length })
                                : t('queue.noOneWaiting')}
                        </p>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {isLoading && !queueState ? (
                                <p>{t('common.loading')}</p>
                            ) : queueState?.waiting && queueState.waiting.length > 0 ? (
                                queueState.waiting.map((item, index) => (
                                    <QueueListItem key={item._id} item={item} index={index} onRemove={isAdmin ? handleRemovePatient : undefined} isAdminView={!!isAdmin} isCurrentUser={item.user?._id === user?._id} />
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">{t('queue.noQueue')}</div>
                            )}
                        </div>
                    </div>

                    {/* HELD/MISSED TURN LIST (Admin Only) */}
                    {isAdmin && queueState?.held && queueState.held.length > 0 && (
                        <div className="md:col-span-2 bg-red-50 p-6 rounded-xl shadow-md border border-red-100">
                            <h2 className="text-xl font-bold text-red-800 mb-1">{t('queue.missedTurn')}</h2>
                            <div className="space-y-3 mt-4">
                                {queueState.held.map((item, index) => (
                                    <QueueListItem
                                        key={item._id}
                                        item={item}
                                        index={index}
                                        onRemove={handleRemovePatient}
                                        onRequeue={handleRequeuePatient}
                                        isAdminView={true}
                                        isCurrentUser={false}
                                        isHeld={true}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1 space-y-6">
                    {/* Stats Cards */}
                    {isPatient && (
                        <div className="grid grid-cols-2 gap-4">
                            <StatCard
                                title={t('queue.yourPosition')}
                                value={queueState?.userStatus.status === 'Held' ? t('common.holdStatus') : (queueState?.userStatus.position || t('common.notAvailable'))}
                                footer={queueState?.userStatus.status === 'Held' ? t('queue.missedTurnMessage') : t('queue.inQueue')}
                                className={`${queueState?.userStatus.status === 'Held' ? 'bg-red-100 text-red-800' : 'bg-white text-dark'}`}
                                isLoading={isLoading}
                            />
                            <StatCard
                                title={t('queue.estimatedWaitTime')}
                                value={queueState?.userStatus.inQueue ? <>{queueState.userStatus.estimatedWaitTime}<span className="text-xl ms-1">{t('queue.mins')}</span></> : t('common.notAvailable')}
                                footer={t('queue.approximate')}
                                className="bg-white text-dark"
                                isLoading={isLoading}
                            />
                            <StatCard
                                title={t('queue.queueNo', { number: '' }).replace(/\s*\{number\}\s*/, '') || t('queue.queueNo', { number: '' })}
                                value={queueState?.userStatus.queueNumber || '—'}
                                footer={queueState?.userStatus.checkInTime ? new Date(queueState.userStatus.checkInTime).toLocaleTimeString() : ''}
                                className="bg-white text-dark"
                                isLoading={isLoading}
                            />
                        </div>
                    )}

                    {/* Role-specific Panel */}
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        {isAdmin ? (
                            <div>
                                <h3 className="font-bold text-lg mb-4">{t('queue.doctorControls')}</h3>
                                <div className="space-y-3">
                                    {user?.role === 'doctor' ? (
                                        <div className="w-full p-2 border rounded-md bg-gray-100 text-gray-700 font-medium">
                                            {getTranslatedName(user.name)}
                                        </div>
                                    ) : (
                                        <select value={selectedDoctorId || ''} onChange={e => setSelectedDoctorId(e.target.value)} className="w-full p-2 border rounded-md">
                                            <option value="" disabled>{t('queue.selectDoctor')}</option>
                                            {queueState?.doctors.map(doc => <option key={doc._id} value={doc._id}>{getTranslatedName(doc.name)}</option>)}
                                        </select>
                                    )}
                                    <button onClick={handleCallNext} disabled={!selectedDoctorId || isActionLoading || !queueState?.waiting || queueState.waiting.length === 0} className="w-full flex items-center justify-center py-2 px-4 bg-success text-white rounded-md font-semibold text-sm disabled:bg-gray-400 transition-colors">
                                        {t('queue.callNextPatient')}<ChevronRightIcon className="w-5 h-5 ms-1" />
                                    </button>
                                    {user && ['hospital staff', 'hospital manager', 'super admin'].includes(user.role) && (
                                        <button onClick={handleOpenWalkInModal} disabled={!selectedDoctorId && user.role !== 'hospital staff'} className="w-full flex items-center justify-center py-2 px-4 bg-secondary text-white rounded-md font-semibold text-sm disabled:bg-gray-400 transition-colors">
                                            <UserPlusIcon className="w-5 h-5 me-2" />{t('queue.addWalkIn')}
                                        </button>
                                    )}
                                </div>

                                {/* NEW SECTION: Scheduled Patients for today who haven't checked in yet */}
                                {queueState?.todaysAppointments && queueState.todaysAppointments.length > 0 && (
                                    <div className="mt-6 pt-4 border-t">
                                        <h4 className="font-bold text-gray-700 mb-2">{t('queue.scheduledPatients')} <span className="text-xs font-normal text-gray-500">({queueState.todaysAppointments.length})</span></h4>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {queueState.todaysAppointments.map(appt => (
                                                <div key={appt._id} className="flex justify-between items-center p-2 bg-blue-50 rounded text-sm">
                                                    <div>
                                                        <p className="font-bold text-dark">{getTranslatedName(appt.user.name)}</p>
                                                        <p className="text-xs text-gray-500">{appt.time} - {getTranslatedName(appt.appointmentType.name)}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCheckInScheduled(appt._id)}
                                                        disabled={isActionLoading}
                                                        className="px-2 py-1 bg-primary text-white text-xs rounded hover:bg-primary-dark transition-colors disabled:opacity-50"
                                                    >
                                                        {t('queue.joinQueue')}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {queueState?.todaysAppointments && queueState.todaysAppointments.length === 0 && (
                                    <div className="mt-4 text-center text-xs text-gray-400">
                                        {t('queue.noScheduledPatients')}
                                    </div>
                                )}

                            </div>
                        ) : (
                            <div>
                                <h3 className="font-bold text-lg mb-4">{t('queue.patientActions')}</h3>
                                {queueState?.userStatus.inQueue ? (
                                    <>
                                        {queueState.userStatus.status === 'Held' ? (
                                            <p className="text-sm text-center bg-red-100 text-red-800 p-3 rounded-md mb-3 font-bold">
                                                {t('queue.missedTurnMessage')}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-center bg-primary-light text-primary-dark p-3 rounded-md mb-3">{t('queue.yourSpotHighlighted')}</p>
                                        )}

                                        <button onClick={handleLeaveQueue} disabled={isActionLoading} className="w-full py-3 bg-danger text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-400">
                                            {t('queue.leaveQueue')}
                                        </button>
                                    </>
                                ) : queueState?.todaysAppointments && queueState.todaysAppointments.length > 0 ? (
                                    <div className="space-y-3">
                                        <p className="text-sm text-gray-600">{t('queue.checkInForAppointment')}</p>
                                        {queueState.todaysAppointments.map(appt => (
                                            <div key={appt._id} className="bg-gray-50 p-3 rounded-lg text-center">
                                                <p className="font-semibold">{getTranslatedName(appt.doctor.name)}</p>
                                                <p className="text-xs text-gray-500">{getTranslatedName(appt.hospital.name)} at {appt.time}</p>
                                                <button onClick={() => handleJoinQueue(appt.doctor._id, appt.hospital._id)} disabled={isActionLoading} className="mt-2 w-full py-1.5 bg-success text-white rounded-md text-sm font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400">
                                                    {t('queue.joinQueue')}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-gray-100 p-4 rounded-lg text-center text-gray-600 text-sm">
                                        <CalendarIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                        <p>{t('queue.noAppointmentsToday')}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isWalkInModalOpen && selectedDoctor && (
                <WalkInModal
                    doctor={selectedDoctor}
                    isOpen={isWalkInModalOpen}
                    onClose={() => setIsWalkInModalOpen(false)}
                    onSave={() => refreshAdminQueue(selectedDoctorId)}
                />
            )}

            {isWalkInBySpecialtyModalOpen && (
                <WalkInBySpecialtyModal
                    specialties={specialties}
                    isOpen={isWalkInBySpecialtyModalOpen}
                    onClose={() => setIsWalkInBySpecialtyModalOpen(false)}
                    onSave={() => refreshAdminQueue(selectedDoctorId)}
                />
            )}
        </div>
    );
};

export default WaitingQueue;
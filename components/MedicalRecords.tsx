
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MedicalReport, Appointment, User } from '../types';
import { users, reports, appointments, patientHistory } from '../utils/api';
import { CloudArrowUpIcon, DocumentTextIcon, TrashIcon, ClipboardListIcon, UserCircleIcon, CalendarCheckIcon, CheckCircleIcon, EyeIcon, ChevronDownIcon } from './Icons';
import { useAuth } from '../context/AuthContext';
import { getTranslatedName } from '../utils/translation';

interface MedicalRecordsProps {
    patientId?: string; // If provided, viewing specific patient (Doctor view)
}

// Helper to format file size
const formatFileSize = (base64String: string) => {
    // Approx size: (length * 3) / 4 - padding
    const sizeInBytes = (base64String.length * 3) / 4;
    const sizeInKb = sizeInBytes / 1024;
    if (sizeInKb > 1024) {
        return `${(sizeInKb / 1024).toFixed(2)} MB`;
    }
    return `${sizeInKb.toFixed(0)} KB`;
};

const SecureFileViewer: React.FC<{
    fileData: string;
    fileType: string;
    title: string;
    isOpen: boolean;
    onClose: () => void;
}> = ({ fileData, fileType, title, isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-dark">{title}</h3>
                        <p className="text-xs text-gray-500 uppercase">{fileType}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content Viewer */}
                <div className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center p-4 relative">
                    {fileType.includes('pdf') ? (
                        <iframe
                            src={fileData}
                            className="w-full h-full rounded-lg shadow-inner border border-gray-300"
                            title={title}
                        />
                    ) : fileType.includes('image') ? (
                        <img
                            src={fileData}
                            alt={title}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        />
                    ) : (
                        <div className="text-center p-8 bg-white rounded-xl shadow-md">
                            <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 font-medium">Preview not available for this file type.</p>
                            <p className="text-sm text-gray-400 mt-1">Please download the file to view it.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MedicalRecords: React.FC<MedicalRecordsProps> = ({ patientId }) => {
    const { t } = useTranslation();
    const { user, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'reports'>('profile');

    // Data State
    const [reports, setReports] = useState<MedicalReport[]>([]);
    const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
    const [patientProfile, setPatientProfile] = useState<Partial<User> | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Profile Edit State
    const [bloodType, setBloodType] = useState('Unknown');
    const [height, setHeight] = useState<number | ''>('');
    const [weight, setWeight] = useState<number | ''>('');
    const [allergies, setAllergies] = useState('');
    const [conditions, setConditions] = useState('');

    // Report Upload State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Viewing State
    const [viewerFile, setViewerFile] = useState<{ data: string, type: string, title: string } | null>(null);
    const [filterSource, setFilterSource] = useState<'all' | 'patient' | 'doctor'>('all');

    const isDoctorView = !!patientId;
    const targetId = patientId || user?._id;

    const fetchFullHistory = async () => {
        if (!targetId) return;
        setIsLoading(true);
        setError('');
        try {
            // New endpoint to fetch aggregated medical history
            const data = await patientHistory.get(targetId);
            setReports(data.reports);
            setPastAppointments(data.appointments);
            setPatientProfile(data.profile);

            // Initialize form with fetched data
            if (data.profile?.medicalProfile) {
                setBloodType(data.profile.medicalProfile.bloodType || 'Unknown');
                setHeight(data.profile.medicalProfile.height || '');
                setWeight(data.profile.medicalProfile.weight || '');
                setAllergies(data.profile.medicalProfile.allergies?.join(', ') || '');
                setConditions(data.profile.medicalProfile.chronicConditions?.join(', ') || '');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch records');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFullHistory();
    }, [targetId]);

    const handleSaveProfile = async () => {
        setIsSavingProfile(true);
        setSuccessMsg('');
        setError('');
        try {
            const updatedData = {
                medicalProfile: {
                    bloodType,
                    height: Number(height),
                    weight: Number(weight),
                    allergies: allergies.split(',').map(s => s.trim()).filter(s => s),
                    chronicConditions: conditions.split(',').map(s => s.trim()).filter(s => s)
                }
            };

            const updatedUser = await users.updateProfile(updatedData);

            if (!isDoctorView) {
                updateUser(updatedUser);
            }

            setSuccessMsg(t('profile.successMessage'));
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.size > 2 * 1024 * 1024) { // 2MB Check
            alert(t('medicalRecords.fileSizeError'));
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        const file = fileInputRef.current?.files?.[0];
        if (!file || !title) return;

        setIsUploading(true);
        setError('');

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64Data = reader.result as string;
            try {
                await reports.upload({
                    title,
                    description,
                    fileData: base64Data,
                    fileType: file.type,
                    patientId: targetId // Pass target patient ID if doctor is uploading
                });
                setTitle('');
                setDescription('');
                if (fileInputRef.current) fileInputRef.current.value = '';
                fetchFullHistory(); // Refresh list
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Upload failed');
            } finally {
                setIsUploading(false);
            }
        };
    };

    const handleDeleteReport = async (id: string) => {
        if (!window.confirm(t('medicalRecords.confirmDelete'))) return;
        try {
            await reports.delete(id);
            setReports(prev => prev.filter(r => r._id !== id));
        } catch (err) {
            alert('Failed to delete report');
        }
    };

    const downloadFile = (dataUri: string, filename: string) => {
        try {
            const link = document.createElement("a");
            link.href = dataUri;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            alert("Could not download file.");
        }
    };

    // Robust filtering logic to handle String vs Object IDs and missing data
    const filteredReports = reports.filter(r => {
        if (filterSource === 'all') return true;

        // Convert everything to string safely to avoid mismatch (ObjectId vs String)
        const uploaderId = r.uploadedBy?._id?.toString() || '';
        // patient can be a string ID or a populated object
        const patientId = (typeof r.patient === 'object' && r.patient ? r.patient._id : r.patient)?.toString() || '';

        if (filterSource === 'patient') {
            // Include if uploadedBy is Missing (Legacy Data) OR if IDs match
            return uploaderId === '' || uploaderId === patientId;
        }

        if (filterSource === 'doctor') {
            // Include if uploadedBy Exists AND does NOT match patient
            return uploaderId !== '' && uploaderId !== patientId;
        }
        return true;
    });

    const renderProfileTab = () => (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-xl font-bold text-dark">{t('medicalRecords.healthProfile')}</h2>
                    <p className="text-gray-500 text-sm">{t('medicalRecords.healthProfileDesc')}</p>
                </div>
                {!isDoctorView && (
                    <button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark disabled:bg-gray-300"
                    >
                        {isSavingProfile ? t('common.processing') : t('profile.saveButton')}
                    </button>
                )}
            </div>

            {successMsg && <p className="text-green-600 mb-4 bg-green-50 p-2 rounded">{successMsg}</p>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Vitals Cards */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                    <p className="text-blue-600 text-sm font-semibold uppercase">{t('medicalRecords.bloodType')}</p>
                    {!isDoctorView ? (
                        <select
                            value={bloodType}
                            onChange={(e) => setBloodType(e.target.value)}
                            className="mt-2 text-2xl font-bold text-dark bg-transparent border-b border-blue-300 focus:outline-none text-center w-full"
                        >
                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    ) : (
                        <p className="text-3xl font-bold text-dark mt-1">{bloodType}</p>
                    )}
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                    <p className="text-green-600 text-sm font-semibold uppercase">{t('medicalRecords.height')}</p>
                    <div className="flex items-center justify-center mt-2">
                        {!isDoctorView ? (
                            <input
                                type="number"
                                value={height}
                                onChange={e => setHeight(e.target.value ? Number(e.target.value) : '')}
                                className="text-2xl font-bold text-dark bg-transparent border-b border-green-300 focus:outline-none text-center w-24"
                                placeholder="--"
                            />
                        ) : (
                            <span className="text-3xl font-bold text-dark">{height || '--'}</span>
                        )}
                        <span className="text-gray-500 ms-1">cm</span>
                    </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-center">
                    <p className="text-amber-600 text-sm font-semibold uppercase">{t('medicalRecords.weight')}</p>
                    <div className="flex items-center justify-center mt-2">
                        {!isDoctorView ? (
                            <input
                                type="number"
                                value={weight}
                                onChange={e => setWeight(e.target.value ? Number(e.target.value) : '')}
                                className="text-2xl font-bold text-dark bg-transparent border-b border-amber-300 focus:outline-none text-center w-24"
                                placeholder="--"
                            />
                        ) : (
                            <span className="text-3xl font-bold text-dark">{weight || '--'}</span>
                        )}
                        <span className="text-gray-500 ms-1">kg</span>
                    </div>
                </div>

                {/* Detailed Text Areas */}
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('medicalRecords.allergies')}</label>
                        {!isDoctorView ? (
                            <textarea
                                rows={3}
                                value={allergies}
                                onChange={e => setAllergies(e.target.value)}
                                className="w-full p-3 border rounded-md bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-light transition-colors"
                                placeholder={t('medicalRecords.allergiesPlaceholder')}
                            />
                        ) : (
                            <div className="p-3 bg-gray-50 rounded-md min-h-[80px] border">
                                {allergies ? allergies.split(',').map(tag => (
                                    <span key={tag} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full me-2 mb-2">{tag.trim()}</span>
                                )) : <span className="text-gray-400 italic">{t('dashboard.none')}</span>}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('medicalRecords.chronicConditions')}</label>
                        {!isDoctorView ? (
                            <textarea
                                rows={3}
                                value={conditions}
                                onChange={e => setConditions(e.target.value)}
                                className="w-full p-3 border rounded-md bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-light transition-colors"
                                placeholder={t('medicalRecords.conditionsPlaceholder')}
                            />
                        ) : (
                            <div className="p-3 bg-gray-50 rounded-md min-h-[80px] border">
                                {conditions ? conditions.split(',').map(tag => (
                                    <span key={tag} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full me-2 mb-2">{tag.trim()}</span>
                                )) : <span className="text-gray-400 italic">{t('dashboard.none')}</span>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderHistoryTab = () => (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold text-dark mb-6">{t('medicalRecords.visitHistory')}</h2>
            {pastAppointments.length > 0 ? (
                <div className="space-y-4">
                    {pastAppointments.map(appt => (
                        <div key={appt._id} className="flex flex-col md:flex-row justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-start space-x-4 rtl:space-x-reverse">
                                <div className="p-3 bg-green-100 rounded-full text-green-600 mt-1">
                                    <CalendarCheckIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-bold text-dark">{getTranslatedName(appt.appointmentType.name)}</p>
                                    <p className="text-sm text-gray-600">
                                        {t('appointments.withDoctor', { name: getTranslatedName(appt.doctor.name) })}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {getTranslatedName(appt.hospital.name)}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 md:mt-0 text-start md:text-end flex flex-col justify-center">
                                <p className="font-semibold text-gray-800">{new Date(appt.date).toLocaleDateString()}</p>
                                <p className="text-sm text-gray-500">{appt.time}</p>
                                <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full w-fit md:self-end">
                                    {t('appointments.statusCompleted')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 text-gray-500">
                    <p>{t('medicalRecords.noHistory')}</p>
                </div>
            )}
        </div>
    );

    const renderReportsTab = () => (
        <div className="space-y-6">
            {/* Upload Section */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-lg font-bold text-dark mb-4">{t('medicalRecords.uploadTitle')}</h2>
                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder={t('medicalRecords.reportTitle')}
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="p-2 border rounded-md w-full"
                            required
                        />
                        <input
                            type="text"
                            placeholder={t('medicalRecords.reportDescription')}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="p-2 border rounded-md w-full"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="block w-full text-sm text-slate-500 file:me-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-primary hover:file:text-white transition-all"
                            required
                        />
                        <button
                            type="submit"
                            disabled={isUploading}
                            className="py-2 px-6 bg-primary text-white rounded-md font-medium hover:bg-primary-dark disabled:bg-gray-400 whitespace-nowrap flex items-center"
                        >
                            {isUploading ? t('medicalRecords.uploading') : <><CloudArrowUpIcon className="w-5 h-5 me-2" />{t('medicalRecords.uploadButton')}</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* Reports List */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-dark">
                        {t('medicalRecords.uploadedReports')}
                        <span className="ms-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{filteredReports.length}</span>
                    </h2>

                    {/* Filter for Doctor View */}
                    {isDoctorView && (
                        <div className="relative">
                            <select
                                value={filterSource}
                                onChange={(e) => setFilterSource(e.target.value as any)}
                                className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2 px-4 pe-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                            >
                                <option value="all">All Documents</option>
                                <option value="patient">Uploaded by Patient</option>
                                <option value="doctor">Uploaded by Doctors</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center px-2 text-gray-700">
                                <ChevronDownIcon className="w-4 h-4" />
                            </div>
                        </div>
                    )}
                </div>

                {filteredReports.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredReports.map(report => (
                            <div key={report._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all flex flex-col bg-white group">
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`p-3 rounded-xl shadow-sm ${report.fileType.includes('pdf') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                        <DocumentTextIcon className="w-6 h-6" />
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setViewerFile({ data: report.fileData, type: report.fileType, title: report.title })}
                                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-full transition-colors"
                                            title="Preview"
                                        >
                                            <EyeIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => downloadFile(report.fileData, report.title)}
                                            className="p-1.5 text-gray-400 hover:text-success hover:bg-gray-100 rounded-full transition-colors"
                                            title="Download"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </button>
                                        {(user?._id === report.uploadedBy?._id || user?.role === 'super admin') && (
                                            <button
                                                onClick={() => handleDeleteReport(report._id)}
                                                className="p-1.5 text-gray-400 hover:text-danger hover:bg-gray-100 rounded-full transition-colors"
                                                title="Delete"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <h3 className="font-bold text-dark truncate text-lg" title={report.title}>{report.title}</h3>

                                <div className="mt-2 mb-4 space-y-1">
                                    {report.description && (
                                        <p className="text-sm text-gray-600 line-clamp-2 min-h-[1.25rem]">{report.description}</p>
                                    )}
                                    <div className="flex items-center text-xs text-gray-400 font-medium space-x-2">
                                        <span className="uppercase">{report.fileType.split('/')[1] || 'FILE'}</span>
                                        <span>•</span>
                                        <span>{formatFileSize(report.fileData)}</span>
                                    </div>
                                </div>

                                <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                                    <span className="text-gray-500 font-medium">{new Date(report.uploadedAt).toLocaleDateString()}</span>
                                    <div className="flex items-center">
                                        {/* Identify Uploader: Check if uploadedBy ID matches Patient ID (String Comparison) */}
                                        {/* Also handles cases where uploadedBy is undefined (Legacy = Patient) */}
                                        {(report.uploadedBy?._id?.toString() === (typeof report.patient === 'object' ? report.patient._id : report.patient).toString()) || !report.uploadedBy ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center">
                                                <UserCircleIcon className="w-3 h-3 me-1" /> Patient
                                            </span>
                                        ) : (
                                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center" title={getTranslatedName(report.uploadedBy?.name)}>
                                                <CheckCircleIcon className="w-3 h-3 me-1" /> {report.uploadedBy?.role === 'doctor' ? 'Dr.' : 'Staff'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                        <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">{t('medicalRecords.noReports')}</p>
                        {isDoctorView && filterSource !== 'all' && (
                            <p className="text-sm text-gray-400 mt-1">Try changing the filter.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Secure Viewer Modal */}
            {viewerFile && (
                <SecureFileViewer
                    isOpen={!!viewerFile}
                    onClose={() => setViewerFile(null)}
                    fileData={viewerFile.data}
                    fileType={viewerFile.type}
                    title={viewerFile.title}
                />
            )}
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex border-b border-gray-200 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`py-3 px-6 font-medium text-sm focus:outline-none transition-colors border-b-2 whitespace-nowrap ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    {t('medicalRecords.healthProfile')}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`py-3 px-6 font-medium text-sm focus:outline-none transition-colors border-b-2 whitespace-nowrap ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    {t('medicalRecords.visitHistory')}
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`py-3 px-6 font-medium text-sm focus:outline-none transition-colors border-b-2 whitespace-nowrap ${activeTab === 'reports' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    {t('medicalRecords.uploadedReports')}
                </button>
            </div>

            {isLoading ? (
                <div className="p-12 text-center text-gray-500">{t('common.loading')}</div>
            ) : error ? (
                <div className="bg-red-100 border border-red-200 text-red-700 p-4 rounded-xl">{error}</div>
            ) : (
                <div className="min-h-[400px]">
                    {activeTab === 'profile' && renderProfileTab()}
                    {activeTab === 'history' && renderHistoryTab()}
                    {activeTab === 'reports' && renderReportsTab()}
                </div>
            )}
        </div>
    );
};

export default MedicalRecords;

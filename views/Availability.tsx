import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Availability as AvailabilityType, User } from '../types';
import { users } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { SearchIcon } from '../components/Icons';
// FIX: Import getTranslatedName to handle I18nString type.
import { getTranslatedName } from '../utils/translation';

const defaultSchedule: AvailabilityType[] = [
    { dayOfWeek: 'Sunday', isAvailable: false, startTime: '', endTime: '', announcement: '' },
    { dayOfWeek: 'Monday', isAvailable: false, startTime: '', endTime: '', announcement: '' },
    { dayOfWeek: 'Tuesday', isAvailable: false, startTime: '', endTime: '', announcement: '' },
    { dayOfWeek: 'Wednesday', isAvailable: false, startTime: '', endTime: '', announcement: '' },
    { dayOfWeek: 'Thursday', isAvailable: false, startTime: '', endTime: '', announcement: '' },
    { dayOfWeek: 'Friday', isAvailable: false, startTime: '', endTime: '', announcement: '' },
    { dayOfWeek: 'Saturday', isAvailable: false, startTime: '', endTime: '', announcement: '' },
];

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`${checked ? 'bg-gradient-to-r from-primary to-blue-400 shadow-lg shadow-blue-200' : 'bg-gray-200 shadow-inner'
            } relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
        role="switch"
        aria-checked={checked}
    >
        <span
            aria-hidden="true"
            className={`${checked ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center`}
        >
            {checked ? (
                <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
            ) : (
                <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            )}
        </span>
    </button>
);


const Availability: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [schedule, setSchedule] = useState<AvailabilityType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Admin Management States
    const [doctors, setDoctors] = useState<User[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
    const [selectedDoctorData, setSelectedDoctorData] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const isAdmin = ['hospital manager', 'super admin'].includes(user?.role || '');
    const isHospitalManager = user?.role === 'hospital manager';
    const managerHospitalId = isHospitalManager ? (user?.hospitals?.[0] as any)?._id || user?.hospitals?.[0] : null;
    const canEdit = isAdmin; // Only admins can edit

    // Fetch doctors list for Admin
    useEffect(() => {
        if (isAdmin) {
            const fetchDoctors = async () => {
                try {
                    const data = await users.getDoctors();
                    setDoctors(data);
                    if (data.length > 0) {
                        setSelectedDoctorId(data[0]._id);
                        setSelectedDoctorData(data[0]);
                    }
                } catch (err) {
                    console.error("Failed to fetch doctors");
                }
            };
            fetchDoctors();
        } else if (user?.role === 'doctor') {
            // For doctor, just set ID to themselves so the next effect runs
            setSelectedDoctorId(user._id);
            setSelectedDoctorData(user);
        }
    }, [user, isAdmin]);

    // Fetch schedule when selected doctor changes
    useEffect(() => {
        if (!selectedDoctorId) return;

        const fetchAvailability = async () => {
            setIsLoading(true);
            try {
                // Pass userId param for admin fetch
                const data = await users.getAvailability(selectedDoctorId);

                if (data && data.length === 7) {
                    setSchedule(data);
                } else {
                    // Initialize default schedule assigned to the doctor's first hospital
                    // RBAC: If manager, force to their hospital
                    const hospitalId = isHospitalManager ? managerHospitalId : (selectedDoctorData?.hospitals?.[0]?._id || user?.hospitals?.[0]?._id);
                    const initialSchedule = defaultSchedule.map(day => ({
                        ...day,
                        hospital: hospitalId,
                    }));
                    setSchedule(initialSchedule);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
                setSchedule(defaultSchedule);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAvailability();
    }, [selectedDoctorId, selectedDoctorData, user, isHospitalManager, managerHospitalId]);

    const handleToggle = (dayIndex: number) => {
        if (!canEdit) return;
        
        // RBAC: Prevent toggling if it belongs to another hospital
        const day = schedule[dayIndex];
        const dayHospitalId = (typeof day.hospital === 'object' ? (day.hospital as any)?._id : day.hospital) || '';
        if (isHospitalManager && dayHospitalId && dayHospitalId !== managerHospitalId) return;

        const newSchedule = [...schedule];
        newSchedule[dayIndex].isAvailable = !newSchedule[dayIndex].isAvailable;
        
        // If becoming available and no hospital set, set to manager's hospital
        if (newSchedule[dayIndex].isAvailable && !dayHospitalId && isHospitalManager) {
            newSchedule[dayIndex].hospital = managerHospitalId;
        }

        setSchedule(newSchedule);
    };

    const handleFieldChange = (dayIndex: number, field: keyof AvailabilityType, value: string) => {
        if (!canEdit) return;

        // RBAC: Prevent editing if it belongs to another hospital
        const day = schedule[dayIndex];
        const dayHospitalId = (typeof day.hospital === 'object' ? (day.hospital as any)?._id : day.hospital) || '';
        if (isHospitalManager && dayHospitalId && dayHospitalId !== managerHospitalId) return;

        const newSchedule = [...schedule];
        (newSchedule[dayIndex] as any)[field] = value;
        setSchedule(newSchedule);
    };

    const handleSave = async () => {
        if (!canEdit) return;

        if (!selectedDoctorId) {
            setError(t('availability.error') + " (No doctor selected)");
            return;
        }

        setIsSaving(true);
        setError('');
        setSuccess('');

        // Strict Sanitization:
        // We ensure we send a clean object without _id or __v from Mongoose.
        // We explicitly check the hospital field.
        const sanitizedSchedule = schedule.map(day => {
            let hospitalId = null;

            if (day.hospital) {
                // Check if it's a populated object (from API) or a string ID (from user input)
                if (typeof day.hospital === 'object' && (day.hospital as any)._id) {
                    hospitalId = (day.hospital as any)._id;
                } else if (typeof day.hospital === 'string' && day.hospital.trim() !== '') {
                    hospitalId = day.hospital;
                }
            }

            // RBAC: Force manager's hospital if they are editing an unassigned day
            if (isHospitalManager && !hospitalId && day.isAvailable) {
                hospitalId = managerHospitalId;
            }

            return {
                dayOfWeek: day.dayOfWeek,
                isAvailable: day.isAvailable,
                startTime: day.startTime || '',
                endTime: day.endTime || '',
                announcement: day.announcement || '',
                hospital: hospitalId // Send null if empty/invalid
            };
        });

        try {
            await users.updateAvailability({
                availability: sanitizedSchedule,
                userId: selectedDoctorId
            });
            setSuccess(t('availability.success'));
        } catch (err: any) {
            console.error("Save Error:", err);
            // Display specific error from backend if available
            const msg = err.data?.error || err.message || t('availability.error');
            setError(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDoctorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedDoctorId(id);
        const doc = doctors.find(d => d._id === id) || null;
        setSelectedDoctorData(doc);
    };

    const filteredDoctors = doctors.filter(doc => 
        getTranslatedName(doc.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-dark">{t('availability.title')}</h1>
                    <p className="text-gray-500 mt-1">{isAdmin ? t('availability.adminDescription') : t('availability.description')}</p>
                </div>
                {!canEdit && (
                    <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg text-sm font-semibold border border-amber-200">
                        {t('availability.readOnly')}
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                {/* Admin Doctor Selector */}
                {isAdmin && (
                    <div className="mb-6 border-b pb-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="w-full md:w-1/3">
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('common.search') || 'Search'}</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder={t('admin.searchPlaceholder') || "Search by name..."}
                                        className="w-full p-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary transition-all"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <SearchIcon className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                            <div className="w-full md:w-1/3">
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('availability.selectDoctor')}</label>
                                <select
                                    value={selectedDoctorId}
                                    onChange={handleDoctorChange}
                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                                >
                                    {filteredDoctors.length > 0 ? (
                                        filteredDoctors.map(doc => (
                                            <option key={doc._id} value={doc._id}>{getTranslatedName(doc.name)}</option>
                                        ))
                                    ) : (
                                        <option value="">{t('admin.noResults') || "No doctors found"}</option>
                                    )}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-center mb-4">{error}</div>}
                {success && <div className="p-3 bg-green-100 text-green-700 rounded-md text-center mb-4">{success}</div>}

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="py-3 px-2 text-start text-xs font-medium text-gray-500 uppercase">{t('availability.day')}</th>
                                <th className="py-3 px-2 text-start text-xs font-medium text-gray-500 uppercase">{t('availability.status')}</th>
                                <th className="py-3 px-2 text-start text-xs font-medium text-gray-500 uppercase">{t('admin.hospital')}</th>
                                <th className="py-3 px-2 text-start text-xs font-medium text-gray-500 uppercase">{t('availability.startTime')}</th>
                                <th className="py-3 px-2 text-start text-xs font-medium text-gray-500 uppercase">{t('availability.endTime')}</th>
                                <th className="py-3 px-2 text-start text-xs font-medium text-gray-500 uppercase">Announcement</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-4 text-center">{t('common.loading')}</td></tr>
                            ) : (
                                schedule.map((day, index) => {
                                    const dayHospitalId = (typeof day.hospital === 'object' ? (day.hospital as any)?._id : day.hospital) || '';
                                    
                                    // RBAC: If Hospital Manager, they can only edit days belonging to their hospital
                                    // or days that are currently unassigned.
                                    const isOtherHospital = isHospitalManager && dayHospitalId && dayHospitalId !== managerHospitalId;
                                    const isRowDisabled = !canEdit || isOtherHospital;

                                    return (
                                        <tr key={day.dayOfWeek} className={`border-b last:border-0 ${isOtherHospital ? 'bg-gray-50 opacity-75' : ''}`}>
                                            <td className="py-4 px-2 font-semibold">
                                                {t(`availability.days.${day.dayOfWeek}` as const)}
                                                {isOtherHospital && (
                                                    <span className="block text-[10px] text-amber-600 font-normal uppercase mt-1">
                                                        {t('common.otherHospital') || 'Other Hospital'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-2">
                                                <div className="flex items-center">
                                                    <ToggleSwitch 
                                                        checked={day.isAvailable} 
                                                        onChange={() => handleToggle(index)} 
                                                        disabled={isRowDisabled} 
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-4 px-2">
                                                <select
                                                    value={isHospitalManager ? (managerHospitalId || '') : dayHospitalId}
                                                    onChange={(e) => handleFieldChange(index, 'hospital', e.target.value)}
                                                    disabled={isRowDisabled || !day.isAvailable || isHospitalManager}
                                                    className="p-2 border rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed">
                                                    <option value="">{t('availability.selectHospital')}</option>
                                                    {/* FIX: Use getTranslatedName for I18nString */}
                                                    {selectedDoctorData?.hospitals?.map(h => <option key={h._id} value={h._id}>{getTranslatedName(h.name)}</option>)}
                                                </select>
                                            </td>
                                            <td className="py-4 px-2">
                                                <input
                                                    type="time"
                                                    value={day.startTime}
                                                    onChange={(e) => handleFieldChange(index, 'startTime', e.target.value)}
                                                    disabled={isRowDisabled || !day.isAvailable}
                                                    className="p-2 border rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                />
                                            </td>
                                            <td className="py-4 px-2">
                                                <input
                                                    type="time"
                                                    value={day.endTime}
                                                    onChange={(e) => handleFieldChange(index, 'endTime', e.target.value)}
                                                    disabled={isRowDisabled || !day.isAvailable}
                                                    className="p-2 border rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                />
                                            </td>
                                            <td className="py-4 px-2">
                                                <input
                                                    type="text"
                                                    value={day.announcement}
                                                    onChange={(e) => handleFieldChange(index, 'announcement', e.target.value)}
                                                    disabled={isRowDisabled || !day.isAvailable}
                                                    className="p-2 border rounded-md w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                    placeholder={t('availability.optionalMessage')}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {canEdit && (
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isLoading}
                            className="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400"
                        >
                            {isSaving ? t('availability.saving') : t('availability.saveChanges')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Availability;
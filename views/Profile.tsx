
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { API_BASE_URL } from '../config';
import { Hospital } from '../types';
import { getTranslatedName } from '../utils/translation';
import { EyeIcon, EyeSlashIcon, UserCircleIcon, MailIcon, PhoneIcon, LockIcon, CameraIcon, CheckCircleIcon, AlertTriangleIcon, TrashIcon, CalendarIcon, BellIcon } from '../components/Icons';

const Profile: React.FC = () => {
    const { t } = useTranslation();
    const { user, updateUser, logout } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Profile form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
    });
    const [age, setAge] = useState('');

    // Password change state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Password visibility state
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDisabling, setIsDisabling] = useState(false);
    
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    
    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteVerificationMethod, setDeleteVerificationMethod] = useState<'password' | 'otp'>('password');
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteOtp, setDeleteOtp] = useState('');
    const [isRequestingOtp, setIsRequestingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    
    // Disable Account Modal State
    const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
    const [disableReason, setDisableReason] = useState('');
    
    // Notification Preferences State
    const [notificationPreferences, setNotificationPreferences] = useState({
        push: true,
        email: true,
        sms: false,
        appointment: true,
        reminder: true,
        wallet: true,
        system: true
    });
    const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
    const [preferencesError, setPreferencesError] = useState('');
    const [preferencesSuccess, setPreferencesSuccess] = useState('');
    const [hasFcmToken, setHasFcmToken] = useState(false);
    
    // Doctor Reminder Preferences State
    const [doctorReminderPreferences, setDoctorReminderPreferences] = useState({
        enabled: true,
        reminder24h: true,
        reminder1h: true
    });
    const [isLoadingDoctorReminders, setIsLoadingDoctorReminders] = useState(false);
    const [doctorReminderError, setDoctorReminderError] = useState('');
    const [doctorReminderSuccess, setDoctorReminderSuccess] = useState('');
    
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name.en,
                email: user.email,
                phone: user.phone || '',
            });
            // Calculate age from dateOfBirth if available
            if (user.dateOfBirth) {
                const birthDate = new Date(user.dateOfBirth);
                const today = new Date();
                let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    calculatedAge--;
                }
                setAge(calculatedAge.toString());
            } else {
                setAge('');
            }
        }
    }, [user]);

    // Load notification preferences
    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const response = await apiFetch(`${API_BASE_URL}/notifications/preferences`);
                if (response.preferences) {
                    setNotificationPreferences(response.preferences);
                }
                setHasFcmToken(response.hasFcmToken || false);
            } catch (err) {
                console.error('Failed to load notification preferences:', err);
            }
        };
        if (user) {
            loadPreferences();
        }
    }, [user]);

    // Load doctor reminder preferences
    useEffect(() => {
        const loadDoctorReminders = async () => {
            if (user && user.role === 'doctor') {
                try {
                    const response = await apiFetch(`${API_BASE_URL}/users/profile/doctor-reminders`);
                    if (response.preferences) {
                        setDoctorReminderPreferences(response.preferences);
                    }
                } catch (err) {
                    console.error('Failed to load doctor reminder preferences:', err);
                }
            }
        };
        if (user) {
            loadDoctorReminders();
        }
    }, [user]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData({
            ...passwordData,
            [e.target.name]: e.target.value,
        });
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');
        
        // Calculate dateOfBirth from age
        let dateOfBirth = '';
        if (age) {
            const d = new Date();
            d.setFullYear(d.getFullYear() - parseInt(age));
            dateOfBirth = d.toISOString();
        }

        try {
            const updatedUser = await apiFetch(`${API_BASE_URL}/users/profile`, {
                method: 'PUT',
                body: JSON.stringify({ ...formData, dateOfBirth }),
            });
            updateUser(updatedUser); 
            setSuccess(t('profile.successMessage'));
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || t('profile.errorMessage'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError(t('auth.errorMatch'));
            return;
        }

        setIsPasswordLoading(true);
        try {
            await apiFetch(`${API_BASE_URL}/users/change-password`, {
                method: 'PUT',
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                }),
            });
            setPasswordSuccess(t('profile.passwordUpdated'));
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setPasswordSuccess(''), 3000);
        } catch (err: any) {
            setPasswordError(err.message || 'Failed to change password');
        } finally {
            setIsPasswordLoading(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            setIsUploading(true);
            try {
                const updatedUser = await apiFetch(`${API_BASE_URL}/users/profile/picture`, {
                    method: 'PUT',
                    body: JSON.stringify({ avatar: base64String }),
                });
                updateUser(updatedUser);
            } catch (error) {
                console.error("Failed to upload avatar", error);
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRequestDeleteOtp = async () => {
        setIsRequestingOtp(true);
        try {
            await apiFetch(`${API_BASE_URL}/users/profile/delete/request-otp`, {
                method: 'POST',
            });
            setOtpSent(true);
            alert(t('profile.otpSentMessage') || 'Verification code sent to your email.');
        } catch (err: any) {
            alert(err.message || 'Failed to send verification code.');
        } finally {
            setIsRequestingOtp(false);
        }
    };

    const handleDeleteAccount = async () => {
        // Validate verification input
        if (deleteVerificationMethod === 'password' && !deletePassword) {
            alert(t('profile.passwordRequired') || 'Please enter your password to confirm deletion.');
            return;
        }
        if (deleteVerificationMethod === 'otp' && !deleteOtp) {
            alert(t('profile.otpRequired') || 'Please enter the verification code.');
            return;
        }

        setIsDeleting(true);
        try {
            await apiFetch(`${API_BASE_URL}/users/profile`, {
                method: 'DELETE',
                body: JSON.stringify({
                    password: deleteVerificationMethod === 'password' ? deletePassword : undefined,
                    otp: deleteVerificationMethod === 'otp' ? deleteOtp : undefined,
                }),
            });
            logout(); // Log out and redirect to auth
        } catch (err: any) {
            alert(err.message || 'Failed to delete account.');
            setIsDeleting(false);
        }
    };

    const handleDisableAccount = async () => {
        setIsDisabling(true);
        try {
            await apiFetch(`${API_BASE_URL}/users/profile/disable`, {
                method: 'POST',
                body: JSON.stringify({
                    reason: disableReason || undefined,
                }),
            });
            alert(t('profile.accountDisabled') || 'Your account has been disabled. You will be logged out.');
            logout(); // Log out and redirect to auth
        } catch (err: any) {
            alert(err.message || 'Failed to disable account.');
            setIsDisabling(false);
        }
    };

    const handleUpdatePreferences = async () => {
        setIsLoadingPreferences(true);
        setPreferencesError('');
        setPreferencesSuccess('');
        try {
            await apiFetch(`${API_BASE_URL}/notifications/preferences`, {
                method: 'PUT',
                body: JSON.stringify({ preferences: notificationPreferences }),
            });
            setPreferencesSuccess(t('profile.preferencesUpdated') || 'Notification preferences updated successfully');
            setTimeout(() => setPreferencesSuccess(''), 3000);
        } catch (err: any) {
            setPreferencesError(err.message || 'Failed to update preferences');
        } finally {
            setIsLoadingPreferences(false);
        }
    };

    const handleUpdateDoctorReminders = async () => {
        setIsLoadingDoctorReminders(true);
        setDoctorReminderError('');
        setDoctorReminderSuccess('');
        try {
            await apiFetch(`${API_BASE_URL}/users/profile/doctor-reminders`, {
                method: 'PUT',
                body: JSON.stringify({ preferences: doctorReminderPreferences }),
            });
            setDoctorReminderSuccess(t('profile.doctorRemindersUpdated') || 'Appointment reminder preferences updated successfully');
            setTimeout(() => setDoctorReminderSuccess(''), 3000);
        } catch (err: any) {
            setDoctorReminderError(err.message || 'Failed to update reminder preferences');
        } finally {
            setIsLoadingDoctorReminders(false);
        }
    };

    if (!user) {
        return <div>{t('common.loading')}</div>;
    }
    
    const getHospitalName = (hospitalId?: string | Hospital) => {
        if (!hospitalId) return 'N/A';
        if (typeof hospitalId === 'string') {
             const hospital = user.hospitals?.find(h => h._id === hospitalId);
             return getTranslatedName(hospital?.name) || 'Unknown Hospital';
        }
        return getTranslatedName(hospitalId.name);
    };

    // Reusable Input Component
    const ProfileInput = ({ id, label, icon: Icon, type = "text", value, onChange, required = false, children, extraInfo }: any) => (
        <div className="group">
            <div className="flex justify-between items-center mb-1.5">
                <label htmlFor={id} className="block text-sm font-bold text-gray-600 transition-colors group-focus-within:text-primary">{label}</label>
                {extraInfo && <span className="text-xs text-gray-500 font-medium">{extraInfo}</span>}
            </div>
            <div className="relative">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                    <Icon className="w-5 h-5" />
                </div>
                <input
                    type={type}
                    id={id}
                    name={id}
                    value={value}
                    onChange={onChange}
                    className="block w-full ps-11 p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                    required={required}
                />
                {children}
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto pb-20">
            
            {/* Hero Section with Horizontal Style */}
            <div className="relative mb-20 rounded-3xl shadow-lg overflow-visible bg-white">
                 {/* Banner */}
                <div className="h-48 w-full bg-gradient-to-r from-primary via-blue-600 to-secondary rounded-t-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    <div className="absolute bottom-0 left-10 w-32 h-32 bg-white opacity-10 rounded-full translate-y-1/2 blur-2xl"></div>
                </div>

                {/* Info Bar (below banner) */}
                <div className="pt-16 pb-6 px-8 flex flex-col md:flex-row items-center md:items-start md:justify-between gap-4">
                     {/* Spacer for Avatar */}
                     <div className="md:w-32 hidden md:block"></div>
                     
                     <div className="text-center md:text-start flex-1">
                        <h2 className="text-3xl font-bold text-dark">{getTranslatedName(user.name)}</h2>
                        <p className="text-gray-500">{user.email}</p>
                     </div>

                     <div className="flex gap-3">
                        <span className="px-4 py-2 bg-blue-50 text-primary text-sm font-bold uppercase tracking-wider rounded-full border border-blue-100 shadow-sm">
                            {user.role}
                        </span>
                     </div>
                </div>
                
                {/* Floating Avatar (Absolute positioning relative to container) */}
                <div className="absolute top-32 left-1/2 -translate-x-1/2 md:left-8 md:translate-x-0 flex flex-col items-center">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full border-[6px] border-white shadow-2xl overflow-hidden bg-white">
                            <img 
                                src={user.avatar || `https://ui-avatars.com/api/?name=${user.name.en}&background=E6F0FF&color=006FEE&size=128`} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer border-[6px] border-transparent"
                        >
                            {isUploading ? <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div> : <CameraIcon className="w-8 h-8 text-white" />}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    </div>
                </div>
            </div>

            {/* Horizontal Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Column: Personal Information */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
                    <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-dark">{t('profile.title')}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Basic contact details</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-full text-primary">
                            <UserCircleIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <ProfileInput id="name" label={t('profile.fullNameLabel')} icon={UserCircleIcon} value={formData.name} onChange={handleChange} required />
                            <ProfileInput id="email" type="email" label={t('profile.emailLabel')} icon={MailIcon} value={formData.email} onChange={handleChange} required />
                            <ProfileInput id="phone" type="tel" label={t('profile.phoneLabel')} icon={PhoneIcon} value={formData.phone} onChange={handleChange} required />
                            <ProfileInput 
                                id="age" 
                                type="number" 
                                label={t('profile.ageLabel')} 
                                icon={CalendarIcon} 
                                value={age} 
                                onChange={(e: any) => setAge(e.target.value)} 
                                extraInfo={user.dateOfBirth ? `${t('profile.dateOfBirthLabel')}: ${new Date(user.dateOfBirth).toLocaleDateString()}` : ''}
                            />

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-6">
                                <div className="flex-1 me-4">
                                    {success && <span className="text-green-600 text-xs font-bold flex items-center animate-fade-in"><CheckCircleIcon className="w-4 h-4 me-1"/> {success}</span>}
                                    {error && <span className="text-red-600 text-xs font-bold animate-fade-in">{error}</span>}
                                </div>
                                <button type="submit" disabled={isLoading} className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-70 disabled:shadow-none active:scale-95 text-sm">
                                    {isLoading ? t('common.processing') : t('profile.saveButton')}
                                </button>
                            </div>
                        </form>
                    </div>
                </section>

                {/* Notification Preferences Section */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
                    <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-dark">{t('profile.notificationPreferences') || 'Notification Preferences'}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{t('profile.notificationPreferencesDesc') || 'Manage how you receive notifications'}</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                            <BellIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="space-y-6">
                            {/* Channel Preferences */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-700 mb-3">{t('profile.notificationChannels') || 'Notification Channels'}</h4>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center">
                                            <BellIcon className="w-5 h-5 text-primary me-3" />
                                            <span className="text-sm font-medium">{t('profile.pushNotifications') || 'Push Notifications'}</span>
                                            {!hasFcmToken && <span className="text-xs text-amber-600 ms-2">({t('profile.notRegistered') || 'Not registered'})</span>}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={notificationPreferences.push}
                                            onChange={(e) => setNotificationPreferences({ ...notificationPreferences, push: e.target.checked })}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                            disabled={!hasFcmToken}
                                        />
                                    </label>
                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center">
                                            <MailIcon className="w-5 h-5 text-primary me-3" />
                                            <span className="text-sm font-medium">{t('profile.emailNotifications') || 'Email Notifications'}</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={notificationPreferences.email}
                                            onChange={(e) => setNotificationPreferences({ ...notificationPreferences, email: e.target.checked })}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center">
                                            <PhoneIcon className="w-5 h-5 text-primary me-3" />
                                            <span className="text-sm font-medium">{t('profile.smsNotifications') || 'SMS Notifications'}</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={notificationPreferences.sms}
                                            onChange={(e) => setNotificationPreferences({ ...notificationPreferences, sms: e.target.checked })}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Type Preferences */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-700 mb-3">{t('profile.notificationTypes') || 'Notification Types'}</h4>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <span className="text-sm font-medium">{t('profile.appointmentNotifications') || 'Appointment Notifications'}</span>
                                        <input
                                            type="checkbox"
                                            checked={notificationPreferences.appointment}
                                            onChange={(e) => setNotificationPreferences({ ...notificationPreferences, appointment: e.target.checked })}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <span className="text-sm font-medium">{t('profile.reminderNotifications') || 'Reminder Notifications'}</span>
                                        <input
                                            type="checkbox"
                                            checked={notificationPreferences.reminder}
                                            onChange={(e) => setNotificationPreferences({ ...notificationPreferences, reminder: e.target.checked })}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <span className="text-sm font-medium">{t('profile.walletNotifications') || 'Wallet Notifications'}</span>
                                        <input
                                            type="checkbox"
                                            checked={notificationPreferences.wallet}
                                            onChange={(e) => setNotificationPreferences({ ...notificationPreferences, wallet: e.target.checked })}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <span className="text-sm font-medium">{t('profile.systemNotifications') || 'System Notifications'}</span>
                                        <input
                                            type="checkbox"
                                            checked={notificationPreferences.system}
                                            onChange={(e) => setNotificationPreferences({ ...notificationPreferences, system: e.target.checked })}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-6">
                                <div className="flex-1 me-4">
                                    {preferencesSuccess && <span className="text-green-600 text-xs font-bold flex items-center animate-fade-in"><CheckCircleIcon className="w-4 h-4 me-1"/> {preferencesSuccess}</span>}
                                    {preferencesError && <span className="text-red-600 text-xs font-bold animate-fade-in">{preferencesError}</span>}
                                </div>
                                <button 
                                    onClick={handleUpdatePreferences} 
                                    disabled={isLoadingPreferences} 
                                    className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-70 disabled:shadow-none active:scale-95 text-sm"
                                >
                                    {isLoadingPreferences ? t('common.processing') : t('profile.savePreferences') || 'Save Preferences'}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Right Column: Security / Password */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
                    <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-dark">{t('profile.changePassword')}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Security & Authentication</p>
                        </div>
                        <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                            <LockIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="p-8">
                        <form onSubmit={handleSubmitPassword} className="space-y-6">
                            <ProfileInput 
                                id="currentPassword" 
                                type={showCurrentPassword ? "text" : "password"} 
                                label={t('profile.currentPassword')} 
                                icon={LockIcon} 
                                value={passwordData.currentPassword} 
                                onChange={handlePasswordChange} 
                                required
                            >
                                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 end-0 flex items-center pe-4 text-gray-400 hover:text-primary transition-colors">
                                    {showCurrentPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </ProfileInput>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <ProfileInput 
                                    id="newPassword" 
                                    type={showNewPassword ? "text" : "password"} 
                                    label={t('profile.newPassword')} 
                                    icon={LockIcon} 
                                    value={passwordData.newPassword} 
                                    onChange={handlePasswordChange} 
                                    required
                                >
                                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 end-0 flex items-center pe-4 text-gray-400 hover:text-primary transition-colors">
                                        {showNewPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </ProfileInput>

                                <ProfileInput 
                                    id="confirmPassword" 
                                    type={showConfirmPassword ? "text" : "password"} 
                                    label={t('profile.confirmPassword')} 
                                    icon={LockIcon} 
                                    value={passwordData.confirmPassword} 
                                    onChange={handlePasswordChange} 
                                    required
                                >
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 end-0 flex items-center pe-4 text-gray-400 hover:text-primary transition-colors">
                                        {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </ProfileInput>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-6">
                                <div className="flex-1 me-4">
                                    {passwordSuccess && <span className="text-green-600 text-xs font-bold flex items-center animate-fade-in"><CheckCircleIcon className="w-4 h-4 me-1"/> {passwordSuccess}</span>}
                                    {passwordError && <span className="text-red-600 text-xs font-bold animate-fade-in">{passwordError}</span>}
                                </div>
                                <button type="submit" disabled={isPasswordLoading} className="px-6 py-2.5 bg-secondary hover:bg-secondary-dark text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-70 disabled:shadow-none active:scale-95 text-sm">
                                    {isPasswordLoading ? t('common.processing') : t('profile.changePassword')}
                                </button>
                            </div>
                        </form>
                    </div>
                </section>

                {/* Doctor Appointment Reminders Section (Doctors Only) */}
                {user.role === 'doctor' && (
                    <section className="col-span-1 lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-dark">{t('profile.doctorReminders') || 'Appointment Reminders'}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{t('profile.doctorRemindersDesc') || 'Configure automated reminders for your upcoming appointments'}</p>
                            </div>
                            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                <BellIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="space-y-6">
                                {/* Enable/Disable Reminders */}
                                <div>
                                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                                        <div>
                                            <span className="text-sm font-bold text-gray-800 block">{t('profile.enableReminders') || 'Enable Appointment Reminders'}</span>
                                            <span className="text-xs text-gray-500 mt-1">{t('profile.enableRemindersDesc') || 'Receive automated reminders before your appointments'}</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={doctorReminderPreferences.enabled}
                                            onChange={(e) => setDoctorReminderPreferences({ ...doctorReminderPreferences, enabled: e.target.checked })}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                    </label>
                                </div>

                                {/* Reminder Types */}
                                {doctorReminderPreferences.enabled && (
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-gray-700">{t('profile.reminderTiming') || 'Reminder Timing'}</h4>
                                        
                                        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                                            <div>
                                                <span className="text-sm font-medium text-gray-800 block">{t('profile.reminder24h') || '24 Hours Before'}</span>
                                                <span className="text-xs text-gray-500 mt-1">{t('profile.reminder24hDesc') || 'Receive a reminder 24 hours before each appointment'}</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={doctorReminderPreferences.reminder24h}
                                                onChange={(e) => setDoctorReminderPreferences({ ...doctorReminderPreferences, reminder24h: e.target.checked })}
                                                className="w-5 h-5 text-primary rounded focus:ring-primary"
                                            />
                                        </label>

                                        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                                            <div>
                                                <span className="text-sm font-medium text-gray-800 block">{t('profile.reminder1h') || '1 Hour Before'}</span>
                                                <span className="text-xs text-gray-500 mt-1">{t('profile.reminder1hDesc') || 'Receive a reminder 1 hour before each appointment'}</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={doctorReminderPreferences.reminder1h}
                                                onChange={(e) => setDoctorReminderPreferences({ ...doctorReminderPreferences, reminder1h: e.target.checked })}
                                                className="w-5 h-5 text-primary rounded focus:ring-primary"
                                            />
                                        </label>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-6">
                                    <div className="flex-1 me-4">
                                        {doctorReminderSuccess && <span className="text-green-600 text-xs font-bold flex items-center animate-fade-in"><CheckCircleIcon className="w-4 h-4 me-1"/> {doctorReminderSuccess}</span>}
                                        {doctorReminderError && <span className="text-red-600 text-xs font-bold animate-fade-in">{doctorReminderError}</span>}
                                    </div>
                                    <button 
                                        onClick={handleUpdateDoctorReminders} 
                                        disabled={isLoadingDoctorReminders} 
                                        className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-70 disabled:shadow-none active:scale-95 text-sm"
                                    >
                                        {isLoadingDoctorReminders ? t('common.processing') : t('profile.saveReminderPreferences') || 'Save Reminder Settings'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Availability Section (Doctors Only) - Spans full width at bottom */}
                {user.role === 'doctor' && user.availability && (
                    <section className="col-span-1 lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-dark">{t('availability.title')}</h3>
                                <p className="text-xs text-gray-500">Your working schedule overview</p>
                            </div>
                        </div>
                        <div className="p-0">
                            <ul className="divide-y divide-gray-100">
                                {user.availability.map(day => (
                                    <li key={day.dayOfWeek} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center w-32">
                                            <div className={`w-2 h-2 rounded-full me-3 ${day.isAvailable ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            <span className={`font-bold ${day.isAvailable ? 'text-gray-800' : 'text-gray-400'}`}>{t(`availability.days.${day.dayOfWeek}` as const)}</span>
                                        </div>
                                        
                                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                                            {day.isAvailable ? (
                                                <>
                                                    <span className="text-sm text-dark font-mono bg-blue-50 text-blue-700 px-3 py-1 rounded border border-blue-100">
                                                        {day.startTime} - {day.endTime}
                                                    </span>
                                                    <span className="text-xs text-gray-500 flex items-center">
                                                        at <strong className="ms-1 text-gray-700">{getHospitalName(day.hospital)}</strong>
                                                    </span>
                                                    {day.announcement && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">{day.announcement}</span>}
                                                </>
                                            ) : (
                                                <span className="text-xs font-medium text-gray-400 italic">
                                                    {t('availability.unavailable')}
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>
                )}

                {/* ACCOUNT MANAGEMENT - Disable Account */}
                {user.role !== 'super admin' && !user.isDisabled && (
                    <section className="col-span-1 lg:col-span-2 bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
                        <div className="p-6 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-amber-800">{t('profile.disableAccount') || 'Disable Account'}</h3>
                                <p className="text-xs text-amber-600 mt-0.5">{t('profile.disableAccountDesc') || 'Temporarily deactivate your account without deleting data'}</p>
                            </div>
                            <div className="p-2 bg-amber-200 rounded-full text-amber-700">
                                <LockIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-gray-800">{t('profile.disableAccountTitle') || 'Temporarily Disable Your Account'}</p>
                                <p className="text-xs text-gray-500 mt-1 max-w-md">{t('profile.disableAccountWarning') || 'Your account will be locked and you won\'t be able to access it. All your data will be preserved. You can reactivate it later.'}</p>
                            </div>
                            <button 
                                onClick={() => setIsDisableModalOpen(true)}
                                className="px-5 py-2.5 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border border-amber-200 rounded-lg font-bold text-sm transition-all shadow-sm whitespace-nowrap"
                            >
                                <LockIcon className="w-4 h-4 inline me-2" />
                                {t('profile.disableAccountButton') || 'Disable Account'}
                            </button>
                        </div>
                    </section>
                )}

                {/* DANGER ZONE - Delete Account */}
                {user.role !== 'super admin' && (
                    <section className="col-span-1 lg:col-span-2 bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
                        <div className="p-6 border-b border-red-100 bg-red-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-red-800">{t('profile.dangerZone')}</h3>
                                <p className="text-xs text-red-600 mt-0.5">{t('profile.dangerZoneDesc')}</p>
                            </div>
                            <div className="p-2 bg-red-200 rounded-full text-red-700">
                                <AlertTriangleIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-gray-800">{t('profile.deleteAccount')}</p>
                                <p className="text-xs text-gray-500 mt-1 max-w-md">{t('profile.deleteAccountWarning')}</p>
                            </div>
                            <button 
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg font-bold text-sm transition-all shadow-sm whitespace-nowrap"
                            >
                                <TrashIcon className="w-4 h-4 inline me-2" />
                                {t('profile.deleteAccountButton')}
                            </button>
                        </div>
                    </section>
                )}
            </div>

            {/* DISABLE ACCOUNT MODAL */}
            {isDisableModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in border-t-4 border-amber-500">
                        <div className="flex items-center text-amber-600 mb-4">
                            <LockIcon className="w-8 h-8 me-3" />
                            <h3 className="text-xl font-bold">{t('profile.confirmDisableTitle') || 'Disable Account'}</h3>
                        </div>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                            {t('profile.confirmDisableMessage') || 'Are you sure you want to disable your account? You will not be able to log in or access any features until you reactivate it. All your data will be preserved.'}
                        </p>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('profile.disableReason') || 'Reason (Optional)'}
                            </label>
                            <textarea
                                value={disableReason}
                                onChange={(e) => setDisableReason(e.target.value)}
                                placeholder={t('profile.disableReasonPlaceholder') || 'Optional: Tell us why you are disabling your account...'}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                rows={3}
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button 
                                onClick={() => {
                                    setIsDisableModalOpen(false);
                                    setDisableReason('');
                                }} 
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button 
                                onClick={handleDisableAccount} 
                                disabled={isDisabling}
                                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 shadow-md transition-colors disabled:opacity-50 flex items-center"
                            >
                                {isDisabling ? t('common.processing') : t('profile.confirmDisableButton') || 'Disable Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in border-t-4 border-red-500">
                        <div className="flex items-center text-red-600 mb-4">
                            <AlertTriangleIcon className="w-8 h-8 me-3" />
                            <h3 className="text-xl font-bold">{t('profile.confirmDeleteTitle')}</h3>
                        </div>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                            {t('profile.confirmDeleteMessage')}
                        </p>
                        
                        {/* Verification Method Selection */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('profile.verificationMethod') || 'Verification Method'}
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="verificationMethod"
                                        value="password"
                                        checked={deleteVerificationMethod === 'password'}
                                        onChange={() => {
                                            setDeleteVerificationMethod('password');
                                            setOtpSent(false);
                                        }}
                                        className="me-2"
                                    />
                                    <span className="text-sm">{t('profile.usePassword') || 'Password'}</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="verificationMethod"
                                        value="otp"
                                        checked={deleteVerificationMethod === 'otp'}
                                        onChange={() => {
                                            setDeleteVerificationMethod('otp');
                                            setOtpSent(false);
                                        }}
                                        className="me-2"
                                    />
                                    <span className="text-sm">{t('profile.useOtp') || 'Verification Code'}</span>
                                </label>
                            </div>
                        </div>

                        {/* Password Input */}
                        {deleteVerificationMethod === 'password' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('profile.currentPassword')}
                                </label>
                                <input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    placeholder={t('profile.enterPassword') || 'Enter your password'}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>
                        )}

                        {/* OTP Input */}
                        {deleteVerificationMethod === 'otp' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('profile.verificationCode') || 'Verification Code'}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={deleteOtp}
                                        onChange={(e) => setDeleteOtp(e.target.value)}
                                        placeholder={t('profile.enterOtp') || 'Enter verification code'}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        maxLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRequestDeleteOtp}
                                        disabled={isRequestingOtp || otpSent}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
                                    >
                                        {otpSent ? t('profile.otpSent') || 'Sent' : isRequestingOtp ? t('common.processing') : t('profile.sendOtp') || 'Send Code'}
                                    </button>
                                </div>
                                {otpSent && (
                                    <p className="text-xs text-green-600 mt-1">
                                        {t('profile.otpSentMessage') || 'Verification code sent to your email.'}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <button 
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setDeletePassword('');
                                    setDeleteOtp('');
                                    setOtpSent(false);
                                    setDeleteVerificationMethod('password');
                                }} 
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button 
                                onClick={handleDeleteAccount} 
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-md transition-colors disabled:opacity-50 flex items-center"
                            >
                                {isDeleting ? t('common.processing') : t('profile.confirmDeleteButton')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;

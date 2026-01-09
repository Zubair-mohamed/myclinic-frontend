
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Hospital, Specialty } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { API_BASE_URL } from '../config';
import { SearchIcon, EditIcon, TrashIcon, PlusIcon, WalletIcon, EyeIcon, EyeSlashIcon, BellIcon, CheckCircleIcon, LockIcon } from '../components/Icons';
// FIX: Import getTranslatedName to handle I18nString type.
import { getTranslatedName } from '../utils/translation';

const roleColors: { [key: string]: string } = {
  'patient': 'bg-gray-100 text-gray-800',
  'doctor': 'bg-blue-100 text-blue-800',
  'hospital staff': 'bg-green-100 text-green-800',
  'hospital manager': 'bg-yellow-100 text-yellow-800',
  'super admin': 'bg-purple-100 text-purple-800',
};

// A simple reusable toggle switch component
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onChange}
    className={`${
      checked ? 'bg-gradient-to-r from-primary to-blue-400 shadow-lg shadow-blue-200' : 'bg-gray-200 shadow-inner'
    } relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
    role="switch"
    aria-checked={checked}
  >
    <span
      aria-hidden="true"
      className={`${
        checked ? 'translate-x-5' : 'translate-x-0'
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


// Modal for editing or creating a user
const UserModal: React.FC<{
    user: User | null; // null for creating a new user
    isOpen: boolean;
    onClose: () => void;
    onSave: (userData: any) => Promise<void>;
}> = ({ user, isOpen, onClose, onSave }) => {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [age, setAge] = useState('');
    const [role, setRole] = useState<User['role']>('patient');
    const [assignedHospitals, setAssignedHospitals] = useState<string[]>([]);
    const [assignedSpecialties, setAssignedSpecialties] = useState<string[]>([]);
    
    const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
    const [allSpecialties, setAllSpecialties] = useState<Specialty[]>([]);
    
    const [showPassword, setShowPassword] = useState(false);

    // Fetch data for dropdowns
    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    // 1. Fetch Hospitals (Super Admin Only)
                    if (currentUser?.role === 'super admin') {
                        const hospitalsData = await apiFetch(`${API_BASE_URL}/hospitals`);
                        setAllHospitals(hospitalsData);
                    }

                    // 2. Fetch Specialties (For assigning to doctors)
                    // If hospital manager/staff, backend restricts this to their hospital
                    if (currentUser?.role === 'hospital manager' || currentUser?.role === 'super admin') {
                        const specialtiesData = await apiFetch(`${API_BASE_URL}/specialties`);
                        setAllSpecialties(specialtiesData);
                    }
                } catch (err) {
                    console.error("Failed to fetch form data", err);
                }
            };
            fetchData();
        }
    }, [currentUser?.role, isOpen]);

    useEffect(() => {
        if (user) {
            // FIX: Use user.name.en as the value for the editable name field.
            setName(user.name.en);
            setEmail(user.email);
            setPhone(user.phone || '');
            
            // Calculate age from dateOfBirth
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

            setRole(user.role);
            setAssignedHospitals(user.hospitals?.map(h => h._id) || []);
            setAssignedSpecialties(user.specialties?.map(s => s._id) || []);
            setPassword('');
        } else {
            // Reset for creation form
            setName('');
            setEmail('');
            setPhone('');
            setAge('');
            setPassword('');
            setRole('patient');
            const primaryHospitalId = currentUser?.hospitals?.[0]?._id;
            setAssignedHospitals(primaryHospitalId ? [primaryHospitalId] : []);
            setAssignedSpecialties([]);
        }
        setShowPassword(false);
    }, [user, isOpen, currentUser]);

    const handleHospitalToggle = (hospitalId: string) => {
        setAssignedHospitals(prev => 
            prev.includes(hospitalId) 
                ? prev.filter(id => id !== hospitalId) 
                : [...prev, hospitalId]
        );
    };

    const handleSpecialtyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        // FIX: Explicitly type option as HTMLOptionElement to resolve TS error
        const selectedOptions = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
        setAssignedSpecialties(selectedOptions);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Calculate dateOfBirth from age
        let dateOfBirth = '';
        if (age) {
            const d = new Date();
            d.setFullYear(d.getFullYear() - parseInt(age));
            dateOfBirth = d.toISOString();
        }

        const userData: any = { 
            name,
            email,
            phone,
            dateOfBirth,
            role, 
            hospitals: assignedHospitals,
            specialties: role === 'doctor' ? assignedSpecialties : []
        };
        if (password) {
            userData.password = password;
        }
        onSave(userData);
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-full overflow-y-auto">
                {/* FIX: Use getTranslatedName for I18nString */}
                <h3 className="text-lg font-bold mb-4">{user ? t('admin.editUserRoleTitle', { name: getTranslatedName(user.name) }) : t('admin.createUserTitle')}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('auth.fullNameLabel')}</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('auth.emailLabel')}</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('auth.phoneLabel')}</label>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border rounded-md" placeholder={t('auth.phonePlaceholder')} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('profile.ageLabel')}</label>
                        <input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full p-2 border rounded-md" min="0" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('auth.passwordLabel')}</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="w-full p-2 border rounded-md pe-10" 
                                required={!user} 
                                placeholder={user ? t('admin.passwordOptional') : ''}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('admin.usersTable.role')}</label>
                        <select value={role} onChange={e => setRole(e.target.value as User['role'])} className="w-full p-2 border rounded-md">
                            <option value="patient">{t('admin.roles.patient')}</option>
                            <option value="doctor">{t('admin.roles.doctor')}</option>
                            <option value="hospital staff">{t('admin.roles.hospital staff')}</option>
                            {currentUser?.role === 'super admin' && <option value="hospital manager">{t('admin.roles.hospital manager')}</option>}
                            {currentUser?.role === 'super admin' && <option value="super admin">{t('admin.roles.super admin')}</option>}
                        </select>
                    </div>
                    
                    {/* Hospital Selection (Super Admin Only) */}
                     {currentUser?.role === 'super admin' && role !== 'super admin' && (
                         <div>
                             <label className="block text-sm font-medium text-gray-700">{t('admin.hospital')}</label>
                             <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border p-2 rounded-md">
                                {allHospitals.map(h => (
                                    <label key={h._id} className="flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={assignedHospitals.includes(h._id)} 
                                            onChange={() => handleHospitalToggle(h._id)}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <span className="ms-2 text-sm text-gray-700">{getTranslatedName(h.name)}</span>
                                    </label>
                                ))}
                             </div>
                         </div>
                    )}

                    {/* Specialty Selection (Only for Doctors) */}
                    {role === 'doctor' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('specialties.title')}</label>
                            {allSpecialties.length > 0 ? (
                                <select 
                                    multiple 
                                    value={assignedSpecialties} 
                                    onChange={handleSpecialtyChange}
                                    className="w-full p-2 border rounded-md mt-1 h-32"
                                >
                                    {allSpecialties.map(spec => (
                                        <option key={spec._id} value={spec._id}>
                                            {getTranslatedName(spec.name)}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-xs text-gray-500 italic mt-1">No specialties found. Please create specialties first.</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple.</p>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md">{t('common.cancel')}</button>
                        <button type="submit" className="py-2 px-4 bg-primary text-white rounded-md">{t('admin.save')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminAddFundsModal: React.FC<{
    user: User;
    isOpen: boolean;
    onClose: () => void;
}> = ({ user, isOpen, onClose }) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);
        try {
            await apiFetch(`${API_BASE_URL}/users/${user._id}/add-funds`, {
                method: 'POST',
                body: JSON.stringify({ amount: parseFloat(amount), description }),
            });
            setSuccess(t('admin.addFundsSuccess'));
            setAmount('');
            setDescription('');
            setTimeout(() => onClose(), 1500); // Close after success message
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add funds');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">{t('admin.addFundsTitle', { name: getTranslatedName(user.name) })}</h3>
                {success && <p className="text-green-600 mb-4">{success}</p>}
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">{t('admin.addFundsAmount')}</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border rounded-md" required min="0.01" step="0.01" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">{t('admin.addFundsDescription')}</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-md" required placeholder={t('admin.addFundsDescriptionPlaceholder')} />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md">{t('common.cancel')}</button>
                    <button type="submit" disabled={isLoading} className="py-2 px-4 bg-primary text-white rounded-md disabled:bg-gray-400">
                        {isLoading ? t('common.processing') : t('admin.addFunds')}
                    </button>
                </div>
            </form>
        </div>
    );
};

const BroadcastModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
}> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [messageEn, setMessageEn] = useState('');
    const [messageAr, setMessageAr] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);
        try {
            await apiFetch(`${API_BASE_URL}/notifications/broadcast`, {
                method: 'POST',
                body: JSON.stringify({ 
                    message: {
                        en: messageEn,
                        ar: messageAr
                    }
                }),
            });
            setSuccess(t('admin.broadcastSuccess'));
            setMessageEn('');
            setMessageAr('');
            setTimeout(() => onClose(), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send notification');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <BellIcon className="w-6 h-6 text-primary"/>
                    {t('admin.broadcastTitle')}
                </h3>
                {success && <p className="text-green-600 mb-4 bg-green-50 p-2 rounded flex items-center"><CheckCircleIcon className="w-4 h-4 me-2"/>{success}</p>}
                {error && <p className="text-red-500 mb-4 bg-red-50 p-2 rounded">{error}</p>}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Message (English)</label>
                        <textarea 
                            value={messageEn} 
                            onChange={e => setMessageEn(e.target.value)} 
                            className="w-full p-3 border rounded-lg h-24 resize-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                            required 
                            placeholder="Enter English message..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">الرسالة (بالعربية)</label>
                        <textarea 
                            value={messageAr} 
                            onChange={e => setMessageAr(e.target.value)} 
                            className="w-full p-3 border rounded-lg h-24 resize-none focus:ring-2 focus:ring-primary focus:border-transparent text-right" 
                            dir="rtl"
                            required 
                            placeholder="أدخل الرسالة بالعربية..."
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md">{t('common.cancel')}</button>
                    <button type="submit" disabled={isLoading} className="py-2 px-4 bg-primary text-white rounded-md disabled:bg-gray-400">
                        {isLoading ? t('common.processing') : t('admin.send')}
                    </button>
                </div>
            </form>
        </div>
    );
};


const Admin: React.FC = () => {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // State for modals
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
    const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    
    // Delete verification state
    const [deleteVerificationMethod, setDeleteVerificationMethod] = useState<'password' | 'otp'>('password');
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteOtp, setDeleteOtp] = useState('');
    const [isRequestingOtp, setIsRequestingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    
    // Disable account state
    const [disableReason, setDisableReason] = useState('');
    const [isDisabling, setIsDisabling] = useState(false);
    const [isReactivating, setIsReactivating] = useState(false);
    
    const fetchUsers = async () => {
        try {
            const data = await apiFetch(`${API_BASE_URL}/users`);
            setUsers(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setIsUserModalOpen(true);
    };
    
    const openCreateModal = () => {
        setSelectedUser(null);
        setIsUserModalOpen(true);
    };

    const openDeleteModal = (user: User) => {
        setSelectedUser(user);
        setIsDeleteModalOpen(true);
    };
    
    const openDisableModal = (user: User) => {
        setSelectedUser(user);
        setIsDisableModalOpen(true);
        setDisableReason('');
    };
    
    const openAddFundsModal = (user: User) => {
        setSelectedUser(user);
        setIsAddFundsModalOpen(true);
    };

    const handleSaveUser = async (userData: any) => {
        const url = selectedUser ? `${API_BASE_URL}/users/${selectedUser._id}` : `${API_BASE_URL}/users`;
        const method = selectedUser ? 'PUT' : 'POST';
        try {
            const savedUser = await apiFetch(url, {
                method,
                body: JSON.stringify(userData),
            });
            if (selectedUser) {
                setUsers(users.map(u => u._id === savedUser._id ? savedUser : u));
            } else {
                setUsers([savedUser, ...users]); // Prepend new user
            }
            setIsUserModalOpen(false);
            setSelectedUser(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save user');
        }
    };
    
    const handleRequestDeleteOtp = async () => {
        if (!selectedUser) return;
        setIsRequestingOtp(true);
        try {
            await apiFetch(`${API_BASE_URL}/users/${selectedUser._id}/delete/request-otp`, {
                method: 'POST',
            });
            setOtpSent(true);
            alert(t('admin.otpSentMessage') || 'Verification code sent to user\'s email.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send verification code');
        } finally {
            setIsRequestingOtp(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        
        // Validate verification input
        if (deleteVerificationMethod === 'password' && !deletePassword) {
            alert(t('admin.passwordRequired') || 'Please enter your admin password to confirm deletion.');
            return;
        }
        if (deleteVerificationMethod === 'otp' && !deleteOtp) {
            alert(t('admin.otpRequired') || 'Please enter the verification code.');
            return;
        }

        try {
            await apiFetch(`${API_BASE_URL}/users/${selectedUser._id}`, { 
                method: 'DELETE',
                body: JSON.stringify({
                    password: deleteVerificationMethod === 'password' ? deletePassword : undefined,
                    otp: deleteVerificationMethod === 'otp' ? deleteOtp : undefined,
                }),
            });
            setUsers(users.filter(u => u._id !== selectedUser._id));
            setIsDeleteModalOpen(false);
            setSelectedUser(null);
            setDeletePassword('');
            setDeleteOtp('');
            setOtpSent(false);
            setDeleteVerificationMethod('password');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete user');
        }
    };

    const handleToggleStatus = async (userToToggle: User) => {
        const originalUsers = [...users];
        // Optimistic update
        setUsers(users.map(u => u._id === userToToggle._id ? { ...u, isActive: !u.isActive } : u));
        try {
            const updatedUser = await apiFetch(`${API_BASE_URL}/users/${userToToggle._id}/toggle-status`, { method: 'PUT' });
            // Sync with server response
            setUsers(users.map(u => u._id === updatedUser._id ? updatedUser : u));
        } catch (err) {
            // Revert on error
            setUsers(originalUsers);
            setError(err instanceof Error ? err.message : 'Failed to update user status');
        }
    };

    const handleDisableUser = async () => {
        if (!selectedUser) return;
        setIsDisabling(true);
        try {
            await apiFetch(`${API_BASE_URL}/users/${selectedUser._id}/disable`, {
                method: 'POST',
                body: JSON.stringify({ reason: disableReason || undefined }),
            });
            // Refresh users list
            await fetchUsers();
            setIsDisableModalOpen(false);
            setSelectedUser(null);
            setDisableReason('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to disable user');
        } finally {
            setIsDisabling(false);
        }
    };

    const handleReactivateUser = async (user: User) => {
        setIsReactivating(true);
        try {
            await apiFetch(`${API_BASE_URL}/users/${user._id}/reactivate`, {
                method: 'POST',
            });
            // Refresh users list
            await fetchUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reactivate user');
        } finally {
            setIsReactivating(false);
        }
    };

    const filteredUsers = users.filter(user =>
        // FIX: Use getTranslatedName for I18nString
        getTranslatedName(user.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.phone && user.phone.includes(searchTerm))
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-dark">{t('admin.title')}</h1>
        <p className="text-gray-500 mt-1">{t('admin.description')}</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4">
            <div className="relative flex-grow me-4">
                <SearchIcon className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder={t('admin.searchPlaceholder')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full ps-12 pe-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                />
            </div>
            <div className="flex gap-2">
                {currentUser && ['super admin', 'hospital manager', 'hospital staff'].includes(currentUser.role) && (
                    <button onClick={() => setIsBroadcastModalOpen(true)} className="flex items-center py-3 px-4 border border-primary text-primary rounded-md shadow-sm text-sm font-medium bg-white hover:bg-primary-light transition-colors">
                        <BellIcon className="w-5 h-5 me-2" />
                        {t('admin.broadcastNotification')}
                    </button>
                )}
                {currentUser && ['super admin', 'hospital manager'].includes(currentUser.role) && (
                     <button onClick={openCreateModal} className="flex items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors">
                        <PlusIcon className="w-5 h-5 me-2" />
                        {t('admin.createUser')}
                    </button>
                )}
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.usersTable.name')}</th>
                        <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.usersTable.email')}</th>
                        <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.usersTable.role')}</th>
                        <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.hospital')}</th>
                        <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.usersTable.status')}</th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">{t('admin.usersTable.actions')}</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                        <tr><td colSpan={6} className="p-4 text-center text-gray-500">{t('common.loading')}</td></tr>
                    ) : error ? (
                        <tr><td colSpan={6} className="p-4 text-center text-red-500">{error}</td></tr>
                    ) : filteredUsers.map(user => (
                        <tr key={user._id}>
                            {/* FIX: Use getTranslatedName for I18nString */}
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-900">{getTranslatedName(user.name)}</div>
                                {/* Display specialties for doctors */}
                                {user.role === 'doctor' && user.specialties && user.specialties.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {user.specialties.map((s, idx) => (
                                            <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                                                {getTranslatedName(s.name)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{user.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${roleColors[user.role]}`}>
                                    {t(`admin.roles.${user.role}` as any)}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                                {(user.hospitals && user.hospitals.length > 0) ? user.hospitals.map(h => getTranslatedName(h.name)).join(', ') : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {user.isActive ? t('admin.status.active') : t('admin.status.inactive')}
                                    </span>
                                    {user.isDisabled && (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                                            {t('admin.status.disabled') || 'Disabled'}
                                        </span>
                                    )}
                                    {user.isCurrentlyUnavailable && (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                                            {t('appointments.doctorUnavailable') || 'Doctor Unavailable'}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium space-x-2">
                               {currentUser?.role === 'super admin' && (
                                <ToggleSwitch 
                                    checked={user.isActive}
                                    onChange={() => handleToggleStatus(user)}
                                    disabled={currentUser._id === user._id}
                                />
                               )}
                               {currentUser && ['super admin', 'hospital manager'].includes(currentUser.role) && user.role === 'patient' && (
                                <button onClick={() => openAddFundsModal(user)} className="text-success hover:text-green-700 inline-block align-middle" title={t('admin.addFunds')}><WalletIcon className="w-5 h-5"/></button>
                               )}
                               {currentUser && ['super admin', 'hospital manager'].includes(currentUser.role) ? (
                                <button onClick={() => openEditModal(user)} className="text-primary hover:text-primary-dark inline-block align-middle" title={t('admin.edit')}><EditIcon className="w-5 h-5"/></button>
                               ) : null}
                               {currentUser && ['super admin', 'hospital manager'].includes(currentUser.role) && currentUser._id !== user._id && !user.isDisabled ? (
                                <button onClick={() => openDisableModal(user)} className="text-amber-600 hover:text-amber-700 inline-block align-middle" title={t('admin.disableAccount') || 'Disable Account'}><LockIcon className="w-5 h-5"/></button>
                               ) : null}
                               {currentUser && ['super admin', 'hospital manager'].includes(currentUser.role) && currentUser._id !== user._id && user.isDisabled ? (
                                <button onClick={() => handleReactivateUser(user)} disabled={isReactivating} className="text-green-600 hover:text-green-700 inline-block align-middle disabled:opacity-50" title={t('admin.reactivateAccount') || 'Reactivate Account'}><CheckCircleIcon className="w-5 h-5"/></button>
                               ) : null}
                               {currentUser && ['super admin', 'hospital manager'].includes(currentUser.role) && currentUser._id !== user._id ? (
                                <button onClick={() => openDeleteModal(user)} className="text-danger hover:text-red-700 inline-block align-middle" title={t('admin.delete')}><TrashIcon className="w-5 h-5"/></button>
                               ) : null}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
      
      {/* Edit/Create Modal */}
      <UserModal 
        isOpen={isUserModalOpen}
        user={selectedUser}
        onClose={() => setIsUserModalOpen(false)}
        onSave={handleSaveUser}
      />

      {/* Admin Add Funds Modal */}
      {isAddFundsModalOpen && selectedUser && (
        <AdminAddFundsModal 
            isOpen={isAddFundsModalOpen}
            user={selectedUser}
            onClose={() => setIsAddFundsModalOpen(false)}
        />
      )}
      
      {/* Broadcast Notification Modal */}
      <BroadcastModal 
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
      />

      {/* Disable Account Modal */}
      {isDisableModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border-t-4 border-amber-500">
                <div className="flex items-center text-amber-600 mb-4">
                    <LockIcon className="w-8 h-8 me-3" />
                    <h3 className="text-xl font-bold">{t('admin.confirmDisableTitle') || 'Disable Account'}</h3>
                </div>
                <p className="text-gray-700 mb-4 leading-relaxed">
                    {t('admin.confirmDisableText', { name: getTranslatedName(selectedUser.name) }) || `Are you sure you want to disable ${getTranslatedName(selectedUser.name)}'s account?`}
                </p>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('admin.disableReason') || 'Reason (Optional)'}
                    </label>
                    <textarea
                        value={disableReason}
                        onChange={(e) => setDisableReason(e.target.value)}
                        placeholder={t('admin.disableReasonPlaceholder') || 'Optional: Reason for disabling this account...'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        rows={3}
                    />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button 
                        onClick={() => {
                            setIsDisableModalOpen(false);
                            setDisableReason('');
                            setSelectedUser(null);
                        }} 
                        className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button 
                        onClick={handleDisableUser} 
                        disabled={isDisabling}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 shadow-md transition-colors disabled:opacity-50"
                    >
                        {isDisabling ? t('common.processing') : t('admin.disableAccount') || 'Disable Account'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border-t-4 border-red-500">
                <h3 className="text-xl font-bold mb-2 text-red-600">{t('admin.confirmDeleteTitle')}</h3>
                {/* FIX: Use getTranslatedName for I18nString */}
                <p className="text-gray-700 mb-4">{t('admin.confirmDeleteText', { name: getTranslatedName(selectedUser.name) })}</p>
                
                {/* Verification Method Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('admin.verificationMethod') || 'Verification Method'}
                    </label>
                    <div className="flex gap-4">
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="adminVerificationMethod"
                                value="password"
                                checked={deleteVerificationMethod === 'password'}
                                onChange={() => {
                                    setDeleteVerificationMethod('password');
                                    setOtpSent(false);
                                }}
                                className="me-2"
                            />
                            <span className="text-sm">{t('admin.usePassword') || 'Admin Password'}</span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="adminVerificationMethod"
                                value="otp"
                                checked={deleteVerificationMethod === 'otp'}
                                onChange={() => {
                                    setDeleteVerificationMethod('otp');
                                    setOtpSent(false);
                                }}
                                className="me-2"
                            />
                            <span className="text-sm">{t('admin.useOtp') || 'Verification Code'}</span>
                        </label>
                    </div>
                </div>

                {/* Password Input */}
                {deleteVerificationMethod === 'password' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.adminPassword') || 'Your Admin Password'}
                        </label>
                        <input
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder={t('admin.enterPassword') || 'Enter your admin password'}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                    </div>
                )}

                {/* OTP Input */}
                {deleteVerificationMethod === 'otp' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.verificationCode') || 'Verification Code'}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={deleteOtp}
                                onChange={(e) => setDeleteOtp(e.target.value)}
                                placeholder={t('admin.enterOtp') || 'Enter verification code'}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                maxLength={6}
                            />
                            <button
                                type="button"
                                onClick={handleRequestDeleteOtp}
                                disabled={isRequestingOtp || otpSent}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
                            >
                                {otpSent ? t('admin.otpSent') || 'Sent' : isRequestingOtp ? t('common.processing') : t('admin.sendOtp') || 'Send Code'}
                            </button>
                        </div>
                        {otpSent && (
                            <p className="text-xs text-green-600 mt-1">
                                {t('admin.otpSentMessage') || 'Verification code sent to user\'s email.'}
                            </p>
                        )}
                    </div>
                )}

                <div className="mt-6 flex justify-end space-x-2">
                    <button 
                        onClick={() => {
                            setIsDeleteModalOpen(false);
                            setDeletePassword('');
                            setDeleteOtp('');
                            setOtpSent(false);
                            setDeleteVerificationMethod('password');
                        }} 
                        className="py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button 
                        onClick={handleDeleteUser} 
                        className="py-2 px-4 bg-danger text-white rounded-md hover:bg-red-700 transition-colors shadow-md"
                    >
                        {t('admin.delete')}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Admin;

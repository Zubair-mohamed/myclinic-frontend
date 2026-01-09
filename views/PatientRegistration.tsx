
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { users } from '../utils/api';
import { User } from '../types';
import { UserPlusIcon, CheckCircleIcon, CalendarIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

interface PatientRegistrationProps {
    onSuccessRedirect?: (prefillData: any) => void;
}

const PatientRegistration: React.FC<PatientRegistrationProps> = ({ onSuccessRedirect }) => {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [age, setAge] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successUser, setSuccessUser] = useState<User | null>(null);

    const calculateAge = (dob?: string | null) => {
        if (!dob) return null;
        const birth = new Date(dob);
        const diff = Date.now() - birth.getTime();
        const ageDate = new Date(diff);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessUser(null);

        try {
            const hospitalId = currentUser?.hospitals?.[0]?._id;
            if (!hospitalId) {
                setError('You must be assigned to a hospital to register patients.');
                setIsLoading(false);
                return;
            }

            // Calculate approximate DOB from Age
            let dateOfBirth = '';
            if (age) {
                const d = new Date();
                d.setFullYear(d.getFullYear() - parseInt(age));
                dateOfBirth = d.toISOString();
            }

            const user = await users.registerPatient({
                name,
                phone,
                dateOfBirth,
                hospitalId
                // Email is intentionally omitted to trigger backend auto-generation
            });

            setSuccessUser(user);
            setName('');
            setPhone('');
            setAge('');
        } catch (err: any) {
            setError(err.message || t('registration.error'));
        } finally {
            setIsLoading(false);
        }
    };

    // Redirect to booking page with patient pre-selected
    const handleProceedToBooking = () => {
        if (successUser && onSuccessRedirect) {
            onSuccessRedirect({ patientId: successUser._id });
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-dark">{t('registration.title')}</h1>
                <p className="text-gray-500 mt-1">{t('registration.description')}</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md">
                {successUser ? (
                    <div className="text-center space-y-6 animate-fade-in">
                        <div className="bg-green-100 p-4 rounded-full inline-block">
                            <CheckCircleIcon className="w-12 h-12 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-dark">{t('registration.success')}</h2>
                        <div className="bg-gray-50 p-4 rounded-lg border text-start max-w-sm mx-auto">
                            <p><span className="font-semibold">{t('registration.fullNameLabel')}:</span> {successUser.name.en}</p>
                            <p><span className="font-semibold">{t('registration.phoneLabel')}:</span> {successUser.phone}</p>
                                    <p><span className="font-semibold">{t('profile.ageLabel')}:</span> {calculateAge(successUser.dateOfBirth) ?? 'N/A'}</p>
                            <p><span className="font-semibold">System Email:</span> {successUser.email}</p>
                        </div>
                        <div className="flex justify-center space-x-4 pt-4">
                            <button
                                onClick={() => setSuccessUser(null)}
                                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                            >
                                Register Another
                            </button>
                            <button
                                onClick={handleProceedToBooking}
                                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium flex items-center"
                            >
                                <CalendarIcon className="w-5 h-5 me-2" />
                                {t('registration.saveAndBook')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">{t('registration.fullNameLabel')} <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                required
                                placeholder="e.g. Ahmed Ali"
                            />
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">{t('registration.phoneLabel')} <span className="text-red-500">*</span></label>
                            <input
                                type="tel"
                                id="phone"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                required
                                placeholder="091xxxxxxx"
                            />
                        </div>

                        <div>
                            <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">{t('profile.ageLabel')}</label>
                            <input
                                type="number"
                                id="age"
                                value={age}
                                onChange={e => setAge(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                placeholder="e.g. 30"
                                min="0"
                                max="120"
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-colors flex justify-center items-center disabled:bg-gray-400"
                            >
                                {isLoading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </span>
                                ) : (
                                    <>
                                        <UserPlusIcon className="w-5 h-5 me-2" />
                                        Register Patient
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default PatientRegistration;

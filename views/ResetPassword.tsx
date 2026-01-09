
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auth } from '../utils/api';
import { EyeIcon, EyeSlashIcon } from '../components/Icons';

interface ResetPasswordProps {
    token: string;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ token }) => {
    const { t } = useTranslation();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Password visibility state
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== confirmPassword) {
            return setError(t('resetPassword.errorMatch'));
        }
        if (!token) {
            return setError(t('resetPassword.errorToken'));
        }

        setIsLoading(true);
        try {
            const data = await auth.resetPassword({ token, password });
            
            // On success, backend returns token. Manually set it and reload to log user in.
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.reload();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-info">
            <div className="p-8 max-w-md w-full bg-white rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-center text-dark mb-6">{t('resetPassword.title')}</h2>

                {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-center mb-4">{error}</p>}
                {message && <p className="bg-green-100 text-green-700 p-3 rounded-md text-center mb-4">{message}</p>}

                {!message && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="password">{t('resetPassword.newPasswordLabel')}</label>
                            <div className="relative">
                                <input
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light pe-10"
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="******************"
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
                            <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="confirm-password">{t('resetPassword.confirmPasswordLabel')}</label>
                            <div className="relative">
                                <input
                                    required
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light pe-10"
                                    id="confirm-password"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="******************"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-500 hover:text-gray-700"
                                >
                                    {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <button disabled={isLoading} className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition-colors disabled:bg-gray-400" type="submit">
                            {isLoading ? t('resetPassword.updatingButton') : t('resetPassword.updateButton')}
                        </button>
                    </form>
                )}
                {message && (
                    <div className="text-center">
                        <a href="/" className="w-full inline-block bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition-colors">
                            {t('resetPassword.goToLoginButton')}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;

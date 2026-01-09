import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

interface SignupProps {
    onSwitchToLogin?: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSwitchToLogin }) => {
    const { t, i18n } = useTranslation();
    const { register, verifyRegistration } = useAuth();

    // Form fields state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');

    // UI/flow state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isVerifying) {
            // Verify OTP
            setIsLoading(true);
            setError('');
            try {
                await verifyRegistration(email, otp);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        } else {
            // Register
            setIsLoading(true);
            setError('');
            setMessage('');
            try {
                await register(`${firstName} ${lastName}`, email, '', password); // Phone empty for now
                setIsVerifying(true);
                setMessage('OTP sent to your email');
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const LogoIcon = () => (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 10L30 30M30 10L10 30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );

    return (
        <div className="min-h-screen relative bg-[var(--page-bg)]">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -start-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute -top-32 -end-40 h-[28rem] w-[28rem] rounded-full bg-secondary/15 blur-3xl" />
                <div className="absolute bottom-[-12rem] start-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
            </div>

            <div className="relative min-h-screen grid lg:grid-cols-2">
                {/* Hero panel */}
                <div className="relative overflow-hidden bg-gradient-to-br from-secondary via-secondary/90 to-primary">
                    <div aria-hidden className="absolute inset-0">
                        <div className="absolute -top-10 -end-10 h-56 w-56 rounded-full bg-white/10" />
                        <div className="absolute top-24 -start-16 h-44 w-44 rounded-full bg-white/10" />
                        <div className="absolute bottom-[-14rem] start-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-white/10" />
                    </div>

                    <div className="relative h-full flex flex-col justify-center px-6 sm:px-12 py-12">
                        <div className="flex items-center justify-between gap-3 text-white">
                            <div className="inline-flex items-center gap-3">
                                <span className="text-white/90" aria-hidden>
                                    <LogoIcon />
                                </span>
                                <span className="text-xl sm:text-2xl font-black tracking-wide">
                                    {i18n.language === 'ar' ? 'ماي كلينك' : 'My Clinic'}
                                </span>
                            </div>

                            {onSwitchToLogin && (
                                <button type="button" onClick={onSwitchToLogin} className="text-white/90 font-black hover:underline">
                                    {t('auth.signInLink')}
                                </button>
                            )}
                        </div>

                        <div className="mt-10 grid lg:grid-cols-12 gap-8 items-center">
                            <div className="lg:col-span-7">
                                <div className="flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/15 text-white text-xs font-black">
                                        {t('sidebar.hospitals')}
                                    </span>
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/15 text-white text-xs font-black">
                                        {t('sidebar.appointments')}
                                    </span>
                                </div>

                                <h1 className="mt-4 text-5xl sm:text-6xl font-black text-white leading-tight">{t('auth.welcomeTitle')}</h1>
                                <p className="mt-3 text-white/90 font-black text-xl sm:text-2xl">{t('auth.registerTitle')}</p>
                                <p className="mt-4 text-white/85 font-semibold max-w-xl">{t('auth.registerSubtitle') || t('auth.healthcareSmart')}</p>
                            </div>

                            <div className="hidden lg:block lg:col-span-5">
                                <div className="relative">
                                    <div aria-hidden className="absolute -inset-6 rounded-[2.5rem] bg-white/10 blur-xl" />
                                    <div className="relative rounded-[2.25rem] border border-white/15 bg-white/10 p-6">
                                        <svg aria-hidden className="w-full h-auto" viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg">
                                            <defs>
                                                <linearGradient id="cardGrad2" x1="0" y1="0" x2="1" y2="1">
                                                    <stop offset="0" stopColor="rgba(255,255,255,0.22)" />
                                                    <stop offset="1" stopColor="rgba(255,255,255,0.08)" />
                                                </linearGradient>
                                            </defs>

                                            <rect x="20" y="32" rx="26" ry="26" width="480" height="250" fill="url(#cardGrad2)" stroke="rgba(255,255,255,0.22)" />
                                            <rect x="54" y="70" rx="10" ry="10" width="176" height="18" fill="rgba(255,255,255,0.25)" />
                                            <rect x="54" y="98" rx="10" ry="10" width="230" height="14" fill="rgba(255,255,255,0.18)" />
                                            <rect x="54" y="122" rx="10" ry="10" width="210" height="14" fill="rgba(255,255,255,0.18)" />

                                            <rect x="54" y="162" rx="14" ry="14" width="138" height="38" fill="rgba(255,255,255,0.9)" />
                                            <rect x="72" y="176" rx="6" ry="6" width="56" height="10" fill="rgba(29,53,87,0.55)" />

                                            <rect x="330" y="98" rx="16" ry="16" width="130" height="150" fill="rgba(255,255,255,0.20)" stroke="rgba(255,255,255,0.25)" />
                                            <rect x="352" y="122" rx="8" ry="8" width="86" height="24" fill="rgba(255,255,255,0.30)" />
                                            <rect x="364" y="160" rx="6" ry="6" width="18" height="18" fill="rgba(255,255,255,0.28)" />
                                            <rect x="394" y="160" rx="6" ry="6" width="18" height="18" fill="rgba(255,255,255,0.28)" />
                                            <rect x="364" y="190" rx="6" ry="6" width="18" height="18" fill="rgba(255,255,255,0.28)" />
                                            <rect x="394" y="190" rx="6" ry="6" width="18" height="18" fill="rgba(255,255,255,0.28)" />
                                            <rect x="384" y="218" rx="8" ry="8" width="28" height="30" fill="rgba(255,255,255,0.30)" />
                                            <rect x="392" y="128" width="10" height="22" rx="3" fill="rgba(255,255,255,0.85)" />
                                            <rect x="386" y="134" width="22" height="10" rx="3" fill="rgba(255,255,255,0.85)" />

                                            <rect x="78" y="228" rx="18" ry="18" width="170" height="96" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.22)" />
                                            <rect x="78" y="228" rx="18" ry="18" width="170" height="30" fill="rgba(255,255,255,0.30)" />
                                            <circle cx="114" cy="242" r="6" fill="rgba(255,255,255,0.85)" />
                                            <circle cx="212" cy="242" r="6" fill="rgba(255,255,255,0.85)" />
                                            <rect x="98" y="274" width="26" height="20" rx="6" fill="rgba(255,255,255,0.30)" />
                                            <rect x="134" y="274" width="26" height="20" rx="6" fill="rgba(255,255,255,0.30)" />
                                            <rect x="170" y="274" width="26" height="20" rx="6" fill="rgba(255,255,255,0.30)" />
                                            <rect x="206" y="274" width="26" height="20" rx="6" fill="rgba(255,255,255,0.30)" />
                                            <rect x="98" y="300" width="26" height="20" rx="6" fill="rgba(255,255,255,0.30)" />
                                            <rect x="134" y="300" width="26" height="20" rx="6" fill="rgba(255,255,255,0.30)" />
                                            <rect x="170" y="300" width="26" height="20" rx="6" fill="rgba(255,255,255,0.30)" />
                                            <rect x="206" y="300" width="26" height="20" rx="6" fill="rgba(255,255,255,0.30)" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <svg className="absolute inset-x-0 bottom-0 w-full" height="96" viewBox="0 0 1200 96" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0,44 C160,88 320,88 480,58 C640,28 760,0 900,10 C1040,20 1120,64 1200,70 L1200,96 L0,96 Z" fill="rgba(247,251,255,1)" />
                        </svg>
                    </div>
                </div>

                {/* Form panel */}
                <div className="relative flex items-center justify-center px-4 py-10">
                    <div className="w-full max-w-md">
                        <div className="bg-white/90 backdrop-blur-lg border border-white/70 rounded-[2rem] shadow-soft p-5 sm:p-6">
                            {error && <p className="bg-red-50 text-red-700 border border-red-100 p-3 rounded-xl text-sm mb-4">{error}</p>}
                            {message && <p className="bg-green-50 text-green-700 border border-green-100 p-3 rounded-xl text-sm mb-4">{message}</p>}

                            <form onSubmit={handleSubmit} className="space-y-4 max-h-[68vh] overflow-auto pe-1">
                    {!isVerifying ? (
                        <>
                            {/* First Name and Last Name in one row */}
                            <div className="flex space-x-4">
                                <div className="flex-1">
                                    <label className="block text-gray-700 text-sm font-medium mb-1 text-right">الاسم الأول</label>
                                    <div className="relative">
                                        <input
                                            required
                                            value={firstName}
                                            onChange={e => setFirstName(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl text-right"
                                            type="text"
                                            placeholder="ادخل اسمك الأول"
                                        />
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">+</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-gray-700 text-sm font-medium mb-1 text-right">الاسم الأخير</label>
                                    <div className="relative">
                                        <input
                                            required
                                            value={lastName}
                                            onChange={e => setLastName(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl text-right"
                                            type="text"
                                            placeholder="ادخل اسمك الأخير"
                                        />
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">+</span>
                                    </div>
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1 text-right">البريد الإلكتروني</label>
                                <div className="relative">
                                    <input
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl text-right"
                                        type="email"
                                        placeholder="Username@gmail.com"
                                    />
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">+</span>
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1 text-right">كلمة السر</label>
                                <div className="relative">
                                    <input
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl text-right"
                                        type="password"
                                        placeholder="******************"
                                    />
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">+</span>
                                </div>
                                <p className="text-xs text-gray-400 text-right mt-1">يجب ان تحتوي على الاقل على ستة احرف و حرف كبير و رقم</p>
                            </div>
                        </>
                    ) : (
                        /* OTP Verification */
                        <div>
                            <label className="block text-gray-700 text-sm font-medium mb-1 text-right">رمز التحقق</label>
                            <input
                                required
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl text-center"
                                type="text"
                                placeholder="123456"
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-black py-3 px-4 rounded-2xl shadow-soft transition-all disabled:opacity-60 mt-6"
                        type="submit"
                    >
                        {isLoading ? 'جاري المعالجة...' : isVerifying ? 'إنشاء حساب' : 'إنشاء حساب'}
                    </button>
                </form>

                {/* Footer */}
                            <div className="text-center mt-6">
                                <p className="text-gray-600">
                                    عندك حساب؟{' '}
                                    <button onClick={onSwitchToLogin} className="font-black text-primary hover:underline bg-transparent border-none cursor-pointer">
                                        تسجيل الدخول
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
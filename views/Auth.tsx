
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { auth } from '../utils/api';
import { EyeIcon, EyeSlashIcon } from '../components/Icons';

type AuthMode = 'login' | 'register' | 'forgot';
type ResetStep = 'send' | 'verify' | 'reset';

const Auth: React.FC = () => {
    const { t } = useTranslation();
    const [mode, setMode] = useState<AuthMode>('login');
    const { login, register, verifyRegistration } = useAuth();

    // Form fields state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');

    // UI/flow state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isRegisterVerifying, setIsRegisterVerifying] = useState(false);

    // Password visibility state
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // State for password reset flow
    const [resetStep, setResetStep] = useState<ResetStep>('send');
    const [resetToken, setResetToken] = useState<string | null>(null);

    const handleFormSwitch = (newMode: AuthMode) => {
        setMode(newMode);
        setError('');
        setMessage('');
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setConfirmPassword('');
        setOtp('');
        setIsRegisterVerifying(false);
        setResetStep('send');
        setResetToken(null);
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    const handleSendOtp = async () => {
        setIsLoading(true);
        setError('');
        setMessage('');
        try {
            await auth.sendOtp(email);
            setMessage(t('auth.otpSent'));
            setResetStep('verify');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setIsLoading(true);
        setError('');
        setMessage('');
        try {
            const data = await auth.verifyOtp(email, otp);
            setResetToken(data.token);
            setResetStep('reset');
            setMessage(t('auth.otpVerified'));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }


    const handleResetPassword = async () => {
        if (password !== confirmPassword) {
            setError(t('auth.errorMatch'));
            return;
        }
        setIsLoading(true);
        setError('');
        setMessage('');
        try {
            const data = await auth.resetPassword({ token: resetToken, password });

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === 'login') {
            setIsLoading(true);
            setError('');
            try {
                await login(email, password);
            } catch (err: any) {
                if (err.message && err.message.toLowerCase().includes('disabled')) {
                    setError(t('auth.accountDisabled'));
                } else {
                    setError(err.message);
                }
            } finally {
                setIsLoading(false);
            }
        } else if (mode === 'register') {
            if (!isRegisterVerifying && password !== confirmPassword) {
                setError(t('auth.errorMatch'));
                return;
            }

            if (isRegisterVerifying) { // Step 2: Verify OTP
                setIsLoading(true);
                setError('');
                try {
                    await verifyRegistration(email, otp); // Pass email here
                    // AuthContext will handle state update and redirect
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            } else { // Step 1: Submit details to get OTP
                setIsLoading(true);
                setError('');
                setMessage('');
                try {
                    await register(name, email, phone, password);
                    setIsRegisterVerifying(true);
                    setMessage(t('auth.otpSentRegister'));
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            }
        } else if (mode === 'forgot') {
            if (resetStep === 'send') {
                await handleSendOtp();
            } else if (resetStep === 'verify') {
                await handleVerifyOtp();
            } else if (resetStep === 'reset') {
                await handleResetPassword();
            }
        }
    };

    const getTitle = () => {
        if (mode === 'login') return t('auth.loginTitle');
        if (mode === 'register') {
            return isRegisterVerifying ? t('auth.verifyAccountTitle') : t('auth.registerTitle');
        }
        if (mode === 'forgot') {
            if (resetStep === 'verify') return t('auth.verifyCodeTitle');
            if (resetStep === 'reset') return t('auth.setNewPasswordTitle');
            return t('auth.forgotTitle');
        }
        return 'MyClinic';
    };

    const getSubtitle = () => {
        const loginSubtitle = t('auth.loginSubtitle') || 'سجّل دخولك باستخدام بريدك الإلكتروني وكلمة المرور.';
        const registerSubtitle = t('auth.registerSubtitle') || 'أنشئ حسابك، ثم سنرسل رمز التحقق بعد الضغط على إنشاء حساب.';

        if (mode === 'login') return loginSubtitle;
        if (mode === 'register') {
            if (isRegisterVerifying) return t('auth.otpSubtitleRegister');
            return registerSubtitle;
        }
        if (mode === 'forgot') {
            if (resetStep === 'send') return t('auth.forgotSubtitleEmail');
            if (resetStep === 'verify') return t('auth.forgotSubtitleOtp');
            if (resetStep === 'reset') return t('auth.forgotSubtitleReset');
        }
        return t('auth.welcome');
    };

    const getButtonText = () => {
        if (isLoading) return t('auth.processing');
        if (mode === 'login') return t('auth.signInButton');
        if (mode === 'register') {
            return isRegisterVerifying ? t('auth.verifyAndSignInButton') : t('auth.createAccountButton');
        }
        if (mode === 'forgot') {
            if (resetStep === 'send') return t('auth.sendOtpButton');
            if (resetStep === 'verify') return t('auth.verifyCodeButton');
            return t('auth.resetPasswordButton');
        }
        return 'Submit';
    }

    return (
        <div className="min-h-screen relative bg-[var(--page-bg)]">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -start-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute -top-32 -end-40 h-[28rem] w-[28rem] rounded-full bg-secondary/15 blur-3xl" />
                <div className="absolute bottom-[-12rem] start-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
            </div>

            <div className="relative min-h-screen grid lg:grid-cols-2">
                {/* Hero panel (full height) */}
                <div className="relative overflow-hidden bg-gradient-to-br from-secondary via-secondary/90 to-primary">
                    <div aria-hidden className="absolute inset-0">
                        <div className="absolute -top-10 -end-10 h-56 w-56 rounded-full bg-white/10" />
                        <div className="absolute top-24 -start-16 h-44 w-44 rounded-full bg-white/10" />
                        <div className="absolute bottom-[-14rem] start-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-white/10" />
                    </div>

                    <div className="relative h-full flex flex-col justify-start px-6 sm:px-12 pt-12 pb-12">
                        <div className="absolute bottom-24 left-6 sm:left-12 text-white/90 text-sm font-semibold">
                            {mode === 'login' && (
                                <>
                                    {t('auth.noAccount')}{' '}
                                    <button type="button" onClick={() => handleFormSwitch('register')} className="font-black text-white hover:underline">
                                        {t('auth.signUpLink')}
                                    </button>
                                </>
                            )}
                            {mode === 'register' && !isRegisterVerifying && (
                                <>
                                    {t('auth.haveAccount')}{' '}
                                    <button type="button" onClick={() => handleFormSwitch('login')} className="font-black text-white hover:underline">
                                        {t('auth.signInLink')}
                                    </button>
                                </>
                            )}
                            {mode === 'forgot' && (
                                <>
                                    {t('auth.rememberedPassword')}{' '}
                                    <button type="button" onClick={() => handleFormSwitch('login')} className="font-black text-white hover:underline">
                                        {t('auth.signInLink')}
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="mt-6 grid lg:grid-cols-12 gap-8 items-center">
                            <div className="lg:col-span-7">
                                <h1 className="mt-4 text-5xl sm:text-6xl font-black text-white leading-tight">{t('auth.welcomeTitle')}</h1>
                                <p className="mt-3 text-white/90 font-black text-xl sm:text-2xl">{getTitle()}</p>
                                <p className="mt-4 text-white/85 font-semibold max-w-xl">{getSubtitle()}</p>

                                <div className="mt-8 hidden lg:block max-w-xl">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/10 border border-white/15 rounded-2xl p-4">
                                            <p className="text-white font-black text-sm">{t('sidebar.hospitals')}</p>
                                            <p className="text-white/80 text-sm mt-1">إدارة المستشفيات وخدماتها بسهولة.</p>
                                        </div>
                                        <div className="bg-white/10 border border-white/15 rounded-2xl p-4">
                                            <p className="text-white font-black text-sm">{t('sidebar.appointments')}</p>
                                            <p className="text-white/80 text-sm mt-1">حجز سريع مع متابعة المواعيد.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:block lg:col-span-5">
                                <div className="relative">
                                    <div aria-hidden className="absolute -inset-6 rounded-[2.5rem] bg-white/10 blur-xl" />
                                    <div className="relative rounded-[2.25rem] border border-white/15 bg-white/10 p-6">
                                        <svg aria-hidden className="w-full h-auto" viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg">
                                            <defs>
                                                <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
                                                    <stop offset="0" stopColor="rgba(255,255,255,0.22)" />
                                                    <stop offset="1" stopColor="rgba(255,255,255,0.08)" />
                                                </linearGradient>
                                            </defs>

                                            {/* Desktop card */}
                                            <rect x="20" y="32" rx="26" ry="26" width="480" height="250" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.22)" />
                                            <rect x="54" y="70" rx="10" ry="10" width="176" height="18" fill="rgba(255,255,255,0.25)" />
                                            <rect x="54" y="98" rx="10" ry="10" width="230" height="14" fill="rgba(255,255,255,0.18)" />
                                            <rect x="54" y="122" rx="10" ry="10" width="210" height="14" fill="rgba(255,255,255,0.18)" />

                                            {/* Booking button */}
                                            <rect x="54" y="162" rx="14" ry="14" width="138" height="38" fill="rgba(255,255,255,0.9)" />
                                            <rect x="72" y="176" rx="6" ry="6" width="56" height="10" fill="rgba(29,53,87,0.55)" />

                                            {/* Hospital building */}
                                            <rect x="330" y="98" rx="16" ry="16" width="130" height="150" fill="rgba(255,255,255,0.20)" stroke="rgba(255,255,255,0.25)" />
                                            <rect x="352" y="122" rx="8" ry="8" width="86" height="24" fill="rgba(255,255,255,0.30)" />
                                            <rect x="364" y="160" rx="6" ry="6" width="18" height="18" fill="rgba(255,255,255,0.28)" />
                                            <rect x="394" y="160" rx="6" ry="6" width="18" height="18" fill="rgba(255,255,255,0.28)" />
                                            <rect x="364" y="190" rx="6" ry="6" width="18" height="18" fill="rgba(255,255,255,0.28)" />
                                            <rect x="394" y="190" rx="6" ry="6" width="18" height="18" fill="rgba(255,255,255,0.28)" />
                                            <rect x="384" y="218" rx="8" ry="8" width="28" height="30" fill="rgba(255,255,255,0.30)" />
                                            {/* Medical cross */}
                                            <rect x="392" y="128" width="10" height="22" rx="3" fill="rgba(255,255,255,0.85)" />
                                            <rect x="386" y="134" width="22" height="10" rx="3" fill="rgba(255,255,255,0.85)" />

                                            {/* Calendar */}
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

                {/* Form panel (full height) */}
                <div className="relative flex items-center justify-center px-4 py-10">
                    <div className="w-full max-w-md">
                        <div className="bg-white/90 backdrop-blur-lg border border-white/70 rounded-[2rem] shadow-soft p-5 sm:p-6">
                            <div className="flex items-center justify-between gap-2 bg-gray-100 p-1 rounded-2xl">
                                {['login', 'register', 'forgot'].map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => handleFormSwitch(tab as AuthMode)}
                                        className={`flex-1 py-2.5 px-3 rounded-2xl text-sm font-black transition-all ${mode === tab ? 'bg-white text-secondary shadow-soft' : 'text-gray-500 hover:text-secondary'}`}
                                    >
                                        {tab === 'login' && t('auth.signInButton')}
                                        {tab === 'register' && t('auth.createAccountButton')}
                                        {tab === 'forgot' && t('auth.forgotPasswordLink')}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-5">
                                {error && <p className="bg-red-50 text-red-700 border border-red-100 p-3 rounded-xl text-sm">{error}</p>}
                                {message && <p className="bg-green-50 text-green-700 border border-green-100 p-3 rounded-xl text-sm">{message}</p>}
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4 mt-4 max-h-[68vh] overflow-auto pe-1">
                            {/* LOGIN / REGISTER FORMS */}
                            {mode !== 'forgot' && (
                                <>
                                    {/* REGISTER OTP FORM */}
                                    {mode === 'register' && isRegisterVerifying ? (
                                        <>
                                            <div>
                                                <label className="block text-sm font-bold text-secondary mb-1" htmlFor="email-verify">{t('auth.emailLabel')}</label>
                                                <input readOnly value={email} className="w-full ps-4 pe-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl" id="email-verify" type="email" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-secondary mb-1" htmlFor="otp">{t('auth.otpLabel')}</label>
                                                <input required value={otp} onChange={e => setOtp(e.target.value)} className="w-full ps-4 pe-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl" id="otp" type="text" placeholder="123456" />
                                            </div>
                                        </>
                                    ) : ( // STANDARD LOGIN/REGISTER
                                        <>
                                            {mode === 'register' && (
                                                <div>
                                                    <label className="block text-sm font-bold text-secondary mb-1" htmlFor="name">{t('auth.fullNameLabel')}</label>
                                                    <input required value={name} onChange={e => setName(e.target.value)} className="w-full ps-4 pe-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl" id="name" type="text" placeholder={t('auth.fullNamePlaceholder')} />
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-sm font-bold text-secondary mb-1" htmlFor="email">{t('auth.emailLabel')}</label>
                                                <input required value={email} onChange={e => setEmail(e.target.value)} className="w-full ps-4 pe-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl" id="email" type="email" placeholder={t('auth.emailPlaceholder')} />
                                            </div>
                                            {mode === 'register' && (
                                                <div>
                                                    <label className="block text-sm font-bold text-secondary mb-1" htmlFor="phone">{t('auth.phoneLabel')}</label>
                                                    <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full ps-4 pe-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl" id="phone" type="tel" placeholder={t('auth.phonePlaceholder')} />
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-sm font-bold text-secondary mb-1" htmlFor="password">{t('auth.passwordLabel')}</label>
                                                <div className="relative">
                                                    <input
                                                        required
                                                        value={password}
                                                        onChange={e => setPassword(e.target.value)}
                                                        className="w-full ps-4 pe-12 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl"
                                                        id="password"
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute inset-y-0 end-0 flex items-center pe-4 text-gray-500 hover:text-secondary"
                                                    >
                                                        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            {mode === 'register' && (
                                                <div>
                                                    <label className="block text-sm font-bold text-secondary mb-1" htmlFor="confirm-password-register">{t('auth.confirmPasswordLabel')}</label>
                                                    <div className="relative">
                                                        <input
                                                            required
                                                            value={confirmPassword}
                                                            onChange={e => setConfirmPassword(e.target.value)}
                                                            className="w-full ps-4 pe-12 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl"
                                                            id="confirm-password-register"
                                                            type={showConfirmPassword ? "text" : "password"}
                                                            placeholder="••••••••"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            className="absolute inset-y-0 end-0 flex items-center pe-4 text-gray-500 hover:text-secondary"
                                                        >
                                                            {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}

                            {/* FORGOT PASSWORD FORMS */}
                            {mode === 'forgot' && (
                                <>
                                    {resetStep === 'send' && (
                                        <div>
                                            <label className="block text-sm font-bold text-secondary mb-1" htmlFor="email-forgot">{t('auth.emailLabel')}</label>
                                            <input required value={email} onChange={e => setEmail(e.target.value)} className="w-full ps-4 pe-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl" id="email-forgot" type="email" placeholder={t('auth.emailPlaceholder')} />
                                        </div>
                                    )}
                                    {resetStep === 'verify' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-bold text-secondary mb-1" htmlFor="email-verify-forgot">{t('auth.emailLabel')}</label>
                                                <input readOnly value={email} className="w-full ps-4 pe-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl" id="email-verify-forgot" type="email" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-secondary mb-1" htmlFor="otp">{t('auth.otpLabel')}</label>
                                                <input required value={otp} onChange={e => setOtp(e.target.value)} className="w-full ps-4 pe-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl" id="otp" type="text" placeholder="123456" />
                                            </div>
                                        </>
                                    )}
                                    {resetStep === 'reset' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-bold text-secondary mb-1" htmlFor="password">{t('auth.newPasswordLabel')}</label>
                                                <div className="relative">
                                                    <input
                                                        required
                                                        value={password}
                                                        onChange={e => setPassword(e.target.value)}
                                                        className="w-full ps-4 pe-12 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl"
                                                        id="password"
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute inset-y-0 end-0 flex items-center pe-4 text-gray-500 hover:text-secondary"
                                                    >
                                                        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-secondary mb-1" htmlFor="confirm-password">{t('auth.confirmPasswordLabel')}</label>
                                                <div className="relative">
                                                    <input
                                                        required
                                                        value={confirmPassword}
                                                        onChange={e => setConfirmPassword(e.target.value)}
                                                        className="w-full ps-4 pe-12 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl"
                                                        id="confirm-password"
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute inset-y-0 end-0 flex items-center pe-4 text-gray-500 hover:text-secondary"
                                                    >
                                                        {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {mode === 'login' && (
                                <div className="text-end">
                                    <button type="button" onClick={() => handleFormSwitch('forgot')} className="text-sm font-bold text-primary hover:underline">{t('auth.forgotPasswordLink')}</button>
                                </div>
                            )}

                            <button disabled={isLoading} className="w-full bg-primary hover:bg-primary-dark text-white font-black py-3 px-4 rounded-2xl shadow-soft transition-all disabled:opacity-60" type="submit">
                                {getButtonText()}
                            </button>
                        </form>

                            <div className="text-center text-gray-500 text-sm mt-4">
                                {mode === 'register' && isRegisterVerifying && (
                                    <>
                                        {t('auth.haveAccount')}{' '}
                                        <button onClick={() => handleFormSwitch('login')} className="font-bold text-primary hover:underline">
                                            {t('auth.signInLink')}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;

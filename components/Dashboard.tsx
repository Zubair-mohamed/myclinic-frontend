
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { View, DashboardData } from '../types';
import { CalendarIcon, WalletIcon, PillIcon, AlertTriangleIcon, ClockIcon, UsersIcon, CheckCircleIcon, BellIcon, SearchIcon, ChevronRightIcon, BuildingOfficeIcon } from './Icons';
import { dashboard, users } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getTranslatedName } from '../utils/translation';

const InfoCard: React.FC<{ icon: React.ElementType, title: string, value: string | number, actionText?: string, onClick?: () => void, color: string, isLoading: boolean, footer?: string }> = ({ icon: Icon, title, value, actionText, onClick, color, isLoading, footer }) => (
    <div className="bg-white/90 backdrop-blur-lg border border-white/70 rounded-3xl shadow-soft p-6 flex flex-col justify-between hover:shadow-[0_24px_70px_-20px_rgba(17,24,39,0.35)] transition-shadow duration-300">
        {isLoading ? (
            <div className="animate-pulse">
                <div className="h-12 w-12 rounded-2xl bg-primary/15"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mt-4"></div>
                <div className="h-8 bg-gray-300/80 rounded w-1/2 mt-2"></div>
                {actionText && <div className="h-4 bg-gray-200 rounded w-1/4 mt-4"></div>}
            </div>
        ) : (
            <>
                <div>
                    <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-2xl text-white shadow-soft ${color}`}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-muted font-semibold text-end">{title}</p>
                            <p className="text-2xl font-black text-secondary text-end">{value}</p>
                        </div>
                    </div>
                    {footer && <p className="text-xs text-amber-600 bg-amber-50/70 p-2 rounded-xl mt-3 text-center font-semibold">{footer}</p>}
                </div>
                {actionText && onClick && (
                    <button onClick={onClick} className="mt-4 text-sm font-semibold text-primary hover:underline self-start">
                        {actionText}
                    </button>
                )}
            </>
        )}
    </div>
);

const Dashboard: React.FC<{ setCurrentView: (view: View) => void }> = ({ setCurrentView }) => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
    const [doctorList, setDoctorList] = useState<any[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
    const [unavailableReason, setUnavailableReason] = useState('');

    // Auto-select doctor if search results in exactly one match
    useEffect(() => {
        if (!doctorSearchTerm) return;
        const filtered = doctorList.filter(doc => {
            const search = doctorSearchTerm.toLowerCase();
            return (doc.name?.en || '').toLowerCase().includes(search) || 
                   (doc.name?.ar || '').toLowerCase().includes(search) || 
                   (doc.email || '').toLowerCase().includes(search) || 
                   (doc.phone || '').toLowerCase().includes(search);
        });
        
        if (filtered.length === 1 && selectedDoctorId !== filtered[0]._id) {
            setSelectedDoctorId(filtered[0]._id);
        }
    }, [doctorSearchTerm, doctorList]);

    const [unavailableUntil, setUnavailableUntil] = useState('');
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [quickSearchTerm, setQuickSearchTerm] = useState('');
    const [quickSearchResults, setQuickSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const currencySymbol = i18n.language === 'ar' ? 'د.ل' : 'LYD';

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const result = await dashboard.get();
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    useEffect(() => {
        if (quickSearchTerm.length < 3) {
            setQuickSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await users.getAll(`?search=${quickSearchTerm}`);
                setQuickSearchResults(results.slice(0, 5)); // Show top 5
            } catch (e) {
                console.error("Quick search failed", e);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [quickSearchTerm]);

    const loadDoctors = async () => {
        if (!(user?.role === 'hospital manager' || user?.role === 'hospital staff' || user?.role === 'super admin')) return;
        setIsLoadingDoctors(true);
        try {
            const list = await users.getDoctors();
            setDoctorList(list || []);
        } catch (e) {
            console.error('Failed to fetch doctors', e);
        } finally {
            setIsLoadingDoctors(false);
        }
    };

    useEffect(() => {
        loadDoctors();
    }, [user]);

    // For patients, find today's announcement from the doctor of their upcoming appointment
    const getTodaysAnnouncement = () => {
        // Safety check: Ensure upcomingAppointment and its doctor property exist
        if (!data?.upcomingAppointment || !data.upcomingAppointment.doctor) return null;

        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as any; // e.g., "Monday"

        // Safe access to availability array
        const availability = data.upcomingAppointment.doctor.availability || [];
        const todaysAvailability = availability.find(
            day => day.dayOfWeek === today && day.isAvailable
        );

        return todaysAvailability?.announcement || null;
    }


    const renderPatientDashboard = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <InfoCard
                icon={CalendarIcon}
                title={t('dashboard.upcomingAppointment')}
                value={getTranslatedName(data?.upcomingAppointment?.doctor?.name) || t('dashboard.none')}
                actionText={t('dashboard.viewAppointments')}
                onClick={() => setCurrentView(View.Appointments)}
                color="bg-primary"
                isLoading={isLoading}
                footer={getTodaysAnnouncement() ?? undefined}
            />
            <InfoCard
                icon={BuildingOfficeIcon}
                title={t('sidebar.hospitals')}
                value={t('dashboard.quickAccess')}
                actionText={t('sidebar.hospitals')}
                onClick={() => setCurrentView(View.Hospitals)}
                color="bg-secondary"
                isLoading={isLoading}
            />
            <InfoCard icon={WalletIcon} title={t('dashboard.walletBalance')} value={`${data?.walletBalance?.toFixed(2) ?? '0.00'} ${currencySymbol}`} actionText={t('dashboard.viewWallet')} onClick={() => setCurrentView(View.Wallet)} color="bg-success" isLoading={isLoading} />
            <InfoCard icon={AlertTriangleIcon} title={t('dashboard.emergency')} value={t('dashboard.quickAccess')} actionText={t('dashboard.goToEmergency')} onClick={() => setCurrentView(View.Emergency)} color="bg-danger" isLoading={false} />
        </div>
    );

    const renderDoctorDashboard = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <InfoCard icon={CalendarIcon} title={t('dashboard.doctor.todaysAppointments')} value={data?.todaysAppointments?.toString() || '0'} actionText={t('dashboard.viewSchedule')} onClick={() => setCurrentView(View.Appointments)} color="bg-primary" isLoading={isLoading} />
                <InfoCard icon={UsersIcon} title={t('dashboard.doctor.nextPatient')} value={getTranslatedName(data?.nextPatient?.user?.name) || t('dashboard.none')} actionText={t('dashboard.viewSchedule')} onClick={() => setCurrentView(View.Appointments)} color="bg-secondary" isLoading={isLoading} />
                <InfoCard icon={PillIcon} title={t('dashboard.pharmacy')} value={t('dashboard.doctor.checkStock')} actionText={t('dashboard.doctor.viewPharmacy')} onClick={() => setCurrentView(View.Pharmacy)} color="bg-success" isLoading={isLoading} />
                <InfoCard icon={AlertTriangleIcon} title={t('dashboard.emergency')} value={t('dashboard.quickAccess')} actionText={t('dashboard.goToEmergency')} onClick={() => setCurrentView(View.Emergency)} color="bg-danger" isLoading={false} />
            </div>

            <div className="mt-8 bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-soft border border-white/70">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-secondary">{t('dashboard.doctor.currentQueue') || 'طابور الانتظار الحالي'}</h2>
                    <button 
                        onClick={() => setCurrentView(View.WaitingQueue)}
                        className="text-sm font-bold text-primary hover:underline"
                    >
                        {t('dashboard.viewFullQueue') || 'عرض الطابور بالكامل'}
                    </button>
                </div>
                
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="animate-pulse space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-gray-100 rounded-2xl"></div>
                            ))}
                        </div>
                    ) : data?.currentQueue && data.currentQueue.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.currentQueue.map((item) => (
                                <div key={item._id} className={`p-4 rounded-2xl flex items-center justify-between ${item.status === 'Serving' ? 'bg-primary/10 border-2 border-primary' : 'bg-gray-50 border border-gray-100'}`}>
                                    <div className="flex items-center">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold me-3 ${item.status === 'Serving' ? 'bg-primary text-white' : 'bg-white text-secondary border border-gray-200'}`}>
                                            {item.queueNumber}
                                        </div>
                                        <div>
                                            <p className="font-bold text-dark">{getTranslatedName(item.user?.name) || item.walkInName}</p>
                                            <p className="text-xs text-gray-500">
                                                {item.status === 'Serving' ? (t('queue.statusServing') || 'يتم الكشف الآن') : (t('queue.statusWaiting') || 'في الانتظار')}
                                            </p>
                                        </div>
                                    </div>
                                    {item.status === 'Serving' && (
                                        <span className="flex h-3 w-3 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-300">
                            <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">{t('queue.empty') || 'لا يوجد مرضى في الطابور حالياً'}</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );

    const renderAdminDashboard = () => {
        const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
        const translatedSpecialtyData = data?.appointmentsBySpecialty?.map(item => ({ ...item, name: getTranslatedName(item.name) }));

        const handleOpenNotifications = () => {
            setCurrentView(View.Notifications);
        };

        return (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <InfoCard icon={CalendarIcon} title={t('dashboard.admin.totalAppointments')} value={data?.totalAppointmentsToday?.toString() || '0'} actionText={t('dashboard.viewAppointments')} onClick={() => setCurrentView(View.Appointments)} color="bg-primary" isLoading={isLoading} />
                    <InfoCard icon={UsersIcon} title={t('dashboard.admin.totalPatients')} value={data?.totalPatients?.toString() || '0'} actionText={t('dashboard.admin.manageUsers')} onClick={() => setCurrentView(View.Admin)} color="bg-secondary" isLoading={isLoading} />
                    <InfoCard icon={WalletIcon} title={t('dashboard.admin.todaysRevenue')} value={`${data?.totalRevenueToday?.toFixed(2) ?? '0.00'} ${currencySymbol}`} color="bg-success" isLoading={isLoading} />
                    <InfoCard icon={UsersIcon} title={t('dashboard.queue')} value={t('dashboard.admin.viewQueue')} actionText={t('dashboard.admin.manageQueue')} onClick={() => setCurrentView(View.WaitingQueue)} color="bg-warning" isLoading={isLoading} />
                </div>

                {/* Quick User Search Section */}
                {(user?.role === 'hospital manager' || user?.role === 'hospital staff' || user?.role === 'super admin') && (
                    <div className="mt-6 bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-soft border border-white/70 relative z-20">
                        <h3 className="text-lg font-bold text-dark mb-4 flex items-center">
                            <SearchIcon className="w-5 h-5 me-2 text-primary" />
                            {t('admin.searchPlaceholder') || 'البحث عن مستخدم...'}
                        </h3>
                        <div className="relative">
                            <input
                                type="text"
                                value={quickSearchTerm}
                                onChange={(e) => setQuickSearchTerm(e.target.value)}
                                placeholder={t('admin.searchPlaceholder') || 'البحث بالاسم، البريد أو الهاتف...'}
                                className="w-full border rounded-2xl px-4 py-3 ps-12 focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50/50"
                            />
                            <SearchIcon className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            
                            {isSearching && (
                                <div className="absolute end-4 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                </div>
                            )}

                            {quickSearchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {quickSearchResults.map((u) => (
                                        <div 
                                            key={u._id} 
                                            className="p-4 hover:bg-primary/5 cursor-pointer border-b border-gray-50 last:border-0 flex items-center justify-between group"
                                            onClick={() => {
                                                // For now, just go to Admin view. 
                                                // In a real app, we might open a user detail modal.
                                                setCurrentView(View.Admin);
                                            }}
                                        >
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold me-3 group-hover:bg-primary group-hover:text-white transition-colors">
                                                    {getTranslatedName(u.name).charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-secondary">{getTranslatedName(u.name)}</p>
                                                    <p className="text-xs text-muted">{u.phone || u.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-600 uppercase">
                                                    {u.role}
                                                </span>
                                                <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {quickSearchTerm.length >= 3 && !isSearching && quickSearchResults.length === 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 text-center text-muted text-sm">
                                    {t('common.noResults') || 'لا توجد نتائج'}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(user?.role === 'hospital manager' || user?.role === 'hospital staff' || user?.role === 'super admin') && (
                    <div className="mt-6 bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-soft border border-white/70">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-dark">{t('dashboard.admin.doctorAvailabilityActions') || 'إجراءات توفر الأطباء'}</h3>
                                <p className="text-sm text-gray-500">{t('dashboard.admin.doctorAvailabilityHelp') || 'تعطيل/استعادة توفر الطبيب وإخطار المرضى فوراً.'}</p>
                            </div>
                            {actionMessage && <span className="text-sm text-green-600">{actionMessage}</span>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="md:col-span-2">
                                <div className="flex justify-between items-end mb-1">
                                    <label className="block text-sm text-gray-600">{t('dashboard.admin.selectDoctor') || 'اختر الطبيب'}</label>
                                    {doctorSearchTerm && (
                                        <span className="text-[10px] font-bold text-primary animate-pulse">
                                            {t('common.resultsFound', { count: doctorList.filter(doc => {
                                                const search = doctorSearchTerm.toLowerCase();
                                                return (doc.name?.en || '').toLowerCase().includes(search) || 
                                                       (doc.name?.ar || '').toLowerCase().includes(search);
                                            }).length }) || `${doctorList.filter(doc => {
                                                const search = doctorSearchTerm.toLowerCase();
                                                return (doc.name?.en || '').toLowerCase().includes(search) || 
                                                       (doc.name?.ar || '').toLowerCase().includes(search);
                                            }).length} نتائج`}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={doctorSearchTerm}
                                            onChange={(e) => setDoctorSearchTerm(e.target.value)}
                                            placeholder={t('admin.searchPlaceholder') || "البحث بالاسم..."}
                                            className="w-full border rounded-2xl px-3 py-3 focus:ring-primary focus:border-primary bg-white/80"
                                        />
                                    </div>
                                    <select
                                        value={selectedDoctorId}
                                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                                        className="w-full border rounded-2xl px-3 py-3 focus:ring-primary focus:border-primary bg-white/80 flex-[1.5]"
                                        disabled={isLoadingDoctors}
                                    >
                                        <option value="">{isLoadingDoctors ? t('loading') || 'جاري التحميل...' : t('select') || 'اختر'}</option>
                                        {doctorList.filter(doc => {
                                            const search = doctorSearchTerm.toLowerCase();
                                            const nameEn = (doc.name?.en || '').toLowerCase();
                                            const nameAr = (doc.name?.ar || '').toLowerCase();
                                            const email = (doc.email || '').toLowerCase();
                                            const phone = (doc.phone || '').toLowerCase();
                                            
                                            return nameEn.includes(search) || 
                                                   nameAr.includes(search) || 
                                                   email.includes(search) || 
                                                   phone.includes(search);
                                        }).map((doc: any) => {
                                            let statusSuffix = '';
                                            if (doc.isDisabled) statusSuffix = ` (${t('inactive') || 'معطل'})`;
                                            else if (doc.isCurrentlyUnavailable) statusSuffix = ` (${t('availability.unavailable') || 'غير متاح'})`;
                                            
                                            return (
                                                <option key={doc._id} value={doc._id}>
                                                    {getTranslatedName(doc.name)} {statusSuffix}
                                                </option>
                                            );
                                        })}
                                        {doctorList.length > 0 && doctorSearchTerm && doctorList.filter(doc => {
                                            const search = doctorSearchTerm.toLowerCase();
                                            return (doc.name?.en || '').toLowerCase().includes(search) || 
                                                   (doc.name?.ar || '').toLowerCase().includes(search) || 
                                                   (doc.email || '').toLowerCase().includes(search) || 
                                                   (doc.phone || '').toLowerCase().includes(search);
                                        }).length === 0 && (
                                            <option disabled>لم يتم العثور على نتائج</option>
                                        )}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">{t('dashboard.admin.unavailableUntil') || 'حتى تاريخ'}</label>
                                <input
                                    type="date"
                                    value={unavailableUntil}
                                    onChange={(e) => setUnavailableUntil(e.target.value)}
                                    className="w-full border rounded-2xl px-3 py-3 focus:ring-primary focus:border-primary bg-white/80"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">{t('dashboard.admin.reason') || 'السبب (اختياري)'}</label>
                                <input
                                    type="text"
                                    value={unavailableReason}
                                    onChange={(e) => setUnavailableReason(e.target.value)}
                                    className="w-full border rounded-2xl px-3 py-3 focus:ring-primary focus:border-primary bg-white/80"
                                    placeholder={t('dashboard.admin.reasonPlaceholder') || 'مثال: إجازة أو طارئ'}
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-4">
                            <button
                                onClick={async () => {
                                    if (!selectedDoctorId) return;
                                    if (!unavailableUntil) {
                                        setActionMessage(t('availability.dateRequired') || 'يرجى اختيار تاريخ');
                                        return;
                                    }
                                    setActionMessage(null);
                                    try {
                                        await users.markUnavailable(selectedDoctorId, {
                                            reason: unavailableReason || undefined,
                                            unavailableUntil: unavailableUntil || undefined,
                                        });
                                        setActionMessage(t('dashboard.admin.markedUnavailable') || 'تم وضع الطبيب كغير متاح');
                                        setUnavailableReason('');
                                        loadDoctors(); // Refresh list to show updated status
                                    } catch (e: any) {
                                        setActionMessage(e?.message || t('error') || 'خطأ');
                                    }
                                }}
                                className="px-4 py-3 bg-warning text-white rounded-2xl shadow-soft hover:brightness-95 disabled:opacity-50 transition-all"
                                disabled={!selectedDoctorId || !unavailableUntil}
                            >
                                {t('dashboard.admin.markUnavailable') || 'تعطيل مؤقت'}
                            </button>
                            <button
                                onClick={async () => {
                                    if (!selectedDoctorId) return;
                                    setActionMessage(null);
                                    try {
                                        await users.restoreAvailability(selectedDoctorId);
                                        setActionMessage(t('dashboard.admin.restoredAvailability') || 'تمت استعادة التوفر');
                                        loadDoctors(); // Refresh list to show updated status
                                    } catch (e: any) {
                                        setActionMessage(e?.message || t('error') || 'خطأ');
                                    }
                                }}
                                className="px-4 py-3 bg-success text-white rounded-2xl shadow-soft hover:brightness-95 disabled:opacity-50 transition-all"
                                disabled={!selectedDoctorId}
                            >
                                {t('dashboard.admin.restoreAvailability') || 'استعادة التوفر'}
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedDoctorId('');
                                    setDoctorSearchTerm('');
                                    setUnavailableUntil('');
                                    setUnavailableReason('');
                                    setActionMessage(null);
                                }}
                                className="px-3 py-2 text-sm text-secondary hover:text-secondary/70 font-semibold"
                            >
                                {t('clear') || 'مسح'}
                            </button>
                        </div>
                    </div>
                )}

                {(user?.role === 'hospital manager' || user?.role === 'hospital staff' || user?.role === 'super admin') && (
                    <div className="mt-6 bg-gradient-to-r from-secondary to-primary text-white p-6 rounded-3xl shadow-soft flex items-center justify-between overflow-hidden relative">
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#7CE7DA,transparent_25%),radial-gradient(circle_at_80%_0%,#2B4A78,transparent_30%)]"></div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-black">{t('notifications.gotoTitle') || 'الانتقال إلى الإشعارات'}</h3>
                            <p className="text-sm text-white/80 mt-1">{t('notifications.gotoHelp') || 'عرض وإدارة إشعارات المستشفى'}</p>
                        </div>
                        <button
                            onClick={handleOpenNotifications}
                            className="relative z-10 flex items-center justify-center px-4 py-2 bg-white text-secondary rounded-2xl font-semibold shadow-soft hover:brightness-95 transition-all"
                            aria-label={t('notifications.gotoTitle') || 'الانتقال إلى الإشعارات'}
                        >
                            {t('dashboard.admin.openNotifications') || 'عرض الإشعارات'}
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                    <div className="lg:col-span-2 bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-soft border border-white/70">
                        <h2 className="text-xl font-black text-secondary mb-6">{t('dashboard.admin.revenueLast7Days')}</h2>
                        {isLoading ? (
                            <div className="animate-pulse h-64 bg-gray-100 rounded-2xl"></div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={data?.revenueOverLast7Days} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                                    <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
                                    <Tooltip formatter={(value: number) => `${value.toFixed(2)} ${currencySymbol}`} contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 16px 40px -20px rgba(0,0,0,0.3)' }} />
                                    <Line type="monotone" dataKey="revenue" name={t('dashboard.admin.revenue')} stroke="#14B8A6" strokeWidth={3} dot={{ r: 5, fill: '#14B8A6', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="lg:col-span-1 bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-soft border border-white/70">
                        <h2 className="text-xl font-black text-secondary mb-6">{t('dashboard.admin.appointmentStatusToday')}</h2>
                        {isLoading ? (
                            <div className="animate-pulse h-64 bg-gray-100 rounded-2xl"></div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={data?.appointmentsByStatus}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {data?.appointmentsByStatus?.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 16px 40px -20px rgba(0,0,0,0.3)' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-8">
                    <div className="lg:col-span-3 bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-soft border border-white/70">
                        <h2 className="text-xl font-black text-secondary mb-6">{t('dashboard.admin.specialtyBreakdown')}</h2>
                        {isLoading ? (
                            <div className="animate-pulse h-64 bg-gray-100 rounded-2xl"></div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={translatedSpecialtyData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                    <XAxis type="number" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12, fill: '#1D3557', fontWeight: 700 }} />
                                    <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 16px 40px -20px rgba(0,0,0,0.3)' }} />
                                    <Bar dataKey="count" fill="#14B8A6" name={t('dashboard.admin.appointments')} radius={[0, 10, 10, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="lg:col-span-2 bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-soft border border-white/70">
                        <h2 className="text-xl font-black text-secondary mb-6">{t('dashboard.admin.recentBookings')}</h2>
                        <div className="space-y-3">
                            {isLoading ? (
                                Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="animate-pulse flex items-center space-x-3">
                                        <div className="h-10 w-10 rounded-2xl bg-primary/15"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                ))
                            ) : data?.latestAppointments && data.latestAppointments.length > 0 ? (
                                data.latestAppointments.map(appt => (
                                    <div key={appt._id} className="flex items-center p-3 rounded-2xl hover:bg-primary/5 transition-colors">
                                        <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center text-primary font-bold me-3">
                                            {appt.user?.name?.en?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-secondary">{getTranslatedName(appt.user?.name)}</p>
                                            <p className="text-xs text-muted">{t('dashboard.admin.bookedWith', { doctorName: getTranslatedName(appt.doctor?.name) })}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted text-sm">{t('dashboard.admin.noRecentBookings')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const renderDashboardByRole = () => {
        switch (user?.role) {
            case 'doctor':
                return renderDoctorDashboard();
            case 'hospital staff':
            case 'hospital manager':
            case 'super admin':
                return renderAdminDashboard();
            case 'patient':
            default:
                return renderPatientDashboard();
        }
    }


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-secondary">{t('dashboard.welcome', { name: user ? getTranslatedName(user.name) : t('common.user') })}</h1>
                <p className="text-muted mt-1 font-semibold">{t('dashboard.healthSummary')}</p>
            </div>

            {error && <div className="bg-red-100 border-s-4 border-red-500 text-red-700 p-4" role="alert"><p>{error}</p></div>}

            {renderDashboardByRole()}

            {user?.role === 'patient' && (
                <div className="mt-8 bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-soft border border-white/70">
                    <h2 className="text-xl font-black text-secondary mb-4">{t('dashboard.currentAppointments')}</h2>
                    <div className="space-y-3">
                        {isLoading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="flex items-center p-3 bg-gray-50 rounded-lg animate-pulse">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full me-3"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))
                        ) : data?.upcomingAppointmentsList && data.upcomingAppointmentsList.length > 0 ? (
                            data.upcomingAppointmentsList.map(appt => (
                                <div
                                    key={appt._id}
                                    onClick={() => setCurrentView(View.Appointments)}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center">
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(getTranslatedName(appt.doctor?.name))}&background=E6F0FF&color=006FEE`}
                                            alt={getTranslatedName(appt.doctor?.name)}
                                            className="w-10 h-10 rounded-full me-3"
                                        />
                                        <div>
                                            <p className="font-semibold text-sm text-dark">{getTranslatedName(appt.doctor?.name)}</p>
                                            <p className="text-xs text-gray-500">
                                                {getTranslatedName(appt.hospital?.name)} - {new Date(appt.date).toLocaleDateString()} {appt.time}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{t('appointments.statusUpcoming')}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8">{t('appointments.noAppointments')}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;

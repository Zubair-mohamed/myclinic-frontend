import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { notifications, users } from '../utils/api';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';

interface RecipientOption {
    _id: string;
    name: string;
}

const Notifications: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();

    // Helper: provide Arabic fallback if key missing
    const tr = (key: string, fallback: string) => {
        const v = t(key);
        return v === key ? fallback : v;
    };

    const [patients, setPatients] = useState<RecipientOption[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [titleEn, setTitleEn] = useState('');
    const [titleAr, setTitleAr] = useState('');
    const [messageEn, setMessageEn] = useState('');
    const [messageAr, setMessageAr] = useState('');
    const [type, setType] = useState<'normal' | 'emergency'>('normal');
    const [search, setSearch] = useState('');
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const canManage = useMemo(() => {
        return user && ['super admin', 'hospital manager', 'hospital staff'].includes(user.role);
    }, [user]);

    useEffect(() => {
        if (!canManage) {
            setLoading(false);
            return;
        }
        const fetchPatients = async () => {
            try {
                const data = await users.getAll();
                const filtered = (data || []).filter((u: User) => u.role === 'patient');
                setPatients(filtered.map((p: User) => ({ _id: p._id, name: p.name?.[i18n.language as 'ar' | 'en'] || p.name?.en || p.email })));
            } catch (err: any) {
                setError(err?.message || 'Failed to load patients');
            } finally {
                setLoading(false);
            }
        };
        fetchPatients();
    }, [canManage, i18n.language]);

    const filteredPatients = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return patients;
        return patients.filter(p => p.name.toLowerCase().includes(term));
    }, [patients, search]);

    const handleSend = async () => {
        setStatus(null);
        setError(null);

        if (!messageEn.trim() && !messageAr.trim()) {
            setError(tr('notifications.messageRequired', 'النص مطلوب')); 
            return;
        }

        // If no recipients selected, treat as broadcast to all patients of allowed hospital scope
        const userIds = selectedIds;
        const priority = type === 'emergency' ? 'high' : 'normal';
        const notifType = type === 'emergency' ? 'system' : 'system';

        setSending(true);
        try {
            const payload = {
                title: {
                    en: titleEn || (type === 'emergency' ? 'Emergency Alert' : 'Notification'),
                    ar: titleAr || (type === 'emergency' ? 'تنبيه طارئ' : 'إشعار جديد')
                },
                message: {
                    en: messageEn || messageAr,
                    ar: messageAr || messageEn
                },
                type: notifType,
                priority,
                language: i18n.language || 'ar'
            };

            if (userIds.length === 0) {
                await notifications.broadcast(payload);
            } else {
                await notifications.targeted({
                    ...payload,
                    userIds
                });
            }

            setStatus(tr('notifications.sent', 'تم الإرسال بنجاح'));
            setTitleEn('');
            setTitleAr('');
            setMessageEn('');
            setMessageAr('');
            setSelectedIds([]);
        } catch (err: any) {
            const msg = err?.data?.error || err?.message || 'Failed to send notification';
            setError(msg);
        } finally {
            setSending(false);
        }
    };

    if (!canManage) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-md">
                <p className="text-red-600 font-semibold">{tr('notifications.permissionDenied', 'لا تملك صلاحية للوصول إلى الإشعارات')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="p-6 bg-gradient-to-l from-blue-50 to-white rounded-2xl border border-blue-100 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white text-lg">🔔</span>
                    <div>
                        <h1 className="text-2xl font-bold text-dark">{tr('notifications.manageTitle', 'إدارة الإشعارات')}</h1>
                        <p className="text-gray-600 text-sm">{tr('notifications.manageSubtitle', 'إنشاء وإرسال إشعارات فورية أو طارئة للمرضى مع دعم الإرسال الفوري.')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">{tr('notifications.realtimeInfo', 'يتم مزامنة الإشعارات فورياً مع التطبيق المحمول (داخل التطبيق + Push)')}</span>
                    <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">{tr('notifications.permissionRequired', 'مقيد بالأذونات')}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-md border border-gray-100 space-y-5">
                    {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg border border-red-100">{error}</div>}
                    {status && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg border border-green-100">{status}</div>}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('notifications.type', 'النوع')}</label>
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                                <button
                                    onClick={() => setType('normal')}
                                    className={`flex-1 px-3 py-2 text-sm font-semibold ${type === 'normal' ? 'bg-primary text-white' : 'bg-white text-gray-700'}`}
                                >
                                    {tr('notifications.typeNormal', 'عادي')}
                                </button>
                                <button
                                    onClick={() => setType('emergency')}
                                    className={`flex-1 px-3 py-2 text-sm font-semibold ${type === 'emergency' ? 'bg-red-600 text-white' : 'bg-white text-gray-700'}`}
                                >
                                    {tr('notifications.typeEmergency', 'طارئ')}
                                </button>
                            </div>
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Title (English)</label>
                                <input
                                    type="text"
                                    value={titleEn}
                                    onChange={(e) => setTitleEn(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="English Title"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 text-right">العنوان (بالعربية)</label>
                                <input
                                    type="text"
                                    value={titleAr}
                                    onChange={(e) => setTitleAr(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-right"
                                    dir="rtl"
                                    placeholder="العنوان بالعربية"
                                />
                            </div>
                        </div>
                    </div>

                        <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700">{tr('notifications.recipients', 'المستلمون')}</label>
                                <p className="text-xs text-gray-500">{tr('notifications.recipientsHint', 'اختر مريضاً أو أكثر، أو اتركه فارغاً للإرسال للجميع ضمن نطاق صلاحياتك.')}</p>
                            </div>
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">{selectedIds.length} / {patients.length || 0}</span>
                        </div>

                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder={tr('notifications.searchPlaceholder', 'بحث عن مريض بالاسم')}
                        />

                        <div className="flex gap-2 flex-wrap">
                            {selectedIds.map(id => {
                                const p = patients.find(x => x._id === id);
                                if (!p) return null;
                                return (
                                    <span key={id} className="flex items-center gap-2 px-3 py-1 bg-primary text-white rounded-full text-xs">
                                        {p.name}
                                        <button onClick={() => setSelectedIds(selectedIds.filter(x => x !== id))} className="text-white/80 hover:text-white">×</button>
                                    </span>
                                );
                            })}
                        </div>

                        <div className="border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto bg-gray-50">
                            {loading ? (
                                <p className="text-sm text-gray-500">{tr('common.loading', 'جاري التحميل...')}</p>
                            ) : filteredPatients.length === 0 ? (
                                <p className="text-sm text-gray-500">{tr('notifications.noPatients', 'لا يوجد مرضى')}</p>
                            ) : (
                                filteredPatients.map(p => (
                                    <label key={p._id} className="flex items-center gap-3 py-1 cursor-pointer hover:bg-white rounded-md px-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(p._id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedIds([...selectedIds, p._id]);
                                                } else {
                                                    setSelectedIds(selectedIds.filter(id => id !== p._id));
                                                }
                                            }}
                                        />
                                        <span className="text-sm text-gray-800">{p.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Message (English)</label>
                            <textarea
                                value={messageEn}
                                onChange={(e) => setMessageEn(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-3 h-36 focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Enter English message here..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1 text-right">نص الإشعار (بالعربية)</label>
                            <textarea
                                value={messageAr}
                                onChange={(e) => setMessageAr(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-3 h-36 focus:outline-none focus:ring-2 focus:ring-primary text-right"
                                dir="rtl"
                                placeholder="اكتب نص الإشعار بالعربية هنا..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSend}
                            disabled={sending}
                            className={`px-5 py-2 rounded-lg text-white font-semibold shadow ${type === 'emergency' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-dark'} disabled:opacity-50`}
                        >
                            {sending ? (tr('common.sending', 'جاري الإرسال...')) : (tr('notifications.sendNow', 'إرسال الآن'))}
                        </button>
                        <p className="text-xs text-gray-500">{tr('notifications.realtimeInfo', 'يتم مزامنة الإشعارات فورياً مع التطبيق والمحمول.')}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-dark">{tr('notifications.preview', 'معاينة الإشعار')}</h3>
                        <span className={`px-3 py-1 text-xs rounded-full ${type === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {type === 'emergency' ? (tr('notifications.typeEmergency', 'طارئ')) : (tr('notifications.typeNormal', 'عادي'))}
                        </span>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                        <p className="text-sm text-gray-500 mb-1">{new Date().toLocaleString(i18n.language)}</p>
                        <h4 className="text-base font-bold text-dark">
                            {i18n.language === 'ar' 
                                ? (titleAr || (type === 'emergency' ? 'تنبيه طارئ' : 'إشعار جديد'))
                                : (titleEn || (type === 'emergency' ? 'Emergency Alert' : 'New Notification'))
                            }
                        </h4>
                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                            {i18n.language === 'ar'
                                ? (messageAr || 'سيظهر نص الإشعار هنا...')
                                : (messageEn || 'Notification message will appear here...')
                            }
                        </p>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                        <p>• {tr('notifications.pushInfo', 'يتم إرسال Push + داخل التطبيق فور الإرسال.')}</p>
                        <p>• {tr('notifications.scopeInfo', 'النطاق يتبع أذوناتك والمستشفى المرتبط بك.')}</p>
                        <p>• {tr('notifications.errorInfo', 'في حال فشل الشبكة ستظهر رسالة خطأ فورية.')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Notifications;

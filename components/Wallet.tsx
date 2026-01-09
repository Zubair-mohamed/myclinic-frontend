import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Appointment, Transaction, Wallet as WalletType } from '../types';
import { PlusIcon } from './Icons';
import { appointments, wallet as walletService } from '../utils/api';
import { getTranslatedName } from '../utils/translation';


const AddFundsModal: React.FC<{ onClose: () => void; onFundsAdded: () => void; }> = ({ onClose, onFundsAdded }) => {
    const { t, i18n } = useTranslation();
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const presetAmounts = [50, 100, 200];
    const currencySymbol = i18n.language === 'ar' ? 'د.ل' : 'LYD';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            const result = await walletService.deposit(parseFloat(amount));
            setSuccessMessage(t('wallet.modal.addFundsSuccess', { amount: result.amount.toFixed(2) }));
            onFundsAdded();
            setTimeout(() => onClose(), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePresetClick = (presetAmount: number) => {
        setAmount(presetAmount.toString());
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold mb-4">{t('wallet.modal.addFundsTitle')}</h3>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">{t('wallet.modal.amountLabel')}</label>
                    <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                        placeholder="0.00"
                        required
                        min="1"
                        step="0.01"
                    />

                    <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-2">{t('wallet.modal.selectAmount')}</p>
                        <div className="flex space-x-2">
                            {presetAmounts.map(preset => (
                                <button key={preset} type="button" onClick={() => handlePresetClick(preset)} className="flex-1 py-2 px-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                                    {preset} {currencySymbol}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    {successMessage && <p className="text-green-600 text-sm mt-2">{successMessage}</p>}
                    <div className="mt-6 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md">{t('common.cancel')}</button>
                        <button type="submit" disabled={isLoading || !!successMessage} className="py-2 px-4 bg-primary text-white rounded-md disabled:bg-gray-400">
                            {isLoading ? t('wallet.modal.addingFunds') : t('wallet.addFunds')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const RedeemCodeModal: React.FC<{ onClose: () => void; onFundsAdded: () => void; }> = ({ onClose, onFundsAdded }) => {
    const { t } = useTranslation();
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleRedeemSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            const result = await walletService.redeemCode(code);
            setSuccessMessage(t('wallet.modal.success', { amount: result.amount.toFixed(2) }));
            onFundsAdded();
            // Keep the modal open for a moment to show success, then close
            setTimeout(() => onClose(), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold mb-4">{t('wallet.modal.redeemTitle')}</h3>
                <form onSubmit={handleRedeemSubmit}>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700">{t('wallet.modal.codeLabel')}</label>
                    <input
                        type="text"
                        id="code"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                        placeholder="WELCOME50"
                        required
                    />
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    {successMessage && <p className="text-green-600 text-sm mt-2">{successMessage}</p>}
                    <div className="mt-6 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md">{t('common.cancel')}</button>
                        <button type="submit" disabled={isLoading || !!successMessage} className="py-2 px-4 bg-primary text-white rounded-md disabled:bg-gray-400">
                            {isLoading ? t('wallet.modal.redeeming') : t('wallet.modal.redeem')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const TransactionRow: React.FC<{ trans: Transaction; appt?: Appointment }> = ({ trans, appt }) => {
    const { i18n, t } = useTranslation();
    const currencySymbol = i18n.language === 'ar' ? 'د.ل' : 'LYD';

    const normalizeServiceForArabic = (service: string) => {
        const s = (service || '').trim();
        // User requirement: in Arabic UI, do not show "Checkup"; show "حجز".
        if (/check\s*up|checkup/i.test(s)) return 'حجز';
        if (/^كشف\b/.test(s) || s === 'كشف') return 'حجز';
        return s;
    };

    const cleanDoctorName = (name: string) => {
        // Remove repeated or leading "Dr." to avoid "Dr. Dr. Name"
        return name.replace(/^\s*(Dr\.?\s*)+/i, '').trim();
    };

    const parseBackendEnglishAppointmentDescription = (desc: string) => {
        const feeRegex = /^Fee for (.+?) with Dr\.?\s*(.+?) at (.+)$/i;
        const refundRegex = /^Refund for cancelled (.+?) with Dr\.?\s*(.+?) at (.+)$/i;

        const refundMatch = desc.match(refundRegex);
        if (refundMatch) {
            const [, service, doctor, hospital] = refundMatch;
            return {
                kind: 'refund' as const,
                service: service.trim(),
                doctor: cleanDoctorName(doctor),
                hospital: hospital.trim(),
            };
        }

        const feeMatch = desc.match(feeRegex);
        if (feeMatch) {
            const [, service, doctor, hospital] = feeMatch;
            return {
                kind: 'fee' as const,
                service: service.trim(),
                doctor: cleanDoctorName(doctor),
                hospital: hospital.trim(),
            };
        }

        return null;
    };

    const getLocalizedDescription = () => {
        const map: Record<Transaction['transactionType'], string> = {
            'Appointment Fee': t('wallet.transactions.appointmentFee'),
            'Refund': t('wallet.transactions.refund'),
            'Deposit': t('wallet.transactions.deposit'),
            'Admin Credit': t('wallet.transactions.adminCredit'),
            'Initial Balance': t('wallet.transactions.initialBalance'),
        };
        const base = map[trans.transactionType];

        const desc = (trans.description || '').trim();

        // In Arabic UI, avoid showing English backend descriptions; rebuild them if possible.
        if (i18n.language === 'ar') {
            if (appt && (trans.transactionType === 'Appointment Fee' || trans.transactionType === 'Refund')) {
                const rawService = getTranslatedName(appt.appointmentType?.name || { en: 'Service', ar: 'الخدمة' });
                const service = normalizeServiceForArabic(rawService);
                const doctor = getTranslatedName(appt.doctor?.name || { en: 'Doctor', ar: 'الطبيب' });
                const hospital = getTranslatedName(appt.hospital?.name || { en: 'Hospital', ar: 'المستشفى' });

                if (trans.transactionType === 'Refund') {
                    return t('wallet.transactions.refundForCancelledAppointment', {
                        service,
                        doctor,
                        hospital,
                    });
                }

                return t('wallet.transactions.feeForAppointment', {
                    service,
                    doctor,
                    hospital,
                });
            }

            if (desc) {
                const parsed = parseBackendEnglishAppointmentDescription(desc);
                if (parsed?.kind === 'fee') {
                    return t('wallet.transactions.feeForAppointment', {
                        service: normalizeServiceForArabic(parsed.service),
                        doctor: parsed.doctor,
                        hospital: parsed.hospital,
                    });
                }
                if (parsed?.kind === 'refund') {
                    return t('wallet.transactions.refundForCancelledAppointment', {
                        service: normalizeServiceForArabic(parsed.service),
                        doctor: parsed.doctor,
                        hospital: parsed.hospital,
                    });
                }
            }
            return base;
        }

        // In non-Arabic UI, prefer backend description if provided; otherwise fall back.
        if (desc) return desc;
        return base;
    };

    const label = getLocalizedDescription();
    const secondary = undefined;
    return (
        <div className="flex items-center justify-between py-4 border-b last:border-b-0">
            <div>
                <p className="font-semibold text-dark">{label}</p>
                {secondary && <p className="text-xs text-gray-500">{secondary}</p>}
                <p className="text-sm text-gray-500">{new Date(trans.createdAt).toLocaleString()}</p>
            </div>
            <p className={`font-bold text-lg ${trans.type === 'credit' ? 'text-success' : 'text-danger'}`}>
                {trans.type === 'credit' ? '+' : '-'}{trans.amount.toFixed(2)} {currencySymbol}
            </p>
        </div>
    );
};


const TransactionSkeleton: React.FC = () => (
    <div className="flex items-center justify-between py-4 border-b animate-pulse">
        <div>
            <div className="h-5 bg-gray-300 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="h-7 bg-gray-300 rounded w-20"></div>
    </div>
);


const Wallet: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [wallet, setWallet] = useState<WalletType | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [apptCache, setApptCache] = useState<Record<string, Appointment>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
    const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);

    const currencySymbol = i18n.language === 'ar' ? 'د.ل' : 'LYD';

    const fetchWalletData = useCallback(async () => {
        // Only show full loading state on initial fetch
        if (!wallet) setIsLoading(true);
        setError(null);
        try {
            const [walletData, transactionsData] = await Promise.all([
                walletService.get(),
                walletService.getTransactions()
            ]);
            setWallet(walletData);
            setTransactions(transactionsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [wallet]);

    useEffect(() => {
        fetchWalletData();
    }, []); // Run only once on mount

    useEffect(() => {
        // For Arabic UI, fetch appointment details for transactions so we can display fully localized labels.
        if (i18n.language !== 'ar') return;
        if (!transactions || transactions.length === 0) return;

        const idsToFetch = transactions
            .filter(t => (t.transactionType === 'Appointment Fee' || t.transactionType === 'Refund'))
            .map(t => String(t.referenceId || ''))
            .filter(Boolean)
            .filter(id => !apptCache[id]);

        if (idsToFetch.length === 0) return;

        let cancelled = false;
        (async () => {
            const results = await Promise.allSettled(idsToFetch.map(id => appointments.getById(id)));
            if (cancelled) return;

            setApptCache(prev => {
                const next = { ...prev };
                for (let idx = 0; idx < results.length; idx++) {
                    const res = results[idx];
                    const id = idsToFetch[idx];
                    if (res.status === 'fulfilled' && res.value) {
                        next[id] = res.value as Appointment;
                    }
                }
                return next;
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [transactions, i18n.language, apptCache]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-dark">{t('wallet.title')}</h1>
                <p className="text-gray-500 mt-1">{t('wallet.description')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-primary text-white p-6 rounded-xl shadow-lg">
                        <p className="opacity-80">{t('wallet.currentBalance')}</p>
                        {isLoading ? (
                            <div className="h-10 bg-blue-400 rounded w-3/4 mt-2 animate-pulse"></div>
                        ) : (
                            <p className="text-4xl font-bold mt-2">{wallet?.balance.toFixed(2) ?? '0.00'} <span className="text-2xl align-baseline">{currencySymbol}</span></p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <button onClick={() => setIsAddFundsModalOpen(true)} className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                            <PlusIcon className="w-5 h-5 me-2" />
                            {t('wallet.addFunds')}
                        </button>
                        <button onClick={() => setIsRedeemModalOpen(true)} className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                            {t('wallet.redeemCode')}
                        </button>
                    </div>
                </div>

                <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold text-dark mb-4">{t('wallet.recentTransactions')}</h2>
                    <div>
                        {isLoading ? (
                            Array(4).fill(0).map((_, i) => <TransactionSkeleton key={i} />)
                        ) : error ? (
                            <div className="text-center py-8 text-red-500">{error}</div>
                        ) : transactions.length > 0 ? (
                            transactions.map(trans => (
                                <TransactionRow
                                    key={trans._id}
                                    trans={trans}
                                    appt={trans.referenceId ? apptCache[String(trans.referenceId)] : undefined}
                                />
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">{t('wallet.noTransactions')}</div>
                        )}
                    </div>
                </div>
            </div>
            {isRedeemModalOpen && <RedeemCodeModal onClose={() => setIsRedeemModalOpen(false)} onFundsAdded={fetchWalletData} />}
            {isAddFundsModalOpen && <AddFundsModal onClose={() => setIsAddFundsModalOpen(false)} onFundsAdded={fetchWalletData} />}
        </div>
    );
};

export default Wallet;
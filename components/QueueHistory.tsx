import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QueueItem } from '../types';
import { queue } from '../utils/api';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from './Icons';
import { getTranslatedName } from '../utils/translation';

const statusConfig = {
    Done: {
        icon: CheckCircleIcon,
        color: 'text-success',
        bg: 'bg-green-50',
    },
    Left: {
        icon: XCircleIcon,
        color: 'text-danger',
        bg: 'bg-red-50',
    },
    RemovedByAdmin: {
        icon: XCircleIcon,
        color: 'text-danger',
        bg: 'bg-red-50',
    },
    // Fallback for any other statuses that might appear in history
    default: {
        icon: ClockIcon,
        color: 'text-gray-500',
        bg: 'bg-gray-50',
    }
};


const HistoryCard: React.FC<{ item: QueueItem }> = ({ item }) => {
    const { t } = useTranslation();
    const { icon: Icon, color, bg } = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.default;

    const getStatusTranslation = (status: QueueItem['status']) => {
        const key = `queueHistory.status.${status}`;
        const translated = t(key);
        // i18next returns the key if translation not found, so we check against it.
        return translated === key ? status : translated;
    };
    
    return (
        <div className={`p-4 rounded-lg border flex items-center justify-between ${bg}`}>
            <div className="flex items-center">
                 <div className="me-4">
                    <Icon className={`w-8 h-8 ${color}`} />
                </div>
                <div>
                    <p className="font-bold text-dark">{t('appointments.suggestionDetails', {
                        doctorName: getTranslatedName(item.doctor?.name || { en: 'Doctor', ar: 'طبيب' }),
                        hospitalName: getTranslatedName(item.hospital?.name || { en: 'Hospital', ar: 'مستشفى' }),
                    })}</p>
                    <p className="text-sm text-gray-500">{new Date(item.checkInTime).toLocaleString()}</p>
                </div>
            </div>
            <div className="text-end">
                <p className={`font-semibold ${color}`}>{getStatusTranslation(item.status)}</p>
            </div>
        </div>
    );
};

const HistoryCardSkeleton: React.FC = () => (
    <div className="p-4 rounded-lg border flex items-center justify-between bg-white animate-pulse">
        <div className="flex items-center w-full">
            <div className="w-8 h-8 rounded-full bg-gray-200 me-4"></div>
            <div className="flex-1">
                <div className="h-5 bg-gray-300 rounded w-4/5 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/5"></div>
            </div>
        </div>
        <div className="h-6 w-24 bg-gray-200 rounded"></div>
    </div>
);


const QueueHistory: React.FC = () => {
    const { t } = useTranslation();
    const [history, setHistory] = useState<QueueItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await queue.getHistory();
                setHistory(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, []);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-dark">{t('queueHistory.title')}</h1>
                <p className="text-gray-500 mt-1">{t('queueHistory.description')}</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                 {isLoading ? (
                    Array(4).fill(0).map((_, i) => <HistoryCardSkeleton key={i} />)
                 ) : error ? (
                    <div className="text-center py-8 text-red-500">{error}</div>
                 ) : history.length > 0 ? (
                    history.map(item => <HistoryCard key={item._id} item={item} />)
                 ) : (
                    <div className="text-center py-8 text-gray-500">{t('queueHistory.noHistory')}</div>
                 )}
            </div>
        </div>
    );
};

export default QueueHistory;

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Reminder } from '../types';
import { ClockIcon, PlusIcon, TrashIcon } from './Icons';
import { reminders as remindersApi } from '../utils/api';

const ReminderCard: React.FC<{ reminder: Reminder, onDelete: (id: string) => void }> = ({ reminder, onDelete }) => (
    <div className="bg-white p-4 rounded-lg border flex items-center space-x-4 rtl:space-x-reverse relative group">
        <div className="p-3 bg-primary-light rounded-full">
            <ClockIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
            <p className="font-bold text-dark">{reminder.medication}</p>
            <p className="text-sm text-gray-500">{reminder.dosage}</p>
        </div>
        <div className="flex-grow text-end">
            <p className="font-semibold text-primary">{reminder.time}</p>
        </div>
        <button onClick={() => onDelete(reminder._id)} className="absolute top-2 end-2 text-gray-400 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
            <TrashIcon className="w-4 h-4" />
        </button>
    </div>
);

const ReminderSkeleton: React.FC = () => (
    <div className="bg-white p-4 rounded-lg border flex items-center space-x-4 rtl:space-x-reverse animate-pulse">
        <div className="p-3 bg-gray-200 rounded-full">
            <div className="w-6 h-6"></div>
        </div>
        <div className="w-full">
            <div className="h-5 bg-gray-300 rounded w-3/5 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/5"></div>
        </div>
    </div>
);

const AddReminderModal: React.FC<{ onClose: () => void, onReminderAdded: () => void }> = ({ onClose, onReminderAdded }) => {
    const { t } = useTranslation();
    const [medication, setMedication] = useState('');
    const [dosage, setDosage] = useState('');
    const [time, setTime] = useState('08:00');
    const [period, setPeriod] = useState<'Morning' | 'Afternoon' | 'Evening'>('Morning');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await remindersApi.create({ medication, dosage, time, period });
            onReminderAdded();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">{t('reminders.modal.title')}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('reminders.modal.medication')}</label>
                        <input type="text" value={medication} onChange={e => setMedication(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('reminders.modal.dosage')}</label>
                        <input type="text" value={dosage} onChange={e => setDosage(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., 500mg" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('reminders.modal.time')}</label>
                        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('reminders.modal.period')}</label>
                        <select value={period} onChange={e => setPeriod(e.target.value as any)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                            <option value="Morning">{t('reminders.morning')}</option>
                            <option value="Afternoon">{t('reminders.afternoon')}</option>
                            <option value="Evening">{t('reminders.evening')}</option>
                        </select>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="mt-6 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md">{t('common.cancel')}</button>
                        <button type="submit" disabled={isLoading} className="py-2 px-4 bg-primary text-white rounded-md disabled:bg-gray-400">
                            {isLoading ? t('common.processing') : t('reminders.addReminder')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const Reminders: React.FC = () => {
    const { t } = useTranslation();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchReminders = async () => {
        setIsLoading(true);
        try {
            const data = await remindersApi.getAll();
            setReminders(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReminders();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('reminders.confirmDelete'))) return;
        try {
            await remindersApi.delete(id);
            setReminders(prev => prev.filter(r => r._id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete reminder');
        }
    }

    const morningReminders = reminders.filter(r => r.period === 'Morning');
    const afternoonReminders = reminders.filter(r => r.period === 'Afternoon');
    const eveningReminders = reminders.filter(r => r.period === 'Evening');

    const renderReminderSection = (titleKey: string, data: Reminder[]) => (
        <div>
            <h2 className="text-xl font-bold text-dark mb-4">{t(titleKey)}</h2>
            {data.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.map(r => <ReminderCard key={r._id} reminder={r} onDelete={handleDelete} />)}
                </div>
            ) : (
                <p className="text-gray-500">{t('reminders.noReminders')}</p>
            )}
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-dark">{t('reminders.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('reminders.description')}</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                    <PlusIcon className="w-5 h-5 me-2" />
                    {t('reminders.addReminder')}
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-dark mb-4">{t('reminders.morning')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <ReminderSkeleton />
                            <ReminderSkeleton />
                        </div>
                    </div>
                </div>
            ) : error ? (
                <div className="bg-red-100 border-s-4 border-red-500 text-red-700 p-4" role="alert"><p>{error}</p></div>
            ) : (
                <div className="space-y-6">
                    {renderReminderSection('reminders.morning', morningReminders)}
                    {renderReminderSection('reminders.afternoon', afternoonReminders)}
                    {renderReminderSection('reminders.evening', eveningReminders)}
                </div>
            )}
            {isModalOpen && <AddReminderModal onClose={() => setIsModalOpen(false)} onReminderAdded={fetchReminders} />}
        </div>
    );
};

export default Reminders;

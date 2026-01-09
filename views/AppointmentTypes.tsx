import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { appointmentTypes, hospitals } from '../utils/api';
import { AppointmentType, Specialty } from '../types';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
// FIX: Import getTranslatedName to handle I18nString type.
import { getTranslatedName } from '../utils/translation';

const AppointmentTypeModal: React.FC<{
    type: AppointmentType | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    specialties: Specialty[];
}> = ({ type, isOpen, onClose, onSave, specialties }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: '',
        duration: 30,
        cost: 50,
        specialty: '',
    });
    const [allowNameChange, setAllowNameChange] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setError('');
            setAllowNameChange(false);
            if (type) {
                setFormData({
                    // FIX: Use type.name.en as the value for the editable name field.
                    name: type.name.en,
                    duration: type.duration,
                    cost: type.cost,
                    specialty: type.specialty._id,
                });
            } else {
                setFormData({
                    name: '',
                    duration: 30,
                    cost: 50,
                    specialty: specialties.length > 0 ? specialties[0]._id : '',
                });
                setAllowNameChange(true); // new record can set name freely
            }
        }
    }, [type, isOpen, specialties]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            if (formData.cost < 0) {
                const invalidCostMsg = t('appointmentTypes.modal.invalidCost');
                setError(invalidCostMsg && invalidCostMsg !== 'appointmentTypes.modal.invalidCost'
                    ? invalidCostMsg
                    : 'Cost must be zero or greater');
                setIsLoading(false);
                return;
            }

            const payload: any = {
                duration: formData.duration,
                cost: formData.cost,
                specialty: formData.specialty,
            };

            if (!type) {
                payload.name = formData.name;
            } else if (allowNameChange) {
                payload.name = formData.name;
                payload.allowNameChange = true;
            }

            if (type) {
                await appointmentTypes.update(type._id, payload);
            } else {
                await appointmentTypes.create(payload);
            }
            onSave();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h3 className="text-lg font-bold mb-4">{type ? t('appointmentTypes.modal.editTitle') : t('appointmentTypes.modal.createTitle')}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">{t('appointmentTypes.modal.nameLabel')}</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full p-2 border rounded-md"
                            placeholder={t('appointmentTypes.modal.namePlaceholder')}
                            required
                            disabled={!!type && !allowNameChange}
                        />
                        {type && (
                            <label className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                                <input
                                    type="checkbox"
                                    checked={allowNameChange}
                                    onChange={e => setAllowNameChange(e.target.checked)}
                                />
                                {t('appointmentTypes.modal.enableNameEdit') || 'Allow name change (requires explicit confirmation)'}
                            </label>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">{t('appointmentTypes.modal.specialtyLabel')}</label>
                        <select value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value })} className="w-full p-2 border rounded-md" required>
                            {/* FIX: Use getTranslatedName for I18nString */}
                            {specialties.map(s => <option key={s._id} value={s._id}>{getTranslatedName(s.name)}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">{t('appointmentTypes.modal.durationLabel')}</label>
                            <input type="number" value={formData.duration} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })} className="w-full p-2 border rounded-md" required min="5" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">{t('appointmentTypes.modal.costLabel')}</label>
                            <input type="number" value={formData.cost} onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) })} className="w-full p-2 border rounded-md" required min="0" step="0.01" />
                        </div>
                    </div>
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                <div className="mt-6 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md">{t('common.cancel')}</button>
                    <button type="submit" disabled={isLoading} className="py-2 px-4 bg-primary text-white rounded-md disabled:bg-gray-400">
                        {isLoading ? t('common.processing') : t('admin.save')}
                    </button>
                </div>
            </form>
        </div>
    );
};

const AppointmentTypes: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [types, setTypes] = useState<AppointmentType[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
    const currencySymbol = i18n.language === 'ar' ? 'د.ل' : 'LYD';

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [typesData, specialtiesData] = await Promise.all([
                appointmentTypes.getAll(),
                hospitals.getSpecialties(),
            ]);
            setTypes(typesData);
            setSpecialties(specialtiesData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (type: AppointmentType | null) => {
        setSelectedType(type);
        setIsModalOpen(true);
    };

    const handleOpenDeleteModal = (type: AppointmentType) => {
        setSelectedType(type);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedType) return;
        try {
            await appointmentTypes.delete(selectedType._id);
            setIsDeleteModalOpen(false);
            setSelectedType(null);
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete type');
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-dark">{t('appointmentTypes.title')}</h1>
                <p className="text-gray-500 mt-1">{t('appointmentTypes.description')}</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{t('appointmentTypes.title') || 'Appointment Types'}</h2>
                    <button onClick={() => handleOpenModal(null)} className="flex items-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark">
                        <PlusIcon className="w-5 h-5 me-2" />
                        {t('appointmentTypes.createType')}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{t('appointmentTypes.table.name')}</th>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{t('appointmentTypes.table.specialty')}</th>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{t('appointmentTypes.table.duration')}</th>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{t('appointmentTypes.table.cost')}</th>
                                <th className="relative px-6 py-3"><span className="sr-only">{t('appointmentTypes.table.actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-4 text-center text-gray-500">{t('common.loading')}</td></tr>
                            ) : error ? (
                                <tr><td colSpan={5} className="p-4 text-center text-red-500">{error}</td></tr>
                            ) : types.map(type => (
                                <tr key={type._id}>
                                    {/* FIX: Use getTranslatedName for I18nString */}
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{getTranslatedName(type.name)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{getTranslatedName(type.specialty.name)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{type.duration}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{type.cost.toFixed(2)} {currencySymbol}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium space-x-2">
                                        <button onClick={() => handleOpenModal(type)} className="text-primary" aria-label={t('appointmentTypes.modal.editTitle') || 'Edit'}><EditIcon className="w-5 h-5" /></button>
                                        <button onClick={() => handleOpenDeleteModal(type)} className="text-danger" aria-label={t('admin.delete') || 'Delete'}><TrashIcon className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AppointmentTypeModal
                isOpen={isModalOpen}
                type={selectedType}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchData}
                specialties={specialties}
            />

            {isDeleteModalOpen && selectedType && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-2">{t('appointmentTypes.confirmDeleteTitle')}</h3>
                        {/* FIX: Use getTranslatedName for I18nString */}
                        <p>{t('appointmentTypes.confirmDeleteText', { name: getTranslatedName(selectedType.name) })}</p>
                        <div className="mt-6 flex justify-end space-x-2">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="py-2 px-4 bg-gray-200 rounded-md">{t('common.cancel')}</button>
                            <button onClick={handleDelete} className="py-2 px-4 bg-danger text-white rounded-md">{t('admin.delete')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppointmentTypes;
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { hospitals, users } from '../utils/api';
import { Specialty, User } from '../types';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon } from '../components/Icons';
// FIX: Import getTranslatedName to handle I18nString type.
import { getTranslatedName } from '../utils/translation';

const SpecialtyModal: React.FC<{
    specialty: Specialty | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}> = ({ specialty, isOpen, onClose, onSave }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // FIX: Use specialty.name.en as the value for the editable name field.
            setName(specialty?.name.en || '');
            setError('');
        }
    }, [specialty, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            if (specialty) {
                await hospitals.updateSpecialty(specialty._id, name);
            } else {
                await hospitals.createSpecialty(name);
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">{specialty ? t('specialties.editSpecialty') : t('specialties.modal.createTitle')}</h3>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t('specialties.modal.nameLabel')}</label>
                    <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder={t('specialties.modal.namePlaceholder')} required />
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

const Specialties: React.FC = () => {
    const { t } = useTranslation();
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [doctors, setDoctors] = useState<User[]>([]);
    const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
    const [assignedDoctorIds, setAssignedDoctorIds] = useState<Set<string>>(new Set());

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [specialtiesData, usersData] = await Promise.all([
                hospitals.getSpecialties(),
                users.getAll()
            ]);
            setSpecialties(specialtiesData);
            setDoctors(usersData.filter((u: User) => u.role === 'doctor'));
            if (specialtiesData.length > 0) {
                setSelectedSpecialty(specialtiesData[0]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (selectedSpecialty && doctors.length > 0) {
            const assignedIds = new Set<string>();
            doctors.forEach(doctor => {
                if (doctor.specialties?.some(s => s._id === selectedSpecialty._id)) {
                    assignedIds.add(doctor._id);
                }
            });
            setAssignedDoctorIds(assignedIds);
        } else {
            setAssignedDoctorIds(new Set());
        }
    }, [selectedSpecialty, doctors]);

    const handleToggleDoctorAssignment = (doctorId: string) => {
        setAssignedDoctorIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(doctorId)) {
                newSet.delete(doctorId);
            } else {
                newSet.add(doctorId);
            }
            return newSet;
        });
    };

    const handleSaveAssignments = async () => {
        if (!selectedSpecialty) return;
        setIsSaving(true);
        setSuccessMessage('');
        setError(null);
        try {
            await hospitals.assignDoctorsToSpecialty(selectedSpecialty._id, Array.from(assignedDoctorIds));
            setSuccessMessage(t('specialties.assignmentsSaved'));
            // Refetch all data to get updated user objects with new specialty lists
            await fetchData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save assignments');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedSpecialty) return;
        try {
            await hospitals.deleteSpecialty(selectedSpecialty._id);
            setIsDeleteModalOpen(false);
            setSelectedSpecialty(null);
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete specialty');
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-dark">{t('specialties.title')}</h1>
                <p className="text-gray-500 mt-1">{t('specialties.description')}</p>
            </div>
            {error && <div className="bg-red-100 border-s-4 border-red-500 text-red-700 p-4" role="alert"><p>{error}</p></div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold">Specialties</h2>
                        <button onClick={() => { setEditingSpecialty(null); setIsModalOpen(true); }} className="p-2 text-primary hover:bg-primary-light rounded-full"><PlusIcon className="w-5 h-5" /></button>
                    </div>
                    <div className="space-y-2">
                        {isLoading ? <p>{t('common.loading')}</p> : specialties.map(spec => (
                            <button key={spec._id} onClick={() => setSelectedSpecialty(spec)} className={`w-full text-start p-3 rounded-lg ${selectedSpecialty?._id === spec._id ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>
                                {/* FIX: Use getTranslatedName for I18nString */}
                                {getTranslatedName(spec.name)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                    {selectedSpecialty ? (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                {/* FIX: Use getTranslatedName for I18nString */}
                                <h2 className="text-lg font-bold">{t('specialties.assignDoctors', { name: getTranslatedName(selectedSpecialty.name) })}</h2>
                                <div>
                                    <button onClick={() => { setEditingSpecialty(selectedSpecialty); setIsModalOpen(true); }} className="p-2 text-gray-500 hover:text-primary"><EditIcon className="w-5 h-5" /></button>
                                    <button onClick={() => setIsDeleteModalOpen(true)} className="p-2 text-gray-500 hover:text-danger"><TrashIcon className="w-5 h-5" /></button>
                                </div>
                            </div>
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {doctors.length > 0 ? doctors.map(doc => (
                                    <label key={doc._id} className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer">
                                        <input type="checkbox" checked={assignedDoctorIds.has(doc._id)} onChange={() => handleToggleDoctorAssignment(doc._id)} className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" />
                                        <span className="ms-3 font-medium text-gray-700">{getTranslatedName(doc.name)}</span>
                                    </label>
                                )) : <p className="text-gray-500">{t('specialties.noDoctors')}</p>}
                            </div>
                            <div className="mt-6 flex justify-end items-center">
                                {successMessage && <p className="text-green-600 text-sm me-4">{successMessage}</p>}
                                <button onClick={handleSaveAssignments} disabled={isSaving} className="py-2 px-6 bg-primary text-white rounded-md disabled:bg-gray-400">
                                    {isSaving ? t('common.processing') : t('specialties.saveAssignments')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            {isLoading ? t('common.loading') : t('specialties.noSpecialties')}
                        </div>
                    )}
                </div>
            </div>

            <SpecialtyModal
                isOpen={isModalOpen}
                specialty={editingSpecialty}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchData}
            />

            {isDeleteModalOpen && selectedSpecialty && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-2">{t('specialties.confirmDeleteTitle')}</h3>
                        {/* FIX: Use getTranslatedName for I18nString */}
                        <p>{t('specialties.confirmDeleteText', { name: getTranslatedName(selectedSpecialty.name) })}</p>
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

export default Specialties;
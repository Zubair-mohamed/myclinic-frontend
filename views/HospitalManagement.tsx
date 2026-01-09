
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Hospital, User } from '../types';
import { hospitals as hospitalsApi, users } from '../utils/api';
import { PlusIcon, EditIcon, TrashIcon, BuildingOfficeIcon, SearchIcon, MapPinIcon } from '../components/Icons';
import { getTranslatedName } from '../utils/translation';

const HospitalModal: React.FC<{
    hospital: Hospital | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}> = ({ hospital, isOpen, onClose, onSave }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [refundPolicyPercentage, setRefundPolicyPercentage] = useState(100);
    const [managerId, setManagerId] = useState('');
    const [managers, setManagers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchManagers = async () => {
                try {
                    const usersList = await users.getAll();
                    // Filter users who are hospital managers
                    setManagers(usersList.filter((u: User) => u.role === 'hospital manager'));
                } catch (e) {
                    console.error("Failed to fetch managers", e);
                }
            };
            fetchManagers();

            if (hospital) {
                setName(hospital.name.en);
                setAddress(hospital.address);
                setRefundPolicyPercentage(hospital.refundPolicyPercentage || 100);
                setManagerId(hospital.manager?._id || '');
            } else {
                setName('');
                setAddress('');
                setRefundPolicyPercentage(100);
                setManagerId('');
            }
        }
    }, [isOpen, hospital]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSave({
                name,
                address,
                refundPolicyPercentage,
                manager: managerId || null
            });
            onClose();
        } catch (e) {
            console.error("Failed to save", e);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">{hospital ? t('hospitalManagement.editTitle') : t('hospitalManagement.createTitle')}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('hospitalManagement.nameLabel')}</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('hospitalManagement.addressLabel')}</label>
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('hospitalManagement.refundPolicyLabel')}</label>
                        <input type="number" value={refundPolicyPercentage} onChange={e => setRefundPolicyPercentage(Number(e.target.value))} min="0" max="100" className="w-full p-2 border rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('hospitalManagement.managerLabel')}</label>
                        <select value={managerId} onChange={e => setManagerId(e.target.value)} className="w-full p-2 border rounded-md">
                            <option value="">{t('hospitalManagement.selectManager')}</option>
                            {managers.map(m => (
                                <option key={m._id} value={m._id}>{getTranslatedName(m.name)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">{t('common.cancel')}</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary text-white rounded-md disabled:bg-gray-400">
                            {isLoading ? t('common.processing') : t('admin.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const HospitalManagement: React.FC = () => {
    const { t } = useTranslation();
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
    const [error, setError] = useState('');

    const fetchHospitals = async () => {
        setIsLoading(true);
        try {
            const data = await hospitalsApi.getAll();
            setHospitals(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load hospitals');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHospitals();
    }, []);

    const handleSave = async (data: any) => {
        if (selectedHospital) {
            await hospitalsApi.update(selectedHospital._id, data);
        } else {
            await hospitalsApi.create(data);
        }

        fetchHospitals();
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('hospitalManagement.confirmDelete'))) return;
        try {
            await hospitalsApi.delete(id);
            fetchHospitals();
        } catch (err: any) {
            alert(err.message || 'Failed to delete hospital');
        }
    };

    const handleEdit = (hospital: Hospital) => {
        setSelectedHospital(hospital);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedHospital(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-dark">{t('hospitalManagement.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('hospitalManagement.description')}</p>
                </div>
                <button onClick={handleCreate} className="flex items-center py-2 px-4 bg-primary text-white rounded-lg shadow-sm hover:bg-primary-dark">
                    <PlusIcon className="w-5 h-5 me-2" />
                    {t('hospitalManagement.addHospital')}
                </button>
            </div>

            {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{t('hospitalManagement.nameLabel')}</th>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{t('hospitalManagement.addressLabel')}</th>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{t('hospitalManagement.managerLabel')}</th>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{t('hospitalManagement.refundPolicyLabel')}</th>
                                <th className="px-6 py-3 text-end">{t('admin.usersTable.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-4 text-center">{t('common.loading')}</td></tr>
                            ) : hospitals.length === 0 ? (
                                <tr><td colSpan={5} className="p-4 text-center text-gray-500">{t('hospitalManagement.noHospitals')}</td></tr>
                            ) : (
                                hospitals.map(hospital => (
                                    <tr key={hospital._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 flex items-center">
                                            <BuildingOfficeIcon className="w-5 h-5 text-gray-400 me-2" />
                                            {getTranslatedName(hospital.name)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                                            <div className="flex items-center">
                                                <MapPinIcon className="w-4 h-4 me-1 text-gray-400" />
                                                {hospital.address}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                                            {hospital.manager ? getTranslatedName(hospital.manager.name) : <span className="text-amber-500 italic">Unassigned</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                                            {hospital.refundPolicyPercentage}%
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium space-x-2">
                                            <button onClick={() => handleEdit(hospital)} className="text-primary hover:text-primary-dark"><EditIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleDelete(hospital._id)} className="text-danger hover:text-red-700"><TrashIcon className="w-5 h-5" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <HospitalModal
                hospital={selectedHospital}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    );
};

export default HospitalManagement;

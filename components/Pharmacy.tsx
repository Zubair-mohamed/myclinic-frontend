import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Medication, PharmacyLocation } from '../types';
import { SearchIcon, PillIcon, EditIcon, TrashIcon, PlusIcon, XCircleIcon } from './Icons';
import { pharmacy } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getTranslatedName } from '../utils/translation';


const LocationPill: React.FC<{ location: PharmacyLocation }> = ({ location }) => (
    <div className="bg-gray-100 rounded-full px-3 py-1 text-xs text-gray-700">
        {location.name} ({location.distance})
    </div>
);

const MedicationCard: React.FC<{ med: Medication, isAdmin: boolean, onEdit: () => void, onDelete: () => void }> = ({ med, isAdmin, onEdit, onDelete }) => {
    const { t, i18n } = useTranslation();
    const currencySymbol = i18n.language === 'ar' ? 'د.ل' : 'LYD';
    const safePrice = Number.isFinite((med as any).price) ? Number(med.price) : parseFloat(String((med as any).price ?? 0));

    const locations: PharmacyLocation[] = [];
    const availableAt = Array.isArray(med.availableAt) ? med.availableAt : [];
    if (availableAt.length > 0) {
        locations.push(...availableAt);
    }

    const pharmacyObj: any = (med as any).pharmacy;
    const hospitalObj: any = pharmacyObj?.hospital;
    const hospitalName = hospitalObj?.name ? getTranslatedName(hospitalObj.name) : '';
    if (hospitalName) {
        // Show hospital as the primary availability indicator.
        locations.unshift({
            name: hospitalName,
            address: pharmacyObj?.address || '',
            distance: pharmacyObj?.distance || '',
        });
    }

    return (
        <div className="bg-white p-4 rounded-lg border flex flex-col space-y-3 relative group">
            {isAdmin && (
                <div className="absolute top-2 end-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onEdit} className="p-1.5 bg-gray-100 rounded-full text-primary hover:bg-primary-light"><EditIcon className="w-4 h-4" /></button>
                    <button onClick={onDelete} className="p-1.5 bg-gray-100 rounded-full text-danger hover:bg-red-100"><TrashIcon className="w-4 h-4" /></button>
                </div>
            )}
            <div className="flex items-center">
                <div className="p-2 bg-secondary-light rounded-full me-3">
                    <PillIcon className="w-5 h-5 text-secondary" />
                </div>
                <div>
                    <p className="font-bold text-dark">{med.name}</p>
                    <p className="text-sm text-gray-500">{med.form}</p>
                </div>
                <div className="ms-auto text-end">
                    <p className="font-bold text-lg text-success">{safePrice.toFixed(2)} {currencySymbol}</p>
                </div>
            </div>
            <div>
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">{t('pharmacy.availableAt')}</p>
                <div className="flex flex-wrap gap-2">
                    {locations.length > 0 ? locations.map((loc, index) => <LocationPill key={loc?._id || `${loc.name}-${index}`} location={loc} />) : (
                        <span className="text-xs text-gray-500">{t('pharmacy.noLocations') || 'No locations listed'}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

type MedicationFormData = {
    name: string;
    price: number;
    form: string;
    availableAt: PharmacyLocation[];
};

const MedicationCardSkeleton: React.FC = () => (
    <div className="bg-white p-4 rounded-lg border animate-pulse">
        <div className="flex items-center mb-4">
            <div className="w-9 h-9 rounded-full bg-gray-200 me-3"></div>
            <div className="flex-1">
                <div className="h-5 bg-gray-300 rounded w-3/5 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/5"></div>
            </div>
            <div className="h-7 w-20 bg-gray-300 rounded"></div>
        </div>
        <div className="h-3 w-1/4 bg-gray-200 rounded mb-2"></div>
        <div className="flex flex-wrap gap-2">
            <div className="h-5 w-24 bg-gray-200 rounded-full"></div>
            <div className="h-5 w-32 bg-gray-200 rounded-full"></div>
        </div>
    </div>
);

const emptyMedication: MedicationFormData = {
    name: '',
    price: 0,
    form: '',
    availableAt: [{ name: '', address: '', distance: '' }]
};

const MedicationModal: React.FC<{
    med: Medication | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}> = ({ med, isOpen, onClose, onSave }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<MedicationFormData>({ ...emptyMedication });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setError('');
            if (med) {
                const existingLocations = Array.isArray(med.availableAt) ? med.availableAt : [];
                setFormData({ name: med.name, price: med.price, form: med.form, availableAt: existingLocations.length > 0 ? existingLocations : emptyMedication.availableAt });
            } else {
                setFormData({ ...emptyMedication });
            }
        }
    }, [med, isOpen]);
    
    const handleLocationChange = (index: number, field: keyof PharmacyLocation, value: string) => {
        const newLocations = [...formData.availableAt];
        newLocations[index] = { ...newLocations[index], [field]: value };
        setFormData({ ...formData, availableAt: newLocations });
    };

    const addLocation = () => {
        setFormData({ ...formData, availableAt: [...formData.availableAt, { name: '', address: '', distance: '' }] });
    };

    const removeLocation = (index: number) => {
        if (formData.availableAt.length <= 1) return; // Must have at least one
        setFormData({ ...formData, availableAt: formData.availableAt.filter((_, i) => i !== index) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            if (med) {
                await pharmacy.update(med._id, formData);
            } else {
                await pharmacy.create(formData);
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
            <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-full max-w-lg max-h-full overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">{med ? t('pharmacy.modal.editTitle') : t('pharmacy.modal.createTitle')}</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium">{t('pharmacy.modal.name')}</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2 border rounded-md" required /></div>
                        <div><label className="block text-sm font-medium">{t('pharmacy.modal.form')}</label><input type="text" value={formData.form} onChange={e => setFormData({ ...formData, form: e.target.value })} placeholder="e.g., 500mg Tablet" className="w-full p-2 border rounded-md" required /></div>
                    </div>
                    <div><label className="block text-sm font-medium">{t('pharmacy.modal.price')}</label><input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} className="w-full p-2 border rounded-md" required /></div>

                    <h4 className="font-semibold pt-2">{t('pharmacy.availableAt')}</h4>
                    <div className="space-y-3">
                        {formData.availableAt.map((loc, index) => (
                            <div key={index} className="grid grid-cols-3 gap-2 items-center">
                                <input type="text" value={loc.name} onChange={e => handleLocationChange(index, 'name', e.target.value)} placeholder={t('pharmacy.modal.locationName')} className="col-span-1 p-2 border rounded-md" required />
                                <input type="text" value={loc.address} onChange={e => handleLocationChange(index, 'address', e.target.value)} placeholder={t('pharmacy.modal.address')} className="col-span-1 p-2 border rounded-md" required />
                                <div className="flex items-center gap-2">
                                <input type="text" value={loc.distance} onChange={e => handleLocationChange(index, 'distance', e.target.value)} placeholder={t('pharmacy.modal.distance')} className="w-full p-2 border rounded-md" required />
                                <button type="button" onClick={() => removeLocation(index)} disabled={formData.availableAt.length <= 1} className="text-red-500 disabled:text-gray-300"><XCircleIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={addLocation} className="text-sm text-primary font-medium">{t('pharmacy.modal.addLocation')}</button>
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

const Pharmacy: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [medications, setMedications] = useState<Medication[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
    
    const isAdmin = user && ['hospital manager', 'super admin'].includes(user.role);

    const fetchMeds = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await pharmacy.getAll();
            setMedications(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMeds();
    }, [fetchMeds]);
    
    const handleOpenModal = (med: Medication | null) => {
        setSelectedMed(med);
        setIsModalOpen(true);
    };

    const handleDelete = async (medId: string) => {
        if (!window.confirm(t('pharmacy.confirmDelete'))) return;
        try {
            await pharmacy.delete(medId);
            fetchMeds();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete medication');
        }
    };

    const filteredMeds = medications.filter(med =>
        med?.name?.toLowerCase?.().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-dark">{t('pharmacy.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('pharmacy.description')}</p>
                </div>
                {isAdmin && (
                    <button onClick={() => handleOpenModal(null)} className="flex items-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark">
                        <PlusIcon className="w-5 h-5 me-2" />
                        {t('pharmacy.addMedication')}
                    </button>
                )}
            </div>
             <div className="relative">
                <SearchIcon className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder={t('pharmacy.searchPlaceholder')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full ps-12 pe-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                />
            </div>
            {error && <div className="bg-red-100 border-s-4 border-red-500 text-red-700 p-4" role="alert"><p>{error}</p></div>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {isLoading ? (
                     Array(6).fill(0).map((_, i) => <MedicationCardSkeleton key={i} />)
                 ) : filteredMeds.length > 0 ? (
                    filteredMeds.map(med => <MedicationCard key={med._id} med={med} isAdmin={isAdmin} onEdit={() => handleOpenModal(med)} onDelete={() => handleDelete(med._id)} />)
                 ) : (
                    <div className="col-span-full text-center py-8 text-gray-500">{t('pharmacy.noMedsFound')}</div>
                 )}
            </div>

            <MedicationModal 
                isOpen={isModalOpen}
                med={selectedMed}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchMeds}
            />
        </div>
    );
};

export default Pharmacy;

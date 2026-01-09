import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { EmergencyContact } from '../types';
import { emergencyContacts } from '../utils/api';
import { PlusIcon, EditIcon, TrashIcon } from './Icons';

const ContactModal: React.FC<{
    contact: EmergencyContact | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}> = ({ contact, isOpen, onClose, onSave }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [relation, setRelation] = useState('');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (contact) {
            setName(contact.name);
            setRelation(contact.relation);
            setPhone(contact.phone);
        } else {
            setName(''); setRelation(''); setPhone('');
        }
    }, [contact, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const contactData = { name, relation, phone };
            if (contact) {
                await emergencyContacts.update(contact._id, contactData);
            } else {
                await emergencyContacts.create(contactData);
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
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">{contact ? t('emergency.modal.editTitle') : t('emergency.modal.addTitle')}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">{t('emergency.modal.name')}</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium">{t('emergency.modal.relation')}</label>
                        <input type="text" value={relation} onChange={e => setRelation(e.target.value)} placeholder={t('emergency.spouse')} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">{t('emergency.modal.phone')}</label>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="mt-6 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md">{t('common.cancel')}</button>
                        <button type="submit" disabled={isLoading} className="py-2 px-4 bg-primary text-white rounded-md disabled:bg-gray-400">
                             {isLoading ? t('common.processing') : t('admin.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const Emergency: React.FC = () => {
    const { t } = useTranslation();
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(null);

    const fetchContacts = async () => {
        setIsLoading(true);
        try {
            const data = await emergencyContacts.getAll();
            setContacts(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchContacts();
    }, []);

    const handleOpenModal = (contact: EmergencyContact | null) => {
        setSelectedContact(contact);
        setIsModalOpen(true);
    };

    const handleDelete = async (contactId: string) => {
        if (!window.confirm(t('emergency.confirmDelete'))) return;
        try {
            await emergencyContacts.delete(contactId);
            fetchContacts(); // Refetch after delete
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete contact');
        }
    };
    
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-dark">{t('emergency.title')}</h1>
                <p className="text-gray-500 mt-1">{t('emergency.description')}</p>
            </div>

            <div className="p-6 bg-red-50 border-s-4 border-danger">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-danger" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1.75-5.25a.75.75 0 00-1.5 0v3.5c0 .414.336.75.75.75h3.5a.75.75 0 000-1.5h-2.75v-2.75z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ms-3">
                        <p className="text-sm text-danger">{t('emergency.warning')}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <a href="tel:911" className="bg-danger text-white p-8 rounded-xl shadow-lg hover:bg-red-700 transition-colors text-center">
                    <p className="text-2xl font-bold">{t('emergency.callAmbulance')}</p>
                    <p className="opacity-80 mt-1">{t('emergency.connectTo911')}</p>
                </a>
                <a href="tel:999" className="bg-secondary text-white p-8 rounded-xl shadow-lg hover:bg-cyan-700 transition-colors text-center">
                    <p className="text-2xl font-bold">{t('emergency.clinicEmergencyLine')}</p>
                    <p className="opacity-80 mt-1">{t('emergency.connectToHotline')}</p>
                </a>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-dark">{t('emergency.yourContacts')}</h2>
                     <button onClick={() => handleOpenModal(null)} className="flex items-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark">
                        <PlusIcon className="w-5 h-5 me-2" />
                        {t('emergency.addContact')}
                    </button>
                </div>
                {error && <div className="text-red-500 mb-4">{error}</div>}
                <div className="space-y-4">
                    {isLoading ? (
                        <p>{t('common.loading')}</p>
                    ) : contacts.length > 0 ? (
                        contacts.map(contact => (
                            <div key={contact._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-semibold text-dark">{contact.name}</p>
                                    <p className="text-sm text-gray-500">{contact.relation}</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <a href={`tel:${contact.phone}`} className="font-semibold text-primary hover:underline">{contact.phone}</a>
                                    <button onClick={() => handleOpenModal(contact)} className="text-gray-500 hover:text-primary"><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => handleDelete(contact._id)} className="text-gray-500 hover:text-danger"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500">{t('emergency.noContacts')}</p>
                    )}
                </div>
            </div>

            <ContactModal
                isOpen={isModalOpen}
                contact={selectedContact}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchContacts}
            />
        </div>
    );
};

export default Emergency;

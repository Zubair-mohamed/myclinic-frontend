
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Specialty, User, AppointmentType } from '../types';
import { hospitals, users, appointmentTypes } from '../utils/api';
import { getTranslatedName } from '../utils/translation';
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, BuildingOfficeIcon, ClockIcon, UserCircleIcon, XCircleIcon } from '../components/Icons';

interface HospitalsProps {
    onNavigateToBooking: (prefill: {
        specialtyId: string;
        hospitalId: string;
        appointmentTypeId: string;
        doctorId: string;
    }) => void;
}

const ServiceSelectionModal: React.FC<{
    doctor: User | null;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: AppointmentType) => void;
}> = ({ doctor, isOpen, onClose, onSelect }) => {
    const { t, i18n } = useTranslation();
    const [types, setTypes] = useState<AppointmentType[]>([]);
    const [loading, setLoading] = useState(false);
    const currencySymbol = i18n.language === 'ar' ? 'د.ل' : 'LYD';

    useEffect(() => {
        if (doctor && isOpen) {
            const fetchServices = async () => {
                setLoading(true);
                try {
                    // Fetch all public services and filter client side for this doctor's specialty/hospital combination
                    // Or ideally a backend endpoint. For now, let's reuse public endpoint and filter.
                    // A doctor can work in multiple hospitals and have multiple specialties.
                    // We need services that match ANY of the doctor's specialties in ANY of their hospitals.

                    const specIds = doctor.specialties?.map(s => s._id) || [];
                    const hospIds = doctor.hospitals?.map(h => h._id) || [];

                    const allTypes = await appointmentTypes.getPublic();
                    const relevantTypes = allTypes.filter((type: any) =>
                        specIds.includes(type.specialty._id || type.specialty) &&
                        hospIds.includes(type.hospital)
                    );
                    setTypes(relevantTypes);
                } catch (e) {
                    console.error("Failed to fetch services");
                } finally {
                    setLoading(false);
                }
            };
            fetchServices();
        }
    }, [doctor, isOpen]);

    if (!isOpen || !doctor) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in overflow-hidden">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-lg text-dark">{t('hospitals.bookWith', { name: getTranslatedName(doctor.name) })}</h3>
                        <p className="text-xs text-gray-500">{t('hospitals.selectService')}</p>
                    </div>
                    <button onClick={onClose}><XCircleIcon className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-4 text-gray-500">{t('common.loading')}</div>
                    ) : types.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">{t('hospitals.noServices')}</div>
                    ) : (
                        <div className="space-y-3">
                            {types.map(type => (
                                <button
                                    key={type._id}
                                    onClick={() => onSelect(type)}
                                    className="w-full flex items-center justify-between p-3 border rounded-xl hover:border-primary hover:bg-primary-light transition-all group"
                                >
                                    <div className="text-start">
                                        <p className="font-bold text-gray-800 group-hover:text-primary-dark">{getTranslatedName(type.name)}</p>
                                        <p className="text-xs text-gray-500">{type.duration} mins • {getTranslatedName(type.specialty.name)}</p>
                                    </div>
                                    <span className="font-bold text-success">{type.cost} {currencySymbol}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Hospitals: React.FC<HospitalsProps> = ({ onNavigateToBooking }) => {
    const { t, i18n } = useTranslation();

    // Core Data
    const [specialtiesByHospital, setSpecialtiesByHospital] = useState<Record<string, { hospitalId: string, specialties: Specialty[] }>>({});
    const [doctors, setDoctors] = useState<User[]>([]);

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<'specialty' | 'doctor'>('specialty');

    // Selection State
    const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
    const [appointmentTypesList, setAppointmentTypesList] = useState<AppointmentType[]>([]);
    const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState<User | null>(null);

    const currencySymbol = i18n.language === 'ar' ? 'د.ل' : 'LYD';

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [allSpecialties, allDoctors] = await Promise.all([
                    hospitals.getPublicSpecialties(),
                    users.getDoctors()
                ]);

                // Group specialties by hospital
                const grouped: Record<string, { hospitalId: string, specialties: Specialty[] }> = {};
                for (const spec of allSpecialties) {
                    if (spec.hospital) {
                        const hospitalName = getTranslatedName(spec.hospital.name);
                        if (!grouped[hospitalName]) {
                            grouped[hospitalName] = { hospitalId: spec.hospital._id, specialties: [] };
                        }
                        grouped[hospitalName].specialties.push(spec);
                    }
                }
                setSpecialtiesByHospital(grouped);
                setDoctors(allDoctors);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch data');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter Logic
    const filteredContent = useMemo(() => {
        const lowerQuery = searchQuery.toLowerCase();

        if (searchType === 'specialty') {
            if (!searchQuery) return specialtiesByHospital;
            const filtered: Record<string, { hospitalId: string, specialties: Specialty[] }> = {};
            for (const hospitalName in specialtiesByHospital) {
                const matchingSpecialties = specialtiesByHospital[hospitalName].specialties.filter(spec =>
                    getTranslatedName(spec.name).toLowerCase().includes(lowerQuery)
                );
                if (matchingSpecialties.length > 0) {
                    filtered[hospitalName] = { ...specialtiesByHospital[hospitalName], specialties: matchingSpecialties };
                }
            }
            return filtered;
        } else {
            // Doctor Search
            if (!searchQuery) return doctors;
            return doctors.filter(doc =>
                getTranslatedName(doc.name).toLowerCase().includes(lowerQuery) ||
                doc.specialties?.some(s => getTranslatedName(s.name).toLowerCase().includes(lowerQuery))
            );
        }
    }, [searchQuery, searchType, specialtiesByHospital, doctors]);

    // Fetch services when viewing a specialty detail
    useEffect(() => {
        if (selectedSpecialty?.hospital) {
            const fetchAppointmentTypes = async () => {
                try {
                    const typesData = await appointmentTypes.getBySpecialtyAndHospital(selectedSpecialty._id, selectedSpecialty.hospital._id);
                    setAppointmentTypesList(typesData);
                } catch (err) {
                    console.error("Failed to fetch types", err);
                }
            };
            fetchAppointmentTypes();
        } else {
            setAppointmentTypesList([]);
        }
    }, [selectedSpecialty]);

    const handleServiceSelect = (type: AppointmentType) => {
        if (!selectedDoctorForBooking) return;
        // Use the hospital associated with the selected service type
        onNavigateToBooking({
            specialtyId: type.specialty._id,
            hospitalId: type.hospital as string, // ID string
            appointmentTypeId: type._id,
            doctorId: selectedDoctorForBooking._id,
        });
        setSelectedDoctorForBooking(null);
    };

    const doctorsForSelectedSpecialty = useMemo(() => {
        if (!selectedSpecialty) return [];
        return doctors.filter(doc =>
            doc.specialties?.some(s => s._id === selectedSpecialty._id) &&
            doc.hospitals?.some(h => h._id === selectedSpecialty.hospital?._id)
        );
    }, [selectedSpecialty, doctors]);

    const ChevronIcon = i18n.dir() === 'ltr' ? ChevronRightIcon : ChevronLeftIcon;

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>;
    }

    if (selectedSpecialty) {
        return (
            <div className="space-y-8 animate-fade-in">
                <button onClick={() => setSelectedSpecialty(null)} className="flex items-center font-semibold text-gray-500 hover:text-primary transition-colors mb-4 group">
                    <div className="bg-white p-2 rounded-full shadow-sm me-2 group-hover:shadow-md transition-all">
                        {i18n.dir() === 'ltr' ? <ChevronLeftIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
                    </div>
                    {t('hospitals.backToDirectory')}
                </button>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                    <h1 className="text-2xl font-bold text-dark flex items-center">
                        <span className="bg-primary-light text-primary p-2 rounded-lg me-3">
                            <UserCircleIcon className="w-6 h-6" />
                        </span>
                        Doctors for {getTranslatedName(selectedSpecialty.name)}
                    </h1>
                    <p className="text-gray-500 mt-1 ms-14 flex items-center">
                        <BuildingOfficeIcon className="w-4 h-4 me-1" />
                        at {getTranslatedName(selectedSpecialty.hospital?.name)}
                    </p>
                </div>

                {doctorsForSelectedSpecialty.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {doctorsForSelectedSpecialty.map(doc => (
                            <div key={doc._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group">
                                <div className="p-5 flex items-center gap-4 border-b border-gray-50 bg-gradient-to-b from-white to-gray-50/50">
                                    <div className="relative">
                                        <img
                                            src={doc.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(getTranslatedName(doc.name))}&background=E6F0FF&color=006FEE`}
                                            alt={getTranslatedName(doc.name)}
                                            className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute bottom-0 right-0 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-dark truncate">{getTranslatedName(doc.name)}</h3>
                                        <p className="text-xs text-primary font-medium uppercase tracking-wide mt-0.5">{getTranslatedName(selectedSpecialty.name)}</p>
                                    </div>
                                </div>
                                <div className="p-5 bg-white flex-1 flex flex-col">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('hospitals.availableServices')}</h4>
                                    <div className="space-y-3 flex-1">
                                        {appointmentTypesList.length > 0 ? (
                                            appointmentTypesList.map(type => (
                                                <div key={type._id} className="group/item flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 hover:bg-blue-50 border border-transparent hover:border-blue-100 p-3 rounded-xl transition-all">
                                                    <div className="mb-2 sm:mb-0">
                                                        <p className="font-bold text-sm text-gray-800">{getTranslatedName(type.name)}</p>
                                                        <div className="flex items-center text-xs text-gray-500 mt-1"><ClockIcon className="w-3 h-3 me-1" />~{type.duration} mins</div>
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                                                        <p className="font-bold text-success">{type.cost.toFixed(0)} <span className="text-xs font-normal text-gray-500">{currencySymbol}</span></p>
                                                        <button
                                                            onClick={() => onNavigateToBooking({
                                                                specialtyId: selectedSpecialty._id,
                                                                hospitalId: selectedSpecialty.hospital!._id,
                                                                appointmentTypeId: type._id,
                                                                doctorId: doc._id,
                                                            })}
                                                            className="text-xs font-bold text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
                                                        >
                                                            {t('hospitals.book')}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200"><p className="text-sm text-gray-500">{t('hospitals.noServices')}</p></div>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : <div className="text-center py-16 text-gray-500 font-medium">No doctors found for this specialty.</div>}
            </div>
        )
    }

    // Main Search/Directory View
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Hero Search Section */}
            <div className="bg-gradient-to-r from-primary to-blue-600 rounded-3xl p-8 md:p-12 text-center text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl"></div>

                <h1 className="text-3xl md:text-4xl font-bold mb-4 relative z-10">{t('hospitals.findDoctorTitle')}</h1>
                <p className="text-blue-100 mb-8 max-w-2xl mx-auto relative z-10">{t('hospitals.findDoctorSubtitle')}</p>

                <div className="max-w-2xl mx-auto relative z-10">
                    <div className="bg-white p-2 rounded-2xl shadow-lg flex flex-col md:flex-row gap-2">
                        <div className="relative flex-grow">
                            <SearchIcon className="absolute start-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t(searchType === 'doctor' ? 'hospitals.searchDoctorPlaceholder' : 'hospitals.searchSpecialtyPlaceholder')}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full ps-14 pe-4 py-3 text-gray-800 text-lg rounded-xl focus:outline-none focus:ring-0 placeholder-gray-400 h-full"
                            />
                        </div>
                        <div className="flex bg-gray-100 rounded-xl p-1 shrink-0">
                            <button
                                onClick={() => setSearchType('specialty')}
                                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${searchType === 'specialty' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {t('hospitals.bySpecialty')}
                            </button>
                            <button
                                onClick={() => setSearchType('doctor')}
                                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${searchType === 'doctor' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {t('hospitals.byDoctor')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {searchType === 'specialty' ? (
                <div className="space-y-8">
                    {Object.keys(filteredContent as Record<string, any>).length > 0 ? Object.entries(filteredContent as Record<string, any>).map(([hospitalName, data]) => (
                        <div key={data.hospitalId} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center mb-6 pb-4 border-b border-gray-50">
                                <div className="p-2 bg-primary-light rounded-lg me-3 text-primary">
                                    <BuildingOfficeIcon className="w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-bold text-dark">{hospitalName}</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {data.specialties.map((spec: Specialty) => (
                                    <button key={spec._id} onClick={() => setSelectedSpecialty(spec)} className="text-start p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md hover:ring-2 hover:ring-primary-light transition-all duration-300 group relative overflow-hidden">
                                        <div className="flex items-center justify-between relative z-10">
                                            <p className="font-bold text-gray-700 group-hover:text-primary transition-colors">{getTranslatedName(spec.name)}</p>
                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-300 group-hover:text-primary group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all">
                                                <ChevronIcon className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                            <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No specialties found matching your search.</p>
                        </div>
                    )}
                </div>
            ) : (
                // Doctor Grid
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {(filteredContent as User[]).length > 0 ? (filteredContent as User[]).map(doc => (
                        <div key={doc._id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col items-center text-center relative overflow-hidden">
                            {/* Decorative Background */}
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-50 to-transparent opacity-50"></div>

                            <div className="relative mb-3">
                                <img
                                    src={doc.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(getTranslatedName(doc.name))}&background=E6F0FF&color=006FEE&size=128`}
                                    alt={getTranslatedName(doc.name)}
                                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>

                            <h3 className="font-bold text-lg text-dark mb-1">{getTranslatedName(doc.name)}</h3>
                            <div className="flex flex-wrap justify-center gap-1 mb-3">
                                {doc.specialties?.slice(0, 2).map(s => (
                                    <span key={s._id} className="text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                                        {getTranslatedName(s.name)}
                                    </span>
                                ))}
                            </div>

                            <p className="text-xs text-gray-500 flex items-center mb-6">
                                <BuildingOfficeIcon className="w-3 h-3 me-1 text-gray-400" />
                                {doc.hospitals && doc.hospitals.length > 0 ? getTranslatedName(doc.hospitals[0].name) : 'No Hospital'}
                            </p>

                            <button
                                onClick={() => setSelectedDoctorForBooking(doc)}
                                className="w-full py-2.5 bg-primary text-white rounded-xl font-bold shadow-sm hover:bg-primary-dark hover:shadow-md transition-all mt-auto"
                            >
                                {t('hospitals.book')}
                            </button>
                        </div>
                    )) : (
                        <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                            <UserCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No doctors found matching "{searchQuery}".</p>
                        </div>
                    )}
                </div>
            )}

            <ServiceSelectionModal
                doctor={selectedDoctorForBooking}
                isOpen={!!selectedDoctorForBooking}
                onClose={() => setSelectedDoctorForBooking(null)}
                onSelect={handleServiceSelect}
            />
        </div>
    );
};

export default Hospitals;

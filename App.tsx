
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './views/Auth';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Appointments from './components/Appointments';
import WaitingQueue from './components/WaitingQueue';
import Pharmacy from './components/Pharmacy';
import Reminders from './components/Reminders';
import Wallet from './components/Wallet';
import Emergency from './components/Emergency';
import Admin from './views/Admin';
import Hospitals from './views/Hospitals';
import Profile from './views/Profile';
import Specialties from './views/Specialties';
import { View } from './types';
import QueueHistory from './components/QueueHistory';
import Availability from './views/Availability';
import AppointmentTypes from './views/AppointmentTypes';
import Analytics from './components/Analytics';
import MedicalRecords from './components/MedicalRecords';
import PatientRegistration from './views/PatientRegistration';
import HospitalManagement from './views/HospitalManagement';
import Notifications from './views/Notifications';

interface BookingPrefill {
    specialtyId: string;
    hospitalId: string;
    appointmentTypeId: string;
    doctorId: string;
    patientId?: string; // Added patientId to prefill
}

const AppContent: React.FC = () => {
    const { isAuthenticated, isLoading, user } = useAuth();
    const [currentView, setCurrentView] = useState<View>(View.Dashboard);
    const { i18n, t } = useTranslation();
    const [bookingPrefill, setBookingPrefill] = useState<BookingPrefill | null>(null);
    const [prevAuthenticated, setPrevAuthenticated] = useState(false);

    useEffect(() => {
        if (isAuthenticated && !prevAuthenticated) {
            setCurrentView(View.Dashboard);
        }
        setPrevAuthenticated(isAuthenticated);
    }, [isAuthenticated, prevAuthenticated]);

    const handleNavigateToBooking = (prefillData: BookingPrefill) => {
        setBookingPrefill(prefillData);
        setCurrentView(View.Appointments);
    };

    const handleRegistrationSuccess = (prefillData: { patientId: string }) => {
        // Create a partial booking prefill with just the patient ID
        // The Appointments component logic handles the rest (finding patient object)
        setBookingPrefill(prefillData as any);
        setCurrentView(View.Appointments);
    };

    const handlePrefillConsumed = () => {
        setBookingPrefill(null);
    };

    const renderView = () => {
        switch (currentView) {
            case View.Dashboard:
                return <Dashboard setCurrentView={setCurrentView} />;
            case View.Appointments:
                return <Appointments bookingPrefill={bookingPrefill} onPrefillConsumed={handlePrefillConsumed} />;
            case View.Availability:
                return <Availability />;
            case View.WaitingQueue:
                return <WaitingQueue />;
            case View.QueueHistory:
                return <QueueHistory />;
            case View.Pharmacy:
                return <Pharmacy />;
            case View.Reminders:
                return <Reminders />;
            case View.Wallet:
                return <Wallet />;
            case View.Emergency:
                return <Emergency />;
            case View.Profile:
                return <Profile />;
            case View.Specialties:
                return <Specialties />;
            case View.AppointmentTypes:
                return <AppointmentTypes />;
            case View.Admin:
                return <Admin />;
            case View.Hospitals:
                return <Hospitals onNavigateToBooking={handleNavigateToBooking} />;
            case View.Analytics:
                return <Analytics />;
            case View.MedicalRecords:
                return <MedicalRecords />;
            case View.PatientRegistration:
                return <PatientRegistration onSuccessRedirect={handleRegistrationSuccess} />;
            case View.HospitalManagement:
                return <HospitalManagement />;
            case View.Notifications:
                return <Notifications />;
            default:
                return <Dashboard setCurrentView={setCurrentView} />;
        }
    };

    // This effect hook ensures that the document's direction and language attributes
    // are updated whenever the language changes, triggering a full UI re-render for RTL/LTR.
    useEffect(() => {
        document.documentElement.dir = i18n.dir();
        document.documentElement.lang = i18n.language;
    }, [i18n, i18n.language]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-gray-50">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Auth />;
    }

    // Get the current direction from the i18n instance to apply to the main container.
    const dir = i18n.dir();

    return (
        <div className={`flex h-screen bg-gray-50 text-gray-800`} dir={dir}>
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header currentView={currentView} setCurrentView={setCurrentView} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-8">
                    {renderView()}
                </main>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
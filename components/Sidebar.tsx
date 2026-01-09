
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from '../types';
import { useAuth } from '../context/AuthContext';
import { DashboardIcon, CalendarIcon, UsersIcon, PillIcon, WalletIcon, AlertTriangleIcon, LogoutIcon, UserManagementIcon, BuildingOfficeIcon, UserCircleIcon, ClipboardListIcon, HistoryIcon, CalendarCheckIcon, ClipboardDocumentListIcon, ChartBarIcon, DocumentTextIcon, UserPlusIcon, BellIcon } from './Icons';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const NavItem: React.FC<{
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 text-start transition-colors duration-200 ${
      isActive
        ? 'bg-primary text-white rounded-lg shadow-md'
        : 'text-gray-600 hover:bg-gray-100 hover:text-dark rounded-lg'
    }`}
  >
    <Icon className="w-6 h-6 me-3" />
    <span className="font-medium">{label}</span>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const allNavItems = [
    { view: View.Dashboard, icon: DashboardIcon, label: t('sidebar.dashboard'), roles: ['patient', 'doctor', 'hospital staff', 'hospital manager', 'super admin'] },
    { view: View.PatientRegistration, icon: UserPlusIcon, label: t('sidebar.patientRegistration'), roles: ['hospital staff', 'hospital manager', 'super admin'] },
    { view: View.Appointments, icon: CalendarIcon, label: t('sidebar.appointments'), roles: ['patient', 'doctor', 'hospital staff', 'hospital manager', 'super admin'] },
    { view: View.Availability, icon: CalendarCheckIcon, label: t('sidebar.availability'), roles: ['doctor', 'hospital manager', 'super admin'] },
    { view: View.WaitingQueue, icon: UsersIcon, label: t('sidebar.queue'), roles: ['patient', 'doctor', 'hospital staff', 'hospital manager', 'super admin'] },
    { view: View.QueueHistory, icon: HistoryIcon, label: t('sidebar.queueHistory'), roles: ['patient'] },
    { view: View.MedicalRecords, icon: DocumentTextIcon, label: t('sidebar.medicalRecords'), roles: ['patient'] },
    { view: View.Pharmacy, icon: PillIcon, label: t('sidebar.pharmacy'), roles: ['patient', 'doctor', 'hospital staff', 'hospital manager', 'super admin'] },
    { view: View.Wallet, icon: WalletIcon, label: t('sidebar.wallet'), roles: ['patient'] },
    { view: View.Emergency, icon: AlertTriangleIcon, label: t('sidebar.emergency'), roles: ['patient'] },
    { view: View.Profile, icon: UserCircleIcon, label: t('sidebar.profile'), roles: ['patient', 'doctor', 'hospital staff', 'hospital manager', 'super admin'] },
    { view: View.Specialties, icon: ClipboardListIcon, label: t('sidebar.specialties'), roles: ['hospital manager', 'super admin'] },
    { view: View.AppointmentTypes, icon: ClipboardDocumentListIcon, label: t('sidebar.appointmentTypes'), roles: ['hospital staff', 'hospital manager', 'super admin'] },
    { view: View.Notifications, icon: BellIcon, label: t('sidebar.notifications'), roles: ['hospital staff', 'hospital manager', 'super admin'] },
    { view: View.HospitalManagement, icon: BuildingOfficeIcon, label: t('sidebar.hospitalManagement'), roles: ['super admin'] },
    { view: View.Admin, icon: UserManagementIcon, label: t('sidebar.userManagement'), roles: ['hospital manager', 'super admin'] },
    { view: View.Hospitals, icon: BuildingOfficeIcon, label: t('sidebar.hospitals'), roles: ['patient', 'doctor', 'hospital staff', 'hospital manager', 'super admin'] },
    { view: View.Analytics, icon: ChartBarIcon, label: t('sidebar.analytics'), roles: ['hospital manager', 'super admin'] },
  ];

  const visibleNavItems = user ? allNavItems.filter(item => item.roles.includes(user.role)) : [];

  return (
    <aside className="w-64 bg-white border-e h-screen flex flex-col p-4 shrink-0">
      <div className="flex items-center mb-8 px-2">
        <h1 className="text-2xl font-bold text-primary">MyClinic</h1>
      </div>
      <nav className="flex-grow space-y-2">
        {visibleNavItems.map((item) => (
          <NavItem
            key={item.view}
            icon={item.icon}
            label={item.label}
            isActive={currentView === item.view}
            onClick={() => setCurrentView(item.view)}
          />
        ))}
      </nav>
      <div className="mt-auto">
         <NavItem
            icon={LogoutIcon}
            label={t('sidebar.logout')}
            isActive={false}
            onClick={logout}
          />
      </div>
    </aside>
  );
};

export default Sidebar;
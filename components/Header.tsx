import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
// FIX: Imported `ChevronRightIcon` to resolve a "Cannot find name" error.
import { SearchIcon, BellIcon, MenuIcon, CalendarIcon, PillIcon, WalletIcon, CheckCircleIcon, ChevronDownIcon, LogoutIcon, ChevronLeftIcon, ChevronRightIcon, CameraIcon } from './Icons';
import { useAuth } from '../context/AuthContext';
import { Notification, View } from '../types';
import { notifications, users } from '../utils/api';
import { getTranslatedName } from '../utils/translation';

const LanguageSwitcher: React.FC = () => {
    const { i18n, t } = useTranslation();
    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLang = e.target.value;
        i18n.changeLanguage(newLang);
        // Persist selection so subsequent sessions load the same locale
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('language', newLang);
        }
        // Update dir attribute on the root element for app-wide effect
        document.documentElement.dir = i18n.dir(newLang);
        document.documentElement.lang = newLang;
    };

    useEffect(() => {
        // Set initial direction
        document.documentElement.dir = i18n.dir();
        document.documentElement.lang = i18n.language;
    }, [i18n, i18n.language]);
    
    return (
        <select
            onChange={handleLanguageChange}
            value={i18n.language}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-white"
        >
            <option value="en">{t('header.english')}</option>
            <option value="ar">{t('header.arabic')}</option>
        </select>
    );
};

// Simple relative time formatter
const formatDistanceToNow = (dateString: string, i18n: any) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });

    if (seconds < 60) return rtf.format(-seconds, 'second');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return rtf.format(-minutes, 'minute');
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return rtf.format(-hours, 'hour');
    const days = Math.floor(hours / 24);
    return rtf.format(-days, 'day');
};

interface HeaderProps {
    currentView: View;
    setCurrentView: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView }) => {
  const { user, logout, updateUser } = useAuth();
  const { t, i18n } = useTranslation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  const notificationsPanelRef = useRef<HTMLDivElement>(null);
  const profilePanelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isActive = true;
    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const data = await notifications.getAll();
            if (!isActive) return;
            setNotificationsList(data);
        } catch (error) {
            console.error(error);
        } finally {
            if (!isActive) return;
            setIsLoading(false);
        }
    };
    fetchNotifications();
    return () => {
        isActive = false;
    };
  }, [i18n.language]);

    useEffect(() => {
        // Left empty intentionally: notifications panel now opened via dedicated view
    }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsPanelRef.current && !notificationsPanelRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profilePanelRef.current && !profilePanelRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const unreadCount = notificationsList.filter(n => !n.isRead).length;

  const handleMarkAllRead = async () => {
      try {
          await notifications.markAsRead();
          setNotificationsList(notificationsList.map(n => ({ ...n, isRead: true })));
      } catch (error) {
          console.error(error);
      }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
        case 'appointment': return <CalendarIcon className="w-5 h-5 text-primary" />;
        case 'reminder': return <PillIcon className="w-5 h-5 text-secondary" />;
        case 'wallet': return <WalletIcon className="w-5 h-5 text-success" />;
        default: return <BellIcon className="w-5 h-5 text-gray-500" />;
    }
  };
  
  const handleAvatarClick = () => {
      fileInputRef.current?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64String = reader.result as string;
          setIsUploading(true);
          try {
              const updatedUser = await users.updateAvatar(base64String);
              updateUser(updatedUser);
          } catch (error) {
              console.error("Failed to upload avatar", error);
          } finally {
              setIsUploading(false);
          }
      };
      reader.readAsDataURL(file);
  };


  return (
    <header className="flex items-center justify-between p-6 bg-white border-b">
      <div className="flex items-center">
        <button className="text-gray-500 focus:outline-none lg:hidden">
          <MenuIcon className="w-6 h-6" />
        </button>
        {currentView !== View.Dashboard && (
            <button 
                onClick={() => setCurrentView(View.Dashboard)}
                className="flex items-center text-sm font-medium text-gray-600 hover:text-primary transition-colors duration-200 me-4"
            >
                <ChevronLeftIcon className="w-5 h-5 rtl:hidden" />
                <ChevronRightIcon className="w-5 h-5 ltr:hidden" />
                {t('sidebar.dashboard')}
            </button>
        )}
        <div className="relative ms-4 hidden md:block">
            <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder={t('header.searchPlaceholder')} className="ps-10 pe-4 py-2 w-64 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light bg-white" />
        </div>
      </div>
      <div className="flex items-center space-x-4 rtl:space-x-reverse">
        <LanguageSwitcher />
        <div className="relative" ref={notificationsPanelRef}>
            <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="relative text-gray-500 hover:text-primary">
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 end-0 h-2.5 w-2.5 bg-danger rounded-full border-2 border-white"></span>
                )}
            </button>
            {isNotificationsOpen && (
                <div className="absolute end-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-20">
                    <div className="p-3 flex justify-between items-center border-b">
                        <h3 className="font-semibold text-gray-700">{t('notifications.title')}</h3>
                        <button onClick={handleMarkAllRead} disabled={unreadCount === 0} className="text-xs text-primary hover:underline disabled:text-gray-400 disabled:cursor-not-allowed">{t('notifications.markAllAsRead')}</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-gray-500">{t('common.loading')}</div>
                        ) : notificationsList.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">{t('notifications.noNotifications')}</div>
                        ) : (
                           notificationsList.map(n => (
                            <div key={n._id} className={`flex items-start p-3 hover:bg-gray-50 ${!n.isRead ? 'bg-primary-light' : ''}`}>
                                <div className="flex-shrink-0 mt-1">{getNotificationIcon(n.type)}</div>
                                <div className="ms-3 w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900">{getTranslatedName(n.title)}</p>
                                    <p className="text-sm text-gray-800">{getTranslatedName(n.message)}</p>
                                    <p className="mt-1 text-xs text-gray-500">{formatDistanceToNow(n.createdAt, i18n)}</p>
                                </div>
                                {!n.isRead && (
                                    <div className="ms-2 flex-shrink-0 h-full flex items-center">
                                        <span className="h-2 w-2 bg-primary rounded-full"></span>
                                    </div>
                                )}
                            </div>
                           ))
                        )}
                    </div>
                </div>
            )}
        </div>
        <div className="relative" ref={profilePanelRef}>
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center cursor-pointer">
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name.en || 'User'}&background=006FEE&color=fff`}
              alt="User Avatar"
              className="w-10 h-10 rounded-full object-cover"
            />
            {user && (
              <div className="ms-3 hidden md:block text-start">
                  <p className="font-semibold text-dark">{getTranslatedName(user.name)}</p>
                  <p className="text-xs text-primary capitalize font-medium">{user.role}</p>
              </div>
            )}
            <ChevronDownIcon className="w-4 h-4 text-gray-500 ms-2" />
          </button>
           {isProfileOpen && user && (
                <div className="absolute end-0 mt-2 w-72 bg-white rounded-md shadow-xl border z-20">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept="image/png, image/jpeg" 
                    />
                    <div className="p-4 border-b flex flex-col items-center">
                        <div className="relative group">
                            <img
                                src={user.avatar || `https://ui-avatars.com/api/?name=${user.name.en}&background=E6F0FF&color=006FEE&size=96`}
                                alt="User Avatar"
                                className="w-24 h-24 rounded-full object-cover mb-2 border-4 border-white shadow-md"
                            />
                             <button
                                onClick={handleAvatarClick}
                                disabled={isUploading}
                                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full transition-opacity duration-300"
                                aria-label="Change profile picture"
                            >
                                {isUploading ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                ) : (
                                    <CameraIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100" />
                                )}
                            </button>
                        </div>
                        <p className="font-semibold text-lg text-dark truncate mt-2">{getTranslatedName(user.name)}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                    <div className="p-2">
                         <button
                            onClick={logout}
                            className="flex items-center w-full px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50 hover:text-red-700 font-medium"
                          >
                            <LogoutIcon className="w-5 h-5 me-2" />
                            {t('sidebar.logout')}
                          </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;
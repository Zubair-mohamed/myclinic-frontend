
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { User } from '../types';
import { auth, wallet } from '../utils/api';

interface AuthState {
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
    error: string | null;
}

interface AuthContextType extends AuthState {
    register: (name: string, email: string, phone: string, password: string) => Promise<void>;
    verifyRegistration: (email: string, otp: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        token: localStorage.getItem('token'),
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
    });

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setState({
            token: null,
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: null,
        });
    }, []);

    useEffect(() => {
        const verifyUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Make API call to verify token and get fresh user data
                    const data = await auth.me();
                    if (data && data.user) {
                        const user = data.user;

                        // Update user in localStorage with fresh data
                        localStorage.setItem('user', JSON.stringify(user));

                        setState(prevState => ({
                            ...prevState,
                            isAuthenticated: true,
                            isLoading: false,
                            user,
                            token,
                        }));


                        // Ensure user has a wallet (backend handles this now)
                        // await ensureWalletExists();
                    } else {
                        // Response was ok but didn't contain a user for some reason
                        logout();
                    }
                } catch (error) {
                    // Token is invalid or expired (apiFetch throws on 401), log the user out
                    logout();
                }
            } else {
                // No token, so not logged in
                setState(prevState => ({
                    ...prevState,
                    isAuthenticated: false,
                    isLoading: false,
                    user: null,
                    token: null,
                }));
            }
        };
        verifyUser();
    }, [logout]);

    useEffect(() => {
        // Listen for custom event to handle 401 errors from apiFetch
        const handleAuthError = () => {
            logout();
        };
        window.addEventListener('auth-error', handleAuthError);
        return () => {
            window.removeEventListener('auth-error', handleAuthError);
        };
    }, [logout]);

    const updateUser = (user: User) => {
        localStorage.setItem('user', JSON.stringify(user));
        setState(prevState => ({
            ...prevState,
            user,
        }));
    };

    // Helper function to ensure user has a wallet
    // const ensureWalletExists = async () => {
    //     try {
    //         await wallet.get();
    //     } catch (error) {
    //         // Backend handles creation now
    //     }
    // };

    const register = async (name: string, email: string, phone: string, password: string) => {
        try {
            await auth.register({ name, email, password, phone });
            // Registration now requires OTP verification, so we don't log the user in here.
            // The Auth component will handle switching to the OTP view.
        } catch (err: any) {
            setState({ ...state, error: err.message });
            throw err;
        }
    };

    const verifyRegistration = async (email: string, otp: string) => {
        try {
            const data = await auth.verifyRegistration({ email, otp });

            if (data.token) localStorage.setItem('token', data.token);
            if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
            if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

            setState({
                ...state,
                token: data.token,
                user: data.user,
                isAuthenticated: true,
                error: null,
            });

            // Create a wallet for the newly registered user if they don't have one
            // Note: Backend now creates wallet on registration, so we just verify if needed or rely on backend.
            // try {
            //     await wallet.create();
            // } catch (walletError) {
            //     console.warn('Failed to create wallet for user:', walletError);
            // }
        } catch (err: any) {
            setState({ ...state, error: err.message });
            throw err;
        }
    };


    const login = async (email: string, password: string) => {
        try {
            const data = await auth.login({ email, password });

            if (data.token) localStorage.setItem('token', data.token);
            if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
            if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

            setState({
                ...state,
                token: data.token,
                user: data.user,
                isAuthenticated: true,
                error: null,
            });


            // Ensure user has a wallet (backed handles this now)
            // await ensureWalletExists();
        } catch (err: any) {
            setState({ ...state, error: err.message });
            throw err;
        }
    };

    return (
        <AuthContext.Provider value={{ ...state, register, verifyRegistration, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

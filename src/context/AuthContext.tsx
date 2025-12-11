// src/context/AuthContext.tsx
'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { AuthService } from '../lib/AuthService';
import { User } from '../lib/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  sendOtp: (phoneNumber: string, countryCode?: string) => Promise<any>;
  verifyOtp: (phoneNumber: string, countryCode: string, otp: string) => Promise<any>;
  loginWithTruecaller: (truecallerData: any) => Promise<any>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  fetchUserProfile: () => Promise<User | null>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      console.log('🔍 [AuthContext] Checking auth status...');
      
      const authStatus = await AuthService.checkAuthStatus();
      
      console.log('📊 [AuthContext] Auth status result:', {
        isAuthenticated: authStatus.isAuthenticated,
        hasUser: !!authStatus.user,
        userId: authStatus.user?._id || authStatus.user?.id,
      });
      
      setIsAuthenticated(authStatus.isAuthenticated);
      if (authStatus.user) {
        setUser(authStatus.user);
      }
    } catch (error) {
      console.error('❌ [AuthContext] Auth check error:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      console.log('📡 [AuthContext] Fetching user profile...');

      const response = await apiClient.get('/users/profile');

      if (response.data.success && response.data.data) {
        const userData = response.data.data;
        
        // Ensure both _id and id exist
        if (userData._id && !userData.id) {
          userData.id = userData._id;
        } else if (userData.id && !userData._id) {
          userData._id = userData.id;
        }
        
        console.log('✅ [AuthContext] User profile fetched:', userData.name, 'ID:', userData._id);
        setUser(userData);
        setIsAuthenticated(true);
        await AuthService.storeUser(userData);
        return userData;
      } else {
        throw new Error('Failed to fetch profile');
      }
    } catch (error: any) {
      console.error('❌ [AuthContext] Fetch profile error:', error);
      setError(error.message);
      return null;
    }
  };

  const sendOtp = async (phoneNumber: string, countryCode = '91') => {
    try {
      setLoading(true);
      setError(null);
      console.log('📞 [AuthContext] Sending OTP...');
      const result = await AuthService.sendOtp(phoneNumber, countryCode);
      return result;
    } catch (error: any) {
      console.error('❌ [AuthContext] Send OTP error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (phoneNumber: string, countryCode: string, otp: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔐 [AuthContext] Verifying OTP...');
      
      // AuthService.verifyOtp now fetches full profile
      const result = await AuthService.verifyOtp(phoneNumber, countryCode, otp);

      if (result.success) {
        console.log('✅ [AuthContext] OTP verified successfully');
        
        // Set user from full profile
        if (result.data?.user) {
          console.log('👤 [AuthContext] Setting user:', result.data.user.name, 'ID:', result.data.user._id);
          setUser(result.data.user);
        }
        setIsAuthenticated(true);
        
        // Verify tokens are in storage
        const storedToken = localStorage.getItem('accessToken');
        console.log('🔍 [AuthContext] Token verification:', storedToken ? 'Found ✅' : 'NOT FOUND ❌');
      }

      return result;
    } catch (error: any) {
      console.error('❌ [AuthContext] Verify OTP error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithTruecaller = async (truecallerData: any) => {
    try {
      setLoading(true);
      setError(null);
      console.log('📱 [AuthContext] Truecaller login...');
      
      const result = await AuthService.verifyTruecaller(truecallerData);

      if (result.success) {
        console.log('✅ [AuthContext] Truecaller login successful');
        
        if (result.data.user) {
          setUser(result.data.user);
        }
        setIsAuthenticated(true);
      }

      return result;
    } catch (error: any) {
      console.error('❌ [AuthContext] Truecaller error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('👋 [AuthContext] Logging out...');
      await AuthService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('❌ [AuthContext] Logout error:', error);
    }
  };

  const clearError = () => setError(null);

  const refreshUser = async () => {
    const updatedUser = await AuthService.refreshUserProfile();
    if (updatedUser) {
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        error,
        sendOtp,
        verifyOtp,
        loginWithTruecaller,
        logout,
        checkAuthStatus,
        fetchUserProfile,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

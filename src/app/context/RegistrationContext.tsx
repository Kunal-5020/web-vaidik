'use client';

import React, { createContext, useContext, useReducer, useCallback, useMemo, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { registrationService } from '../../registraion/registration.service';
import { storageService } from '../../registraion/storage.service';
import { STORAGE_KEYS } from '../../registraion/constants';

// --- TYPES ---
export type Step = 'PHONE' | 'OTP' | 'FORM' | 'SUCCESS' | 'STATUS';

interface RegistrationData {
  name?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  skills?: string[];
  languagesKnown?: string[]; // Note: FormWizard uses 'languages', ensure naming consistency
  profilePicture?: File | null;
  [key: string]: any;
}

interface State {
  step: Step;
  phoneNumber: string;
  countryCode: string;
  isOtpSent: boolean;
  isOtpVerified: boolean;
  existingRegistration: any | null;
  registrationData: RegistrationData;
  ticketNumber: string | null;
  isLoading: boolean;
  error: string | null;
}

// --- INITIAL STATE ---
const initialState: State = {
  step: 'PHONE',
  phoneNumber: '',
  countryCode: '91',
  isOtpSent: false,
  isOtpVerified: false,
  existingRegistration: null,
  registrationData: {},
  ticketNumber: null,
  isLoading: false,
  error: null,
};

// --- REDUCER ---
function reducer(state: State, action: any): State {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_PHONE':
      return {
        ...state,
        phoneNumber: action.payload.phone,
        countryCode: action.payload.code,
      };
    case 'OTP_SENT':
      return { ...state, isOtpSent: true, step: 'OTP' };
    case 'OTP_VERIFIED':
      return {
        ...state,
        isOtpVerified: true,
        existingRegistration: action.payload.existingRegistration || null,
        // If existing user, go to STATUS, else FORM
        step: action.payload.existingRegistration ? 'STATUS' : 'FORM'
      };
    case 'SET_REGISTRATION_DATA':
       // Deep clone to prevent reference issues
      const newData = JSON.parse(JSON.stringify(action.payload)); 
      return { ...state, registrationData: { ...state.registrationData, ...newData } };
    case 'SET_TICKET':
      return { ...state, ticketNumber: action.payload, step: 'SUCCESS' };
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// --- CONTEXT ---
const RegistrationContext = createContext<any>(null);

export const RegistrationProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const verifyOtpInProgress = useRef(false);

  // Load persisted data on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      const savedPhone = await storageService.getObject<{phoneNumber: string, countryCode: string}>(STORAGE_KEYS.PHONE_NUMBER);
      if (savedPhone) {
        dispatch({ type: 'SET_PHONE', payload: { phone: savedPhone.phoneNumber, code: savedPhone.countryCode } });
      }
      
      const savedData = await storageService.getObject(STORAGE_KEYS.REGISTRATION_DATA);
      if (savedData) {
        dispatch({ type: 'SET_REGISTRATION_DATA', payload: savedData });
      }
    };
    loadPersistedData();
  }, []);

  // Helper to extract errors
  const getErrorMessage = (error: any) => {
    return error.formattedMessage || error.message || 'An error occurred';
  };

  // 1. Send OTP
  const sendOtp = useCallback(async (phone: string, code: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const response = await registrationService.sendOtp({ phoneNumber: phone, countryCode: code });
      
      if (response.success) {
        const phoneData = { phoneNumber: phone, countryCode: code };
        await storageService.setObject(STORAGE_KEYS.PHONE_NUMBER, phoneData);
        
        dispatch({ type: 'SET_PHONE', payload: { phone, code } });
        dispatch({ type: 'OTP_SENT', payload: true });
        toast.success('OTP Sent Successfully');
      }
    } catch (error: any) {
      const msg = getErrorMessage(error);
      toast.error(msg);
      dispatch({ type: 'SET_ERROR', payload: msg });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // 2. Verify OTP
 // 2. Verify OTP (web)
const verifyOtp = useCallback(async (otp: string) => {
  if (verifyOtpInProgress.current) return;

  verifyOtpInProgress.current = true;
  dispatch({ type: 'SET_LOADING', payload: true });
  
  try {
    const response = await registrationService.verifyOtp({
      phoneNumber: state.phoneNumber,
      countryCode: state.countryCode,
      otp,
    });

    if (response.success && response.data?.data?.isValid) {
      const { isNewUser, existingRegistration } = response.data.data;

      dispatch({
        type: 'OTP_VERIFIED',
        payload: { isNewUser, existingRegistration },
      });

      // Branch flow: existing vs new
      if (existingRegistration) {
        // Already registered → show STATUS screen
        dispatch({ type: 'SET_STEP', payload: 'STATUS' });
        toast.success('You are already registered. Showing your status.');
      } else {
        // New user → show FORM
        dispatch({ type: 'SET_STEP', payload: 'FORM' });
        toast.success('OTP Verified. Please complete your registration.');
      }
    } else {
      throw new Error('Invalid OTP');
    }
  } catch (error: any) {
    const msg = getErrorMessage(error);
    toast.error(msg || 'Invalid OTP');
    dispatch({ type: 'SET_ERROR', payload: msg });
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
    verifyOtpInProgress.current = false;
  }
}, [state.phoneNumber, state.countryCode]);


  // 3. Save Data Locally (for multi-step form)
  const saveRegistrationData = useCallback(async (data: any) => {
    // Merge provided data with existing state data
    const mergedData = { ...state.registrationData, ...data };
    
    dispatch({ type: 'SET_REGISTRATION_DATA', payload: mergedData });
    await storageService.setObject(STORAGE_KEYS.REGISTRATION_DATA, mergedData);
  }, [state.registrationData]);

  // 4. Submit Final Registration
  const submitRegistration = useCallback(async (finalData?: any) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Use passed data or fall back to state
      const dataToSubmit = { ...state.registrationData, ...(finalData || {}) };
      
      // Ensure phone/code are present
      if (!dataToSubmit.phoneNumber) dataToSubmit.phoneNumber = state.phoneNumber;
      if (!dataToSubmit.countryCode) dataToSubmit.countryCode = state.countryCode;

      // Transform arrays/fields if necessary to match API expectation
      // Example: Your UI sends 'languages', API might want 'languagesKnown'
      if (dataToSubmit.languages && !dataToSubmit.languagesKnown) {
        dataToSubmit.languagesKnown = dataToSubmit.languages;
      }

      console.log('Submitting payload:', dataToSubmit);
      
      const response = await registrationService.register(dataToSubmit);

      if (response.success) {
        const ticket = response.data.ticketNumber || `AST-${Date.now()}`; // Fallback if API doesn't return ticket
        dispatch({ type: 'SET_TICKET', payload: ticket });
        await storageService.setItem(STORAGE_KEYS.TICKET_NUMBER, ticket);
        // Clear temp data
        await storageService.removeItem(STORAGE_KEYS.REGISTRATION_DATA);
        toast.success('Registration Submitted!');
      }
    } catch (error: any) {
      const msg = getErrorMessage(error);
      toast.error(msg);
      dispatch({ type: 'SET_ERROR', payload: msg });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.registrationData, state.phoneNumber, state.countryCode]);

  // 5. Utility: Set Step Manually
  const setStep = useCallback((step: Step) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  const value = useMemo(() => ({
    state,
    dispatch, // Expose dispatch if components need raw access
    sendOtp,
    verifyOtp,
    saveRegistrationData, // Use this in FormWizard instead of updateData if possible
    submitRegistration,
    setStep
  }), [state, sendOtp, verifyOtp, saveRegistrationData, submitRegistration, setStep]);

  return (
    <RegistrationContext.Provider value={value}>
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistration must be used within RegistrationProvider');
  }
  return context;
};
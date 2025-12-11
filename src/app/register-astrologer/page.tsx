'use client';

import React from 'react';
import { RegistrationProvider, useRegistration } from '../context/RegistrationContext';
import PhoneStep from './steps/PhoneStep';
import OtpStep from './steps/OtpStep';
import FormWizard from './steps/FormWizard';
import SuccessStep from './steps/SuccessStep';
import StatusScreen from './steps/StatusScreen';

function RegisterContent() {
  const { state } = useRegistration();

  const renderStep = () => {
    switch (state.step) {
      case 'PHONE': return <PhoneStep />;
      case 'OTP': return <OtpStep />;
      case 'FORM': return <FormWizard />;
      case 'SUCCESS': return <SuccessStep />;
      case 'STATUS': return <StatusScreen data={state.existingRegistration} />;
      default: return <PhoneStep />;
    }
  };

  return (
    <div className="min-h-[calc(100vh-96px)] flex items-start justify-center pt-6 pb-10">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] border border-slate-100 px-6 py-7 sm:px-8 sm:py-8">
        {renderStep()}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <RegistrationProvider>
      <RegisterContent />
    </RegistrationProvider>
  );
}
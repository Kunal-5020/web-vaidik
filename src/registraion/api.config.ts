const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const API_ENDPOINTS = {
  SEND_OTP: '/registration/otp/send',
  VERIFY_OTP: '/registration/otp/verify',
  REGISTER: '/registration/register',
  CHECK_STATUS_TICKET: '/registration/status/ticket',
  CHECK_STATUS_PHONE: '/registration/status/phone',
};

export { BASE_URL };
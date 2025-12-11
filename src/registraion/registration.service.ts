// services/api/registration.service.ts
import { apiClient } from '../lib/api';
import { API_ENDPOINTS } from './api.config';

class RegistrationService {
  /**
   * Helper: Extract error message from response
   */
  private extractErrorMessage(error: any): string {
    if (!error.response?.data) {
      return error.message || 'An error occurred';
    }

    const data = error.response.data;

    // Handle array of messages
    if (Array.isArray(data.message)) {
      return data.message.join(', ');
    }

    // Handle nested validation errors
    if (data.errors && Array.isArray(data.errors)) {
      return data.errors.map((e: any) => e.message || e).join(', ');
    }

    // Handle string message
    if (typeof data.message === 'string') {
      return data.message;
    }

    return data.error || error.message || 'Registration failed';
  }

  async sendOtp(data: { phoneNumber: string; countryCode: string }) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.SEND_OTP, data);
      return { success: true, data: response.data };
    } catch (error: any) {
      error.formattedMessage = this.extractErrorMessage(error);
      throw error;
    }
  }

  async verifyOtp(data: { phoneNumber: string; countryCode: string; otp: string }) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.VERIFY_OTP, data);
      return { success: true, data: response.data };
    } catch (error: any) {
      error.formattedMessage = this.extractErrorMessage(error);
      throw error;
    }
  }

  async register(data: any) {
    try {
      // Handle FormData for file uploads if profilePicture is a File object
      let payload = data;
      let headers = {};

      if (data.profilePicture instanceof File) {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (key === 'skills' || key === 'languagesKnown') {
                // Append arrays correctly for FormData
                data[key].forEach((item: string) => formData.append(`${key}[]`, item));
            } else {
                formData.append(key, data[key]);
            }
        });
        payload = formData;
        headers = { 'Content-Type': 'multipart/form-data' };
      }

      const response = await apiClient.post(API_ENDPOINTS.REGISTER, payload, { headers });
      return { success: true, data: response.data };
    } catch (error: any) {
      error.formattedMessage = this.extractErrorMessage(error);
      throw error;
    }
  }

  async checkStatusByTicket(ticketNumber: string) {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.CHECK_STATUS_TICKET}/${ticketNumber}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      error.formattedMessage = this.extractErrorMessage(error);
      throw error;
    }
  }
}

export const registrationService = new RegistrationService();
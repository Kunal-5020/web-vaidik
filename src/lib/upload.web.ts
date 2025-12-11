import { apiClient } from './api';

export interface UploadResponse {
  url: string;
  s3Key: string | null;
}

export class UploadService {
  /**
   * Upload image from web browser
   */
  async uploadImage(file: File): Promise<UploadResponse> {
    try {
      console.log('📤 Uploading image:', file.name);

      const formData = new FormData();
      // Web browsers use File object directly - no uri/type wrapper needed
      formData.append('file', file);

      const response = await apiClient.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          console.log(`Upload Progress: ${percentCompleted}%`);
        },
      });

      console.log('✅ Upload Response:', response.data);

      if (response.data.success) {
        const uploadedUrl: string = response.data.data.url;

        if (!uploadedUrl) {
          throw new Error('No URL returned from upload service');
        }

        return {
          url: uploadedUrl,
          s3Key: response.data.data.s3Key || response.data.data.key || null,
        };
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('❌ Image Upload Failed:', {
        message: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(files: File[]): Promise<UploadResponse[]> {
    try {
      const uploads = files.map((file) => this.uploadImage(file));
      return await Promise.all(uploads);
    } catch (error) {
      console.error('❌ Multiple Upload Failed:', error);
      throw error;
    }
  }
}

export const uploadService = new UploadService();

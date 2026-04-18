// src/services/CloudinaryService.ts

import { CloudinaryUploadResult } from '@/types';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

class CloudinaryService {
  private cloudName: string;
  private uploadPreset: string;

  constructor() {
    this.cloudName = CLOUDINARY_CLOUD_NAME;
    this.uploadPreset = UPLOAD_PRESET;
  }

  /**
   * Upload image with automatic optimization
   */
  async uploadImage(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', 'chatgram/images');
    
    // Automatic optimizations
    formData.append('quality', 'auto:good');
    formData.append('fetch_format', 'auto');
    
    return this.upload(formData, onProgress);
  }

  /**
   * Upload video with compression
   */
  async uploadVideo(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', 'chatgram/videos');
    formData.append('resource_type', 'video');
    
    // Video optimizations
    formData.append('quality', 'auto');
    formData.append('fetch_format', 'auto');
    
    return this.upload(formData, onProgress);
  }

  /**
   * Upload audio file
   */
  async uploadAudio(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', 'chatgram/audio');
    formData.append('resource_type', 'video'); // Audio uses video resource type
    
    return this.upload(formData, onProgress);
  }

  /**
   * Upload general file
   */
  async uploadFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', 'chatgram/files');
    formData.append('resource_type', 'raw');
    
    return this.upload(formData, onProgress);
  }

  /**
   * Core upload function with progress tracking
   */
  private upload(
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(Math.round(progress));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(this.formatResponse(response));
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`);
      xhr.send(formData);
    });
  }

  /**
   * Format Cloudinary response
   */
  private formatResponse(response: any): CloudinaryUploadResult {
    return {
      public_id: response.public_id,
      secure_url: response.secure_url,
      resource_type: response.resource_type,
      format: response.format,
      width: response.width,
      height: response.height,
      duration: response.duration,
      bytes: response.bytes,
      thumbnail_url: response.thumbnail_url,
    };
  }

  /**
   * Generate optimized image URL with transformations
   */
  getOptimizedImageUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: 'fill' | 'fit' | 'scale' | 'thumb';
      quality?: 'auto' | number;
      format?: 'auto' | 'jpg' | 'png' | 'webp';
    } = {}
  ): string {
    const {
      width,
      height,
      crop = 'fill',
      quality = 'auto',
      format = 'auto',
    } = options;

    const transformations = [];
    
    if (width || height) {
      transformations.push(`c_${crop}`);
      if (width) transformations.push(`w_${width}`);
      if (height) transformations.push(`h_${height}`);
    }
    
    transformations.push(`q_${quality}`);
    transformations.push(`f_${format}`);

    const transformString = transformations.join(',');
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transformString}/${publicId}`;
  }

  /**
   * Generate blur-up placeholder (LQIP)
   */
  getBlurPlaceholder(publicId: string): string {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/w_50,h_50,q_auto:low,e_blur:1000,f_auto/${publicId}`;
  }

  /**
   * Generate video thumbnail
   */
  getVideoThumbnail(publicId: string, timeOffset: number = 0): string {
    return `https://res.cloudinary.com/${this.cloudName}/video/upload/so_${timeOffset},w_400,h_300,c_fill,q_auto,f_jpg/${publicId}.jpg`;
  }

  /**
   * Delete media from Cloudinary
   */
  async deleteMedia(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<boolean> {
    try {
      // Note: Deletion requires server-side implementation with API secret
      // This is a placeholder - implement on your backend
      const response = await fetch('/api/cloudinary/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId, resourceType }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error deleting media:', error);
      return false;
    }
  }
}

export const cloudinaryService = new CloudinaryService();

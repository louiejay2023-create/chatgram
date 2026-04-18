// src/components/settings/UserSettings.tsx

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { cloudinaryService } from '@/services/CloudinaryService';
import { X, Camera, User, Mail, Key, LogOut } from 'lucide-react';

interface UserSettingsProps {
  onClose: () => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ onClose }) => {
  const { user, updateUserProfile, signOut } = useAuth();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /**
   * Handle profile photo upload
   */
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    try {
      setUploading(true);
      const result = await cloudinaryService.uploadImage(file, setUploadProgress);
      
      await updateUserProfile({
        photoURL: result.secure_url,
      });

      setMessage({ type: 'success', text: 'Profile photo updated!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload photo' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handle profile update
   */
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      // Update display name if changed
      if (displayName !== user.displayName) {
        await updateUserProfile({ displayName });
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        
        const currentUser = auth.currentUser;
        if (currentUser) {
          await updatePassword(currentUser, newPassword);
        }
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Success/Error Message */}
          {message && (
            <div
              className={`p-4 rounded-lg border ${
                message.type === 'success'
                  ? 'bg-green-500/10 border-green-500/50 text-green-400'
                  : 'bg-red-500/10 border-red-500/50 text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Profile Photo Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Profile Photo</h3>
            
            <div className="flex items-center gap-6">
              <div className="relative">
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-24 h-24 rounded-full border-4 border-purple-500"
                />
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="text-white text-xs">{uploadProgress}%</div>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <label
                  htmlFor="photo-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition text-white cursor-pointer ${
                    uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Camera className="w-5 h-5" />
                  {uploading ? 'Uploading...' : 'Change Photo'}
                </label>
                <p className="text-sm text-gray-400 mt-2">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
            </div>

            {uploading && (
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Profile Information Form */}
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Your name"
                  required
                />
              </div>
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={user.email}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-400 cursor-not-allowed"
                  disabled
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed
              </p>
            </div>

            {/* Change Password */}
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">
                Change Password
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Leave blank to keep current"
                      minLength={6}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Confirm new password"
                      minLength={6}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving || uploading}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition text-white"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="pt-6 border-t border-white/10">
            <h3 className="text-lg font-semibold text-red-400 mb-4">
              Danger Zone
            </h3>
            <button
              onClick={signOut}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 rounded-lg transition text-red-400 font-medium flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;

'use client';
import React, { useState } from 'react';
import { useRegistration } from '../../context/RegistrationContext';
import { uploadService } from '../../../lib/upload.web';
import toast from 'react-hot-toast';

const SKILLS = ['Vedic', 'Numerology', 'Tarot', 'Palmistry', 'Vastu', 'Kundli'];
const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada'];

export default function SingleFormWizard() {
  const { submitRegistration, state } = useRegistration();
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    gender: '',
    languages: [] as string[],
    skills: [] as string[],
    phoneModel: '',
    email: '',
    profilePicture: null as File | null,
    profilePictureUrl: '',
    previewUrl: '',
  });

  const updateData = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, previewUrl, profilePicture: file }));

    setIsUploading(true);
    try {
      const result = await uploadService.uploadImage(file);
      setFormData(prev => ({ ...prev, profilePictureUrl: result.url }));
      toast.success('Image uploaded successfully!');
    } catch {
      toast.error('Failed to upload image. Please try again.');
      URL.revokeObjectURL(previewUrl);
      setFormData(prev => ({ ...prev, previewUrl: '', profilePicture: null }));
    } finally {
      setIsUploading(false);
    }
  };

  const isValid = () => {
    if (!formData.name.trim()) return false;
    if (!formData.dateOfBirth) return false;
    if (!formData.gender) return false;
    if (formData.languages.length === 0) return false;
    if (formData.skills.length === 0) return false;
    if (!formData.phoneModel) return false;
    if (!formData.profilePictureUrl) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid()) {
      toast.error('Please fill all required fields');
      return;
    }
    if (isUploading) {
      toast.error('Please wait for image upload to finish');
      return;
    }

    const payload = {
      name: formData.name,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      // Map to API shape
      languagesKnown: formData.languages,
      skills: formData.skills,
      email: formData.email,
      profilePicture: formData.profilePictureUrl,
      deviceType: formData.phoneModel,
    };

    try {
      await submitRegistration(payload);
      toast.success('Registration submitted successfully');
    } catch (err: any) {
      toast.error(err.formattedMessage || 'Registration failed');
    }
  };

  // Cleanup preview URL
  React.useEffect(() => {
    return () => {
      if (formData.previewUrl) URL.revokeObjectURL(formData.previewUrl);
    };
  }, [formData.previewUrl]);

   return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-800">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#5b2b84] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5b2b84]/15"
          placeholder="Enter your name"
          value={formData.name}
          onChange={e => updateData('name', e.target.value)}
        />
      </div>

      {/* DOB */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-800">
          Date of Birth <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-[#5b2b84] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5b2b84]/15"
          value={formData.dateOfBirth}
          max={new Date().toISOString().split('T')[0]}
          onChange={e => updateData('dateOfBirth', e.target.value)}
        />
      </div>

      {/* Gender */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-800">
          Gender <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {['Male', 'Female', 'Other'].map(g => {
            const value = g.toLowerCase();
            const selected = formData.gender === value;
            return (
              <button
                type="button"
                key={g}
                onClick={() => updateData('gender', value)}
                className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                  selected
                    ? 'border-[#5b2b84] bg-purple-50 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                    selected
                      ? 'border-[#5b2b84] bg-[#5b2b84]'
                      : 'border-slate-300'
                  }`}
                />
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Languages */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-800">
          Languages You Speak <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => {
            const selected = formData.languages.includes(lang);
            return (
              <button
                key={lang}
                type="button"
                onClick={() =>
                  updateData(
                    'languages',
                    selected
                      ? formData.languages.filter(l => l !== lang)
                      : [...formData.languages, lang]
                  )
                }
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  selected
                    ? 'bg-[#5b2b84] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-800">
          Your Expertise <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SKILLS.map(skill => {
            const selected = formData.skills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() =>
                  updateData(
                    'skills',
                    selected
                      ? formData.skills.filter(s => s !== skill)
                      : [...formData.skills, skill]
                  )
                }
                className={`rounded-2xl border px-3 py-2 text-left text-sm transition ${
                  selected
                    ? 'border-[#5b2b84] bg-[#5b2b84] text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {selected ? '✓ ' : '+ '} {skill}
              </button>
            );
          })}
        </div>
      </div>

      {/* Phone model */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-800">
          Phone Model <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {['Android', 'iPhone'].map(model => {
            const selected = formData.phoneModel === model;
            return (
              <button
                key={model}
                type="button"
                onClick={() => updateData('phoneModel', model)}
                className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                  selected
                    ? 'border-[#5b2b84] bg-purple-50 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{model}</span>
                {selected && <span className="text-[#5b2b84] font-semibold">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-800">
          Email <span className="text-xs font-normal text-slate-400">(optional)</span>
        </label>
        <input
          type="email"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#5b2b84] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5b2b84]/15"
          placeholder="you@example.com"
          value={formData.email}
          onChange={e => updateData('email', e.target.value)}
        />
      </div>

      {/* Photo */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-800">
          Profile Picture <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-slate-500">
          A clear photo helps clients recognize and trust you.
        </p>
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 rounded-full border-2 border-[#5b2b84] bg-slate-100 overflow-hidden">
            {formData.previewUrl ? (
              <img
                src={formData.previewUrl}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl text-slate-400">
                📸
              </div>
            )}
          </div>
          <label
            className={`inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#5b2b84] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#4a236b] ${
              isUploading && 'opacity-50 cursor-not-allowed'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Upload Photo'}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
            />
          </label>
        </div>
        <p className="text-[11px] text-slate-400">
          JPG, PNG, WEBP – max 5MB.
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid() || state.isLoading || isUploading}
        className="mt-2 w-full rounded-2xl bg-[#5b2b84] py-3 text-sm font-semibold text-white shadow-md shadow-purple-200 transition hover:bg-[#4a236b] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {state.isLoading || isUploading ? 'Submitting...' : 'Submit Registration'}
      </button>
    </form>
  );
}
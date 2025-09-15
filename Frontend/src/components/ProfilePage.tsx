import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Github, FileText, Plus, X, Save, Loader } from 'lucide-react';
import { useRequireAuth } from '../utils/auth';

interface UserProfile {
  id?: number;
  name: string;
  phone: string;
  email: string;
  github: string;
  resumes: string[];
}
const emptyProfile = { name: '', phone: '', email: '', github: '', resumes: [''] };

const ProfilePage: React.FC = () => {
  useRequireAuth(); // Ensure user is authenticated
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/profiles', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
      const data = await res.json();
      setProfiles(data);
      if (data.length > 0 && activeProfileId === null) setActiveProfileId(data[0].id);
    } catch {
      setError('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSelect = (id: number) => {
    setActiveProfileId(id);
    setEditingProfile(null);
    setError('');
    setSuccess('');
  };

  const handleEdit = (profile: UserProfile) => {
    setEditingProfile(profile);
    setError('');
    setSuccess('');
  };

  const handleCreateNewProfile = () => {
    setEditingProfile({ ...emptyProfile }); // No id
    setError('');
    setSuccess('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingProfile) {
      setEditingProfile({ ...editingProfile, [e.target.name]: e.target.value });
    } else {
      // Initialize editingProfile if null (for new profile creation)
      setEditingProfile({ ...emptyProfile, [e.target.name]: e.target.value });
    }
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleResumeChange = (idx: number, value: string) => {
    if (editingProfile) {
      const resumes = [...editingProfile.resumes];
      resumes[idx] = value;
      setEditingProfile({ ...editingProfile, resumes });
    }
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const addResume = () => {
    if (editingProfile) {
      setEditingProfile({ ...editingProfile, resumes: [...editingProfile.resumes, ''] });
    }
  };

  const removeResume = (idx: number) => {
    if (editingProfile && editingProfile.resumes.length > 1) {
      const resumes = editingProfile.resumes.filter((_, i) => i !== idx);
      setEditingProfile({ ...editingProfile, resumes });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const profileToSave = { ...editingProfile };
      const isNew = !profileToSave.id || typeof profileToSave.id !== 'number' || isNaN(profileToSave.id);

      let response;
      if (isNew) {
        // CREATE
        delete profileToSave.id;
        response = await fetch('http://localhost:8000/profiles', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profileToSave),
        });
      } else {
        // UPDATE
        response = await fetch(`http://localhost:8000/profiles/${profileToSave.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profileToSave),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      setSuccess(isNew ? 'Profile created successfully!' : 'Profile updated successfully!');
      fetchProfiles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save profile. Please try again.');
      console.error('Profile save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/profiles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete profile');
      }

      setSuccess('Profile deleted successfully!');
      fetchProfiles(); // Refresh profiles list

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete profile. Please try again.');
      console.error('Profile delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/70">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-white/70">Manage your personal information and default resume templates</p>
        </div>

        {/* Profile List and Form */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
          {/* Profile List */}
          <div className="p-6 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Your Profiles</h2>

            <div className="space-y-4">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200
                  ${activeProfileId === profile.id ? 'bg-blue-500/10 border-blue-500' : 'bg-white/5 border-transparent'}`}
                  onClick={() => handleProfileSelect(profile.id!)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">{profile.name || 'Untitled Profile'}</h3>
                      <p className="text-white/70 text-sm">
                        {profile.email && <span>{profile.email} • </span>}
                        {profile.phone && <span>{profile.phone} • </span>}
                        {profile.github && <span>{profile.github}</span>}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(profile); }}
                        className="text-blue-500 hover:text-blue-400 transition-colors p-2 rounded"
                        title="Edit Profile"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232a3 3 0 00-4.464 0L3 13.536V17h3.464l7.768-7.768a3 3 0 000-4.464z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(profile.id!); }}
                        className="text-red-500 hover:text-red-400 transition-colors p-2 rounded"
                        title="Delete Profile"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Profile Form - Edit or Create */}
          <div className="p-8">
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={handleCreateNewProfile}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all duration-200"
              >
                + Create New Profile
              </button>
            </div>

            <h2 className="text-xl font-semibold text-white mb-4">
              {editingProfile ? 'Edit Profile' : 'Create New Profile'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Status Messages */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-100 text-sm animate-fade-in">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-green-100 text-sm animate-fade-in">
                  {success}
                </div>
              )}

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-white/90 mb-2">
                    <User className="inline h-4 w-4 mr-2" />
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={editingProfile?.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-white/90 mb-2">
                    <Phone className="inline h-4 w-4 mr-2" />
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={editingProfile?.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                    <Mail className="inline h-4 w-4 mr-2" />
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={editingProfile?.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your email address"
                  />
                </div>

                <div>
                  <label htmlFor="github" className="block text-sm font-medium text-white/90 mb-2">
                    <Github className="inline h-4 w-4 mr-2" />
                    GitHub URL
                  </label>
                  <input
                    id="github"
                    name="github"
                    type="url"
                    value={editingProfile?.github}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="https://github.com/username"
                  />
                </div>
              </div>

              {/* Default Resumes Section */}
              <div className="border-t border-white/20 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-white/90">
                    <FileText className="inline h-4 w-4 mr-2" />
                    Default Resume Templates
                  </label>
                  <button
                    type="button"
                    onClick={addResume}
                    className="bg-white/10 backdrop-blur-sm text-white px-3 py-2 rounded-lg font-medium hover:bg-white/20 transition-all duration-200 flex items-center space-x-2 border border-white/20"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Resume</span>
                  </button>
                </div>

                <p className="text-white/60 text-sm mb-4">
                  Save your default resume templates here to quickly select them when creating new optimized resumes.
                </p>

                <div className="space-y-4">
                  {editingProfile?.resumes.map((resume, idx) => (
                    <div key={idx} className="bg-black/20 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white font-medium">Resume Template #{idx + 1}</h4>
                        {editingProfile.resumes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeResume(idx)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-red-500/20"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <textarea
                        value={resume}
                        onChange={(e) => handleResumeChange(idx, e.target.value)}
                        rows={8}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                        placeholder={`Enter your resume template content here...

Example:
John Doe
Software Engineer

Contact Information:
Email: john.doe@email.com
Phone: (555) 123-4567
LinkedIn: linkedin.com/in/johndoe

Professional Summary:
Experienced software engineer with...`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
                >
                  {saving ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Save Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
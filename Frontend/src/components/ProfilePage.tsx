import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Github, FileText, Plus, X, Save, Loader } from 'lucide-react';

const initialProfile = {
  name: '',
  phone: '',
  email: '',
  github: '',
  resumes: [''],
};

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Fetch profile from API
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        
        const data = await response.json();
        setProfile({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          github: data.github || '',
          resumes: Array.isArray(data.resumes) && data.resumes.length > 0 ? data.resumes : [''],
        });
      } catch (err) {
        setError('Failed to load profile');
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleResumeChange = (idx: number, value: string) => {
    const resumes = [...profile.resumes];
    resumes[idx] = value;
    setProfile({ ...profile, resumes });
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const addResume = () => {
    setProfile({ ...profile, resumes: [...profile.resumes, ''] });
  };

  const removeResume = (idx: number) => {
    if (profile.resumes.length > 1) {
      const resumes = profile.resumes.filter((_, i) => i !== idx);
      setProfile({ ...profile, resumes });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save profile');
      }
      
      setSuccess('Profile updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save profile. Please try again.');
      console.error('Profile save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/70">Loading profile...</p>
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

        {/* Profile Form */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">Personal Information</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
                  value={profile.name}
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
                  value={profile.phone}
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
                  value={profile.email}
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
                  value={profile.github}
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
                {profile.resumes.map((resume, idx) => (
                  <div key={idx} className="bg-black/20 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">Resume Template #{idx + 1}</h4>
                      {profile.resumes.length > 1 && (
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
  );
};

export default ProfilePage;
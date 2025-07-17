import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Calendar, Building, TrendingUp, Star, Eye } from 'lucide-react';
import { api } from '../utils/api';
import { Resume } from '../types/types';
import { useRequireAuth } from '../utils/auth';

const Dashboard: React.FC = () => {
  useRequireAuth(); // Ensure user is authenticated
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const data = await api.getResumes();
        setResumes(data);
      } catch (error) {
        console.error('Failed to fetch resumes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 80) return 'text-yellow-400';
    if (score >= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-500/20 border-green-500/30';
    if (score >= 80) return 'bg-yellow-500/20 border-yellow-500/30';
    if (score >= 70) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-white/70">Track your resume optimizations and performance</p>
            </div>
            <Link
              to="/optimizer"
              className="mt-4 sm:mt-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 inline-flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>New Resume</span>
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total Resumes</p>
                <p className="text-2xl font-bold text-white">{resumes.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Avg ATS Score</p>
                <p className="text-2xl font-bold text-white">
                  {resumes.length > 0 
                    ? Math.round(resumes.reduce((sum, r) => sum + (r.atsScore || 0), 0) / resumes.length)
                    : 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Optimized</p>
                <p className="text-2xl font-bold text-white">
                  {resumes.filter(r => r.status === 'optimized').length}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Resume List */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">Your Resumes</h2>
          </div>
          
          {resumes.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No resumes yet</h3>
              <p className="text-white/70 mb-6">Get started by creating your first optimized resume</p>
              <Link
                to="/optimizer"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 inline-flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Create Resume</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/20">
              {resumes.map((resume) => (
                <div key={resume.id} className="p-6 hover:bg-white/5 transition-all duration-200 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-3 rounded-lg">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">{resume.role}</h3>
                        <div className="flex items-center space-x-4 text-sm text-white/70">
                          <div className="flex items-center space-x-1">
                            <Building className="h-4 w-4" />
                            <span>{resume.companyName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(resume.date)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {resume.atsScore && (
                        <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getScoreBgColor(resume.atsScore)}`}>
                          <span className={getScoreColor(resume.atsScore)}>
                            ATS: {resume.atsScore}%
                          </span>
                        </div>
                      )}
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        resume.status === 'optimized' 
                          ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                          : 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                      }`}>
                        {resume.status === 'optimized' ? 'Optimized' : 'Generated'}
                      </div>
                      <Link
                        to={`/resume/${resume.id}`}
                        className="opacity-0 group-hover:opacity-100 bg-white/10 backdrop-blur-sm text-white px-3 py-2 rounded-lg font-medium hover:bg-white/20 transition-all duration-200 flex items-center space-x-2 border border-white/20"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
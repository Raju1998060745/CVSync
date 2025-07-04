import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Building, Calendar, TrendingUp, Download, Share2, Edit } from 'lucide-react';
import { api } from '../utils/api';
import { Resume } from '../types/types';

const ResumePreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResume = async () => {
      if (!id) {
        setError('Resume ID not found');
        setLoading(false);
        return;
      }

      try {
        const data = await api.getResumeById(id);
        setResume(data);
      } catch (error) {
        console.error('Failed to fetch resume:', error);
        setError('Failed to load resume');
      } finally {
        setLoading(false);
      }
    };

    fetchResume();
  }, [id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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

  const handleDownload = () => {
    if (!resume) return;
    
    const element = document.createElement('a');
    const file = new Blob([resume.content || ''], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${resume.role}_${resume.companyName}_Resume.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleShare = async () => {
    if (navigator.share && resume) {
      try {
        await navigator.share({
          title: `${resume.role} Resume for ${resume.companyName}`,
          text: `Check out my optimized resume for ${resume.role} at ${resume.companyName}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 text-white/40 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Resume Not Found</h2>
          <p className="text-white/70 mb-6">{error || 'The resume you\'re looking for doesn\'t exist.'}</p>
          <Link
            to="/dashboard"
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 inline-flex items-center space-x-2"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Dashboard</span>
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{resume.role}</h1>
              <div className="flex items-center space-x-6 text-white/70">
                <div className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>{resume.companyName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>{formatDate(resume.date)}</span>
                </div>
                {resume.atsScore && (
                  <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getScoreBgColor(resume.atsScore)}`}>
                    <TrendingUp className="inline h-4 w-4 mr-1" />
                    <span className={getScoreColor(resume.atsScore)}>
                      ATS: {resume.atsScore}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4 mt-6 lg:mt-0">
              <button
                onClick={handleShare}
                className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium hover:bg-white/20 transition-all duration-200 flex items-center space-x-2 border border-white/20"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
              <button
                onClick={handleDownload}
                className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium hover:bg-white/20 transition-all duration-200 flex items-center space-x-2 border border-white/20"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
              <Link
                to="/optimizer"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Create New</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Resume Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Resume Details Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 sticky top-8">
              <h3 className="text-lg font-semibold text-white mb-4">Resume Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white/70">Status</label>
                  <div className={`mt-1 px-3 py-1 rounded-full text-sm font-medium inline-block ${
                    resume.status === 'optimized' 
                      ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                      : 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                  }`}>
                    {resume.status === 'optimized' ? 'Optimized' : 'Generated'}
                  </div>
                </div>
                
                {resume.atsScore && (
                  <div>
                    <label className="text-sm font-medium text-white/70">ATS Score</label>
                    <div className="mt-1">
                      <div className="flex items-center space-x-2">
                        <div className={`text-2xl font-bold ${getScoreColor(resume.atsScore)}`}>
                          {resume.atsScore}%
                        </div>
                        <div className="flex-1 bg-white/10 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              resume.atsScore >= 90 ? 'bg-green-400' :
                              resume.atsScore >= 80 ? 'bg-yellow-400' :
                              resume.atsScore >= 70 ? 'bg-orange-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${resume.atsScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-white/70">Created</label>
                  <div className="mt-1 text-white">{formatDate(resume.date)}</div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-white/70">Company</label>
                  <div className="mt-1 text-white">{resume.companyName}</div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-white/70">Position</label>
                  <div className="mt-1 text-white">{resume.role}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Resume Content */}
          <div className="lg:col-span-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-white/20">
                <h3 className="text-xl font-semibold text-white">Resume Content</h3>
              </div>
              
              <div className="p-8">
                <div className="bg-white rounded-lg p-8 shadow-lg">
                  <div className="prose prose-gray max-w-none">
                    <pre className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed font-sans">
                      {resume.content || 'Resume content not available.'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumePreview;
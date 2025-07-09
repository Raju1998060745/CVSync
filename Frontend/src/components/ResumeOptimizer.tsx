import React, { useState, useEffect } from 'react';
import { FileText, Building, User, Briefcase, Zap, TrendingUp, CheckCircle, Plus, ChevronDown, Check } from 'lucide-react';
import { api } from '../utils/api';
import { Resume } from '../types/types';
import { useNavigate } from 'react-router-dom';

interface OptimizationState {
  step: 'input' | 'generating' | 'preview' | 'scoring' | 'optimizing' | 'final';
  generatedResume?: string;
  optimizedResume?: string;
  atsScore?: number;
  optimizedScore?: number;
  resumeId?: string;
  selectedResumeType?: "optimized" | "generated";
}

const ResumeOptimizer: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    roleName: '',
    jobDescription: '',
    currentResume: '',
    useExistingResume: false,
    selectedResumeId: ''
  });
  const [state, setState] = useState<OptimizationState>({ step: 'input' });
  const [existingResumes, setExistingResumes] = useState<Resume[]>([]);
  const [showResumeDropdown, setShowResumeDropdown] = useState(false);
  const [defaultResumes, setDefaultResumes] = useState<string[]>([]);

  useEffect(() => {
    // Fetch default resumes from profile
    const fetchDefaultResumes = async () => {
      try {
        const res = await fetch('http://localhost:8000/profile');
        const data = await res.json();
        setDefaultResumes(Array.isArray(data.resumes) ? data.resumes : []);
      } catch (err) {
        setDefaultResumes([]);
      }
    };
    fetchDefaultResumes();

    const fetchResumes = async () => {
      try {
        const resumes = await api.getResumes();
        setExistingResumes(resumes);
      } catch (error) {
        console.error('Failed to fetch resumes:', error);
      }
    };
    fetchResumes();
  }, []);

  const handleGenerate = async () => {
    setState({ step: 'generating' });
    // Only send the required fields to the API
    const payload = {
      job_description: formData.jobDescription,
      current_resume: formData.currentResume,
      companyName: formData.companyName,
      role: formData.roleName
    };
    try {
      const response = await api.generateResume(payload);
      setState({
        step: 'preview',
        generatedResume: response.generatedResume,
        resumeId: response.id
      });
    } catch (error) {
      console.error('Failed to generate resume:', error);
      setState({ step: 'input' });
    }
  };

  const handleCheckATS = async () => {
    setState({ ...state, step: 'scoring' });

    const payload = {

      job_description: formData.jobDescription,
      resume: existingResumes.find(r => r.id === formData.selectedResumeId)?.content || formData.currentResume,
    };
    
    try {
      const response = await api.checkATSScore(payload);
      setState({
        ...state,
        step: 'preview',
        atsScore: response.atsScore
      });
    } catch (error) {
      console.error('Failed to check ATS score:', error);
    }
  };

  const handleOptimize = async () => {
    setState({ ...state, step: 'optimizing' });

    const payload = {
      job_description: formData.jobDescription,
      resume: existingResumes.find(r => r.id === formData.selectedResumeId)?.content || formData.currentResume,
    };

    try {
      const response = await api.optimizeResume(payload);
      setState({
        ...state,
        step: 'final',
        optimizedResume: response.optimizedResume,
        optimizedScore: response.finalScore
      });
    } catch (error) {
      console.error('Failed to optimize resume:', error);
    }
  };

  const handleSelectResume = (type: "optimized" | "generated") => {
    setState({ ...state, selectedResumeType: type });
  };

  const handleFinalize = async () => {
    const payload = {
      id: String(state.resumeId!),
      status: state.selectedResumeType!,
      atsscore: state.atsScore,
      optimizedscore: state.optimizedScore,
      optimizedResume: state.optimizedResume,
      generatedResume: state.generatedResume,
    };
    try {
      // Save the selected resume
      await api.saveSelectedResume(payload);
      // Navigate to dashboard or show success message
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to save resume:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      companyName: '',
      roleName: '',
      jobDescription: '',
      currentResume: '',
      useExistingResume: false,
      selectedResumeId: ''
    });
    setState({ step: 'input' });
  };

  const handleExistingResumeSelect = (resume: Resume) => {
    setFormData({
      ...formData,
      selectedResumeId: resume.id,
      currentResume: resume.content || ''
    });
    setShowResumeDropdown(false);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Resume Optimizer</h1>
          <p className="text-white/70">Transform your resume with AI-powered optimization</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              state.step === 'input' ? 'bg-blue-500/20 border border-blue-500/30' : 
              'bg-white/10 border border-white/20'
            }`}>
              <FileText className="h-5 w-5 text-white" />
              <span className="text-white">Input</span>
            </div>
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              ['generating', 'preview'].includes(state.step) ? 'bg-blue-500/20 border border-blue-500/30' : 
              'bg-white/10 border border-white/20'
            }`}>
              <Zap className="h-5 w-5 text-white" />
              <span className="text-white">Generate</span>
            </div>
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              ['scoring', 'optimizing', 'final'].includes(state.step) ? 'bg-blue-500/20 border border-blue-500/30' : 
              'bg-white/10 border border-white/20'
            }`}>
              <TrendingUp className="h-5 w-5 text-white" />
              <span className="text-white">Optimize</span>
            </div>
          </div>
        </div>

        {/* Input Form */}
        {state.step === 'input' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    <Building className="inline h-4 w-4 mr-2" />
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="e.g., Google, Microsoft, Apple"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    <User className="inline h-4 w-4 mr-2" />
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={formData.roleName}
                    onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="e.g., Senior Software Engineer, Product Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    <Briefcase className="inline h-4 w-4 mr-2" />
                    Job Description
                  </label>
                  <textarea
                    value={formData.jobDescription}
                    onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    placeholder="Paste the job description here..."
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-white/90">
                    <FileText className="inline h-4 w-4 mr-2" />
                    Resume Content
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="useExisting"
                      checked={formData.useExistingResume}
                      onChange={(e) => setFormData({ ...formData, useExistingResume: e.target.checked, currentResume: e.target.checked ? formData.currentResume : '' })}
                      className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500"
                    />
                    <label htmlFor="useExisting" className="text-sm text-white/90">
                      Use existing resume
                    </label>
                  </div>
                </div>

                {formData.useExistingResume ? (
                  <div className="space-y-4">
                    <div className="relative mb-4">
                      <button
                        type="button"
                        onClick={() => setShowResumeDropdown(!showResumeDropdown)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 flex items-center justify-between"
                      >
                        <span>
                          {formData.selectedResumeId
                            ? existingResumes.find(r => r.id === formData.selectedResumeId)?.role + ' - ' + existingResumes.find(r => r.id === formData.selectedResumeId)?.companyName
                            : 'Select an existing resume'}
                        </span>
                        <ChevronDown className="h-5 w-5" />
                      </button>
                      {showResumeDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {existingResumes.map((resume) => (
                            <button
                              key={resume.id}
                              onClick={() => handleExistingResumeSelect(resume)}
                              className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
                            >
                              <div className="text-white font-medium">{resume.role}</div>
                              <div className="text-white/70 text-sm">{resume.companyName} • {new Date(resume.date).toLocaleDateString()}</div>
                            </button>
                          ))}
                          {/* Default resumes from profile */}
                          {defaultResumes.length > 0 && <div className="border-t border-white/20 my-2"></div>}
                          {defaultResumes.map((resume, idx) => (
                            <button
                              key={`default-${idx}`}
                              onClick={() => {
                                setFormData({ ...formData, selectedResumeId: `default-${idx}`, currentResume: resume });
                                setShowResumeDropdown(false);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
                            >
                              <div className="text-white font-medium">Default Resume #{idx + 1}</div>
                              <div className="text-white/70 text-xs">From Profile</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {formData.selectedResumeId && (
                      <div className="bg-black/20 rounded-lg p-4 border border-white/10 max-h-60 overflow-y-auto">
                        <pre className="text-white/90 whitespace-pre-wrap text-sm leading-relaxed">
                          {formData.currentResume}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={formData.currentResume}
                    onChange={(e) => setFormData({ ...formData, currentResume: e.target.value })}
                    rows={15}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    placeholder="Paste your current resume content here..."
                  />
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={handleGenerate}
                disabled={!formData.companyName || !formData.roleName || !formData.jobDescription || !formData.currentResume}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
              >
                <Zap className="h-5 w-5" />
                <span>Generate Resume</span>
              </button>
            </div>
          </div>
        )}

        {/* Generating State */}
        {state.step === 'generating' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-12 border border-white/20 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">Generating Your Resume</h3>
            <p className="text-white/70">Our AI is crafting a tailored resume for your target role...</p>
          </div>
        )}

        {/* Preview State */}
        {state.step === 'preview' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4">Generated Resume</h3>
              <div className="bg-black/20 rounded-lg p-6 border border-white/10">
                <pre className="text-white/90 whitespace-pre-wrap text-sm leading-relaxed">
                  {state.generatedResume}
                </pre>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              {!state.atsScore ? (
                <button
                  onClick={handleCheckATS}
                  className="bg-gradient-to-r from-cyan-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-cyan-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
                >
                  <TrendingUp className="h-5 w-5" />
                  <span>Check ATS Score</span>
                </button>
              ) : (
                <div className="flex items-center space-x-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white mb-1">{state.atsScore}%</div>
                      <div className="text-sm text-white/70">ATS Score</div>
                    </div>
                  </div>
                  <button
                    onClick={handleOptimize}
                    className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-green-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
                  >
                    <Zap className="h-5 w-5" />
                    <span>Optimize Resume</span>
                  </button>
                  <button
                    onClick={async () => {
                      const payload = {
                        id: String(state.resumeId!),
                        status: 'generated',
                        atsscore: state.atsScore,
                        optimizedscore: null,
                        generatedResume: state.generatedResume,
                      };
                      try {
                        await api.saveSelectedResume(payload);
                        navigate('/dashboard');
                      } catch (error) {
                        console.error('Failed to save resume:', error);
                      }
                    }}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
                  >
                    <Check className="h-5 w-5" />
                    <span>Keep Generated Resume</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scoring State */}
        {state.step === 'scoring' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-12 border border-white/20 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">Analyzing ATS Score</h3>
            <p className="text-white/70">Checking how well your resume matches the job requirements...</p>
          </div>
        )}

        {/* Optimizing State */}
        {state.step === 'optimizing' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-12 border border-white/20 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">Optimizing Your Resume</h3>
            <p className="text-white/70">Enhancing your resume for better ATS compatibility...</p>
          </div>
        )}

        {/* Final State - Resume Selection */}
        {state.step === 'final' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-white mb-2">Choose Your Final Resume</h3>
              <p className="text-white/70">Select which version you'd like to save and use</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Generated Resume Option */}
              <div 
                className={`bg-white/10 backdrop-blur-sm rounded-xl p-6 border cursor-pointer transition-all duration-300 ${
                  state.selectedResumeType ===  'generated'
                    ? 'border-blue-500/50 bg-blue-500/10' 
                    : 'border-white/20 hover:border-white/40'
                }`}
                onClick={() => handleSelectResume('generated')}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">Generated Resume</h4>
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-500/20 border border-blue-500/30 px-3 py-1 rounded-full text-sm font-medium text-blue-400">
                      ATS: {state.atsScore}%
                    </div>
                    {state.selectedResumeType === 'generated' && (
                      <div className="bg-blue-500 rounded-full p-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-black/20 rounded-lg p-4 border border-white/10 max-h-96 overflow-y-auto">
                  <pre className="text-white/90 whitespace-pre-wrap text-sm leading-relaxed">
                    {state.generatedResume}
                  </pre>
                </div>
              </div>

              {/* Optimized Resume Option */}
              <div 
                className={`bg-white/10 backdrop-blur-sm rounded-xl p-6 border cursor-pointer transition-all duration-300 ${
                  state.selectedResumeType ===  'optimized'
                    ? 'border-green-500/50 bg-green-500/10' 
                    : 'border-white/20 hover:border-white/40'
                }`}
                onClick={() => handleSelectResume('optimized')}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">Optimized Resume</h4>
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-500/20 border border-green-500/30 px-3 py-1 rounded-full text-sm font-medium text-green-400">
                      ATS: {state.optimizedScore}%
                    </div>
                    {state.selectedResumeType === 'optimized' && (
                      <div className="bg-green-500 rounded-full p-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-black/20 rounded-lg p-4 border border-white/10 max-h-96 overflow-y-auto">
                  <pre className="text-white/90 whitespace-pre-wrap text-sm leading-relaxed">
                    {state.optimizedResume}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={resetForm}
                className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all duration-300 border border-white/20 flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Create New Resume</span>
              </button>
              <button
                onClick={handleFinalize}
                disabled={!state.selectedResumeType}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
              >
                <CheckCircle className="h-5 w-5" />
                <span>Save Selected Resume</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeOptimizer;
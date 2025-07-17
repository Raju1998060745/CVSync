import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Building, Calendar, TrendingUp, Download, Share2, Edit } from 'lucide-react';
import { api } from '../utils/api';
import { Resume } from '../types/types';
import { useRequireAuth } from '../utils/auth';

/* ─────────────────────────  StructuredResume  ───────────────────────── */
function StructuredResume({ raw }: { raw: unknown }) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data) return <p>Resume content not available.</p>;

  const { name, contact, profile, experience, projects } = data as any;

  return (
    <article className="prose max-w-none font-sans text-gray-900">
      {/* HEADER */}
      <header className="text-center border-b-4 border-blue-800 pb-3 mb-6">
        <h1 className="text-3xl font-bold text-blue-800 m-0">{name}</h1>
        {contact && (
          <p className="text-xs text-gray-300">
            {contact.phone}
            {contact.email && <> | {contact.email}</>}
            {contact.linkedin && (
              <>
                {' '}| LinkedIn:&nbsp;
                <a
                  href={`https://linkedin.com/in/${contact.linkedin}`}
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {contact.linkedin}
                </a>
              </>
            )}
          </p>
        )}
      </header>

      {/* SUMMARY */}
      <section>
        <h2 className="inline-block border-b-4  border-blue-800  pb-1 mb-4 text-blue-800 uppercase tracking-wide font-bold">Summary</h2>
        <p>{profile.summary}</p>
      </section>

      {/* SKILLS */}
      <section>
        <h2 className="inline-block border-b-4  border-blue-800  pb-1 mb-4 text-blue-800 uppercase tracking-wide font-bold">Skills</h2>
        {Object.entries(profile.skills).map(([cat, items]) => (
          <p key={cat}>
            <strong>{cat}:</strong> {(items as string[]).join(', ')}
          </p>
        ))}
      </section>

      {/* CORE COMPETENCIES */}
      <section>
        <h2 className="inline-block border-b-4  border-blue-800  pb-1 mb-4 text-blue-800 uppercase tracking-wide font-bold">Core Competencies</h2>
        <ul className="list-disc ml-5">
          {profile.core_competencies.map((c: string) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      {/* EXPERIENCE */}
      <section>
        <h2 className="inline-block border-b-4  border-blue-800  pb-1 mb-4 text-blue-800 uppercase tracking-wide font-bold">Work Experience</h2>
        {experience.map((job: any) => (
          <div key={`${job.company}-${job.title}`} className="mb-4">
            <h3 className="font-semibold">
              {job.title} — {job.company}
            </h3>
            <p className="italic text-xs text-gray-600">
              {job.location} | {job.start_date} – {job.end_date || 'Present'}
            </p>
            <ul className="list-disc ml-5">
              {job.responsibilities.map((r: string) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* PROJECTS (optional) */}
      {projects && projects.length > 0 && (
        <section>
          <h2 className="text-blue-800 uppercase tracking-wide font-bold">Projects</h2>
          {projects.map((p: any) => (
            <div key={p.name} className="mb-4">
              <h3 className="font-semibold">{p.name}</h3>
              <p className="italic text-xs text-gray-600">
                {p.date} | {p.technologies}
              </p>
              <ul className="list-disc ml-5">
                {p.description.map((d: string) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </article>
  );
}
/* ───────────────────── end StructuredResume ─────────────────────── */


const ResumePreview: React.FC = () => {
  useRequireAuth(); // Ensure user is authenticated
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add state for profiles and selectedProfileId
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);

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

  // Fetch profiles and set default
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8000/profiles', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setProfiles(data);
        if (data.length > 0 && selectedProfileId === null) setSelectedProfileId(data[0].id);
      } catch (err) {
        setProfiles([]);
      }
    };
    fetchProfiles();
  }, []);

  // Fetch selected profile details
  useEffect(() => {
    if (!selectedProfileId) return;
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:8000/profiles/${selectedProfileId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setSelectedProfile(data);
      } catch (err) {
        setSelectedProfile(null);
      }
    };
    fetchProfile();
  }, [selectedProfileId]);

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
    if (!id) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('token');
    const url = `${apiUrl}/pdf/${id}${selectedProfileId ? `?profile_id=${selectedProfileId}` : ''}`;
    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf',
      },
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to download PDF');
        return response.blob();
      })
      .then(blob => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `${resume?.role || 'Resume'}_${resume?.companyName || ''}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(() => alert('Failed to download PDF.'));
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

  // Prepare resume data with selected profile's contact info
  let resumeData = null;
  if (resume) {
    let contentObj = typeof resume.content === 'string' ? JSON.parse(resume.content) : resume.content;
    resumeData = { ...contentObj, contact: selectedProfile };
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
                    <StructuredResume raw={resumeData} />
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
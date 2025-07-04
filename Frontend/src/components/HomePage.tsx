import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Zap, Target, TrendingUp, CheckCircle } from 'lucide-react';

const HomePage: React.FC = () => {
  const features = [
    {
      icon: <FileText className="h-8 w-8 text-blue-300" />,
      title: "AI-Powered Resume Generation",
      description: "Create tailored resumes for specific job roles using advanced AI algorithms."
    },
    {
      icon: <Target className="h-8 w-8 text-cyan-300" />,
      title: "ATS Score Analysis",
      description: "Get detailed ATS compatibility scores and insights to improve your chances."
    },
    {
      icon: <Zap className="h-8 w-8 text-emerald-300" />,
      title: "Instant Optimization",
      description: "Optimize your resume in seconds with our intelligent enhancement system."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-green-300" />,
      title: "Track Performance",
      description: "Monitor your resume performance across different applications and companies."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/20 via-gray-900/20 to-zinc-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 animate-fade-in">
              Optimize Your Resume with
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Artificial Intelligence
              </span>
            </h1>
            <p className="text-xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
              Transform your career prospects with AI-powered resume optimization. 
              Get higher ATS scores, better job matches, and land your dream role.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/signup"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Start Optimizing
              </Link>
              <Link
                to="/login"
                className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/20 transition-all duration-300 border border-white/20"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Choose ResumeAI?
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Our advanced AI technology helps you create resumes that stand out and get noticed by employers.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-white/70">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl p-8 backdrop-blur-sm border border-white/20">
              <div className="text-4xl font-bold text-white mb-2">95%</div>
              <div className="text-white/80">Average ATS Score Improvement</div>
            </div>
            <div className="bg-gradient-to-r from-cyan-600/20 to-emerald-600/20 rounded-xl p-8 backdrop-blur-sm border border-white/20">
              <div className="text-4xl font-bold text-white mb-2">10K+</div>
              <div className="text-white/80">Resumes Optimized</div>
            </div>
            <div className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 rounded-xl p-8 backdrop-blur-sm border border-white/20">
              <div className="text-4xl font-bold text-white mb-2">3x</div>
              <div className="text-white/80">Higher Interview Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-slate-900/30 to-gray-900/30">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Ready to Transform Your Career?
          </h2>
          <p className="text-xl text-white/80 mb-12">
            Join thousands of professionals who have boosted their job prospects with our AI-powered resume optimizer.
          </p>
          <Link
            to="/signup"
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl inline-flex items-center space-x-2"
          >
            <span>Get Started Now</span>
            <CheckCircle className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
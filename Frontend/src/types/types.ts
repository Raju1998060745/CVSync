export interface Resume {
  id: string;
  companyName: string;
  role: string;
  date: string;
  status: 'generated' | 'optimized';
  atsScore?: number;
  content?: string;
  jobDescription?: string;
  originalResume?: string;
  optimizedResume?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface ResumeOptimizationRequest {
  companyName: string;
  roleName: string;
  jobDescription: string;
  currentResume: string;
}

export interface ResumeOptimizationResponse {
  id: string;
  generatedResume: string;
  atsScore?: number;
  optimizedResume?: string;
}
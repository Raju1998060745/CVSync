// Mock API functions - replace with actual API calls
export const api = {
  login: async (email: string, password: string) => {
    // Mock login
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ user: { id: '1', email, name: 'John Doe' }, token: 'mock-token' });
      }, 1000);
    });
  },

  signup: async (email: string, password: string, name: string) => {
    // Mock signup
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ user: { id: '1', email, name }, token: 'mock-token' });
      }, 1000);
    });
  },

  getResumes: async () => {
    // Fetch resumes from backend API
    const response = await fetch('http://localhost:8000/results');
    if (!response.ok) {
      throw new Error('Failed to fetch resumes');
    }
    const data = await response.json();
    return data.results;
  },

  getResumeById: async (id: string) => {
    // Fetch resume by ID from backend API
    const response = await fetch(`http://localhost:8000/resume/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch resume by ID');
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    return data;
  },

  generateResume: async (data: any) => {
    // Call backend API to generate resume
    const response = await fetch('http://localhost:8000/generate_resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error('Failed to generate resume');
    }
    const result = await response.json();
    return { generatedResume: result.result, id: result.id };
  },

  checkATSScore: async (data: any) => {
    // Call backend API to evaluate ATS score
    const response = await fetch('http://localhost:8000/evaluate_ats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error('Failed to evaluate ATS score');
    }
    const result = await response.json();
    return { atsScore: result.atsScore, explanation: result.explanation };
  },

  optimizeResume: async (data: any) => {
    // Call backend API to optimize resume
    const response = await fetch('http://localhost:8000/optimize_resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error('Failed to optimize resume');
    }
    const result = await response.json();
    return {
      optimizedResume: result.optimized_resume,
      finalScore: result.final_score,
      explanation: result.explanation
    };
  },

  saveSelectedResume: async (data : any) => {
    // Call backend API to save selected resume status
    const response = await fetch('http://localhost:8000/saveselectedresume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error('Failed to save selected resume');
    }
    const result = await response.json();
    return result;
  }
};
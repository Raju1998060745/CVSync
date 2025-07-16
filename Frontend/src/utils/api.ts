// Mock API functions - replace with actual API calls
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const api = {
  // 🔐 LOGIN
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error || 'Invalid credentials');
    }

    return await response.json(); // { user, token }
  },

  // 📝 SIGNUP
  signup: async (email: string, password: string, name: string) => {
    const response = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error || 'Signup failed');
    }

    return await response.json(); // { user, token }
  },

  getResumes: async () => {
    // Fetch resumes from backend API
    const response = await fetch(`${API_URL}/results`);
    if (!response.ok) {
      throw new Error('Failed to fetch resumes');
    }
    const data = await response.json();
    return data.results;
  },

  getResumeById: async (id: string) => {
    // Fetch resume by ID from backend API
    const response = await fetch(`${API_URL}/resume/${id}`);
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
    const response = await fetch(`${API_URL}/generate_resume`, {
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
    const response = await fetch(`${API_URL}/evaluate_ats`, {
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
    const response = await fetch(`${API_URL}/optimize_resume`, {
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
    const response = await fetch(`${API_URL}/saveselectedresume`, {
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
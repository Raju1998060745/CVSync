import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Redirects to the login page if no authentication token is present.
 */
export function useRequireAuth() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);
}
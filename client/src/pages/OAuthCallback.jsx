import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token = searchParams.get('token');
    const userParam = searchParams.get('user');

    if (!token || !userParam) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    try {
      const userData = JSON.parse(atob(userParam));
      loginWithToken(token, userData);
      navigate('/dashboard', { replace: true });
    } catch {
      navigate('/login?error=oauth_failed', { replace: true });
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-gray-500 text-sm">Signing you in...</p>
    </div>
  );
}

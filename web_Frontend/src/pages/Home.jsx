// src/pages/Home.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../api/userService';

export default function Home() {
  const navigate = useNavigate();
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await userService.getMe();
        if (!mounted) return;
        if (me?.is_staff) navigate('/admin', { replace: true });
        else navigate('/residente', { replace: true });
      } catch {
        navigate('/login', { replace: true });
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);
  return <div className="p-6">Redirigiendo…</div>;
}
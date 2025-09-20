import { useEffect, useState } from 'react';
import { AdminApi } from './api';
import { getToken, onTokenChanged } from './auth';

export function useAdminGuard() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      setLoading(true);
      try {
        const token = getToken();
        if (!token) {
          if (mounted) { setAllowed(false); setError('Missing token'); }
          return;
        }
        const res = await AdminApi.me();
        if (mounted) {
          if (res?.success && res?.data?.role === 'admin') {
            setAllowed(true);
            setError('');
          } else {
            setAllowed(false);
            setError('Admin access required');
          }
        }
      } catch (e: any) {
        if (mounted) { setAllowed(false); setError('Unauthorized'); }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // initial check
    check();
    // subscribe to token changes to auto-refresh guard
    const off = onTokenChanged(() => { check(); });
    return () => { mounted = false; off?.(); };
  }, []);

  return { loading, allowed, error };
}
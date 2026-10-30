'use client';

import { useEffect, useState } from 'react';
import { getSession, UserRole } from '@/lib/auth';

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setIsAdmin(session.role === 'admin');
      setRole(session.role);
    } else {
      setIsAdmin(false);
      setRole(null);
    }
    setLoading(false);
  }, []);

  return { isAdmin, role, loading };
}

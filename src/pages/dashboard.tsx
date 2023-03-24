import { AuthContext } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { useContext, useEffect } from 'react';

export default function dashboard() {
  const { user } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {}, []);

  return <div>dashboard: {user?.email}</div>;
}
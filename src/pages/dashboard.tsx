import Can from '@/components/Can';
import { AuthContext, singOut } from '@/contexts/AuthContext';
import { withSSRAuth } from '@/utils/withSSRAuth';
import { useRouter } from 'next/router';
import { useContext, useEffect } from 'react';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  });

  return (
    <>
      <h1>dashboard: {user?.email}</h1>
      <Can permissions={['metrics.list']}>
        <div>Métricas</div>
      </Can>
      {user && <div>{user.permissions.join(', ')}</div>}
      {user && <div>{user.roles.join(', ')}</div>}
      {user && (
        <button
          onClick={() => {
            singOut(), router.push('/');
          }}
        >
          Logout
        </button>
      )}
    </>
  );
}
export const getServerSideProps = withSSRAuth(async (ctx) => {
  return {
    props: {},
  };
});

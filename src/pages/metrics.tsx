import { withSSRAuth } from '@/utils/withSSRAuth';
import decode from 'jwt-decode';

export default function Metrics() {
  return (
    <>
      <h1>Metrics</h1>
    </>
  );
}
export const getServerSideProps = withSSRAuth(
  async (ctx) => {
    return {
      props: {},
    };
  },
  {
    permissions: ['metrics.list'],
    roles: ['administrator'],
  }
);

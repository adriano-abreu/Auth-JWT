import { AuthTokenError } from '@/services/errors/AuthTokenError';
import {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from 'next';
import { destroyCookie, parseCookies } from 'nookies';
import decode from 'jwt-decode';
import { validateUserPermissions } from './validateUserPermission';

type withSSRAuthOptions = {
  permissions?: string[];
  roles?: string[];
};

export function withSSRAuth<P extends { [key: string]: any }>(
  fn: GetServerSideProps<P>,
  options?: withSSRAuthOptions
) {
  return async (
    ctx: GetServerSidePropsContext
  ): Promise<GetServerSidePropsResult<P> | undefined> => {
    const { 'nextauth.token': token } = parseCookies(ctx);

    if (!token) {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      };
    }

    if (options) {
      const user = decode<{ permissions: string[]; roles: string[] }>(token);
      const { permissions, roles } = options;
      const userHasValidPermissions = validateUserPermissions(
        user,
        permissions,
        roles
      );

      if (!userHasValidPermissions) {
        console.log(user);
        return {
          redirect: {
            destination: '/dashboard',
            permanent: false,
          },
        };
      }
    }

    try {
      return await fn(ctx);
    } catch (error) {
      if (error instanceof AuthTokenError) {
        destroyCookie(ctx, 'nextauth.token');
        destroyCookie(ctx, 'nextauth.refreshToken');
        return {
          redirect: {
            destination: '/',
            permanent: false,
          },
        };
      }
    }
  };
}

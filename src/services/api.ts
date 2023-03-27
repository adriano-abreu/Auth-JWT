import { singOut } from '@/contexts/AuthContext';
import axios, { AxiosError } from 'axios';
import { parseCookies, setCookie } from 'nookies';
import { AuthTokenError } from './errors/AuthTokenError';

let isRefreshing = false;
let failedRequestsQueue: {
  resolve: (token: string) => void;
  reject: (err: AxiosError) => void;
}[] = [];

export function setupAPIClient(ctx = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`, // <== Aqui é onde eu passo o token
    },
  });

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      if (error.response && error.response.status === 401) {
        const data: any = error.response.data;
        const code = data ? data.code : '';
        if (code === 'token.expired') {
          cookies = parseCookies(ctx);

          const { 'nextauth.refreshToken': refreshToken } = cookies;

          if (!isRefreshing) {
            isRefreshing = true;

            api
              .post('/refresh', {
                refreshToken,
              })
              .then((response) => {
                const { token } = response.data;
                setCookie(ctx, 'nextauth.token', token, {
                  maxAge: 60 * 60 * 1, // 1 hour
                  path: '/',
                });
                setCookie(
                  ctx,
                  'nextauth.refreshToken',
                  response.data.refreshToken,
                  {
                    maxAge: 60 * 60 * 24 * 30, // 30 days
                    path: '/',
                  }
                );
                api.defaults.headers['Authorization'] = `Bearer ${token}`;

                failedRequestsQueue.forEach((request) =>
                  request.resolve(token)
                );
                failedRequestsQueue = [];
              })
              .catch((err) => {
                failedRequestsQueue.forEach((request) => request.reject(err));
                failedRequestsQueue = [];

                if (typeof window !== 'undefined') {
                  singOut();
                }
              })
              .finally(() => {
                isRefreshing = false;
              });
          }
          const originalConfig = error.config;
          return new Promise((resolve, reject) => {
            failedRequestsQueue.push({
              resolve: (token: string) => {
                originalConfig!.headers['Authorization'] = `Bearer ${token}`;
                resolve(api(originalConfig!));
              },
              reject: (err: AxiosError) => {
                reject(err);
              },
            });
          });
        } else {
          if (typeof window !== 'undefined') {
            singOut();
          }else {
            return Promise.reject(new AuthTokenError());
          }
        }
      }

      return Promise.reject(error);
    }
  );

  return api;
}
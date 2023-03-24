import { singOut } from '@/contexts/AuthContext';
import axios, { AxiosError } from 'axios';
import Router from 'next/router';
import { destroyCookie, parseCookies, setCookie } from 'nookies';

let cookies = parseCookies();
let isRefreshing = false;
let failedRequestsQueue: {
  resolve: (token: string) => void;
  reject: (err: AxiosError) => void;
}[] = [];

export const api = axios.create({
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
        cookies = parseCookies();

        const { 'nextauth.refreshToken': refreshToken } = cookies;

        if (!isRefreshing) {
          isRefreshing = true;

          api
            .post('/refresh', {
              refreshToken,
            })
            .then((response) => {
              const { token } = response.data;
              setCookie(undefined, 'nextauth.token', token, {
                maxAge: 60 * 60 * 1, // 1 hour
                path: '/',
              });
              setCookie(
                undefined,
                'nextauth.refreshToken',
                response.data.refreshToken,
                {
                  maxAge: 60 * 60 * 24 * 30, // 30 days
                  path: '/',
                }
              );
              api.defaults.headers['Authorization'] = `Bearer ${token}`;

              failedRequestsQueue.forEach((request) => request.resolve(token));
              failedRequestsQueue = [];
            })
            .catch((err) => {
              failedRequestsQueue.forEach((request) => request.reject(err));
              failedRequestsQueue = [];
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
        singOut();
      }
    }

    return Promise.reject(error);
  }
);

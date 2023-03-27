import { createContext, ReactNode, useEffect, useState } from 'react';
import { setCookie, parseCookies, destroyCookie } from 'nookies';
import Router from 'next/router';
import { api } from '@/services/apiClient';

type User = {
  email: string;
  permissions: string[];
  roles: string[];
};

type AuthProviderProps = {
  children: ReactNode;
};

type SingInCredentials = {
  email: string;
  password: string;
};

type AuthContextType = {
  signIn(credentials: SingInCredentials): Promise<void>;
  isAuthenticated: boolean;
  user: User | undefined;
};

export const AuthContext = createContext({} as AuthContextType);

export function singOut() {
  destroyCookie(undefined, 'nextauth.token');
  destroyCookie(undefined, 'nextauth.refreshToken');
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>();
  const isAuthenticated = !!user;

  useEffect(() => {
    const { 'nextauth.token': token } = parseCookies();
    if (token) {
      api
        .get('/me')
        .then((response) => {
          const { email, permissions, roles } = response.data;
          setUser({ email, permissions, roles });
        })
        .catch((error: Error) => {
          singOut();
        });
    }
  }, [isAuthenticated]);

  async function signIn({ email, password }: SingInCredentials) {
    try {
      const response = await api.post('sessions', {
        email,
        password,
      });
      const { token, refreshToken, permissions, roles } = response.data;

      setCookie(undefined, 'nextauth.token', token, {
        maxAge: 60 * 60 * 1, // 1 hour
        path: '/',
      });
      setCookie(undefined, 'nextauth.refreshToken', refreshToken, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });

      setUser({ email, permissions, roles });

      api.defaults.headers['Authorization'] = `Bearer ${token}`;
      Router.push('/dashboard');
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <AuthContext.Provider value={{ signIn, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  );
}

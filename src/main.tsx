import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import App from './App.tsx';
import './index.css';

const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN as string | undefined;
const COGNITO_USER_POOL_ID = (import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined) ?? '';
const COGNITO_USER_POOL_CLIENT_ID = (import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID as string | undefined) ?? '';

// ── AWS Amplify configuration ─────────────────────────────────────────────────
// Chỉ cấu hình Cognito User Pool (không có oauth redirect vì dùng Custom UI).
// Amplify sẽ tự quản lý token storage, refresh token, và session persistence.
//
// User Pool:   ap-southeast-1_VLlAOfNlC
// App Client:  1338kohcgccptp602485oah1sd  (Public client — no client secret)
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: COGNITO_USER_POOL_ID,
      userPoolClientId: COGNITO_USER_POOL_CLIENT_ID,
      ...(COGNITO_DOMAIN
        ? {
            loginWith: {
              oauth: {
                domain: COGNITO_DOMAIN,
                scopes: ['openid', 'email', 'profile'],
                redirectSignIn: ['http://localhost:5173/auth/callback', 'https://slothub.id.vn/auth/callback'],
                redirectSignOut: ['http://localhost:5173', 'https://slothub.id.vn'],
                responseType: 'code',
              },
            },
          }
        : {}),
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

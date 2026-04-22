import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import App from './App.tsx';
import './index.css';

const COGNITO_USER_POOL_ID = (import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined) ?? '';
const COGNITO_USER_POOL_CLIENT_ID = (import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID as string | undefined) ?? '';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: COGNITO_USER_POOL_ID,
      userPoolClientId: COGNITO_USER_POOL_CLIENT_ID,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

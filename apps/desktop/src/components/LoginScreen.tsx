/**
 * Login Screen Component
 * Handles user authentication with Google OAuth
 */

import React, { useState } from 'react';
import './LoginScreen.css';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onContinueAsGuest?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onContinueAsGuest
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.loginWithGoogle();

      if (result.success) {
        onLoginSuccess();
      } else {
        throw new Error(result.error || 'Login failed - no session returned');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to sign in with Google. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <div className="app-logo">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="64" height="64" rx="12" fill="url(#gradient)" />
              <path
                d="M32 16L20 24V40L32 48L44 40V24L32 16Z"
                stroke="white"
                strokeWidth="2"
                fill="none"
              />
              <circle cx="32" cy="32" r="4" fill="white" />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="64" y2="64">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1>Welcome to PolyNote</h1>
          <p className="tagline">
            Your intelligent note-taking companion with multi-platform sync
          </p>
        </div>

        <div className="login-content">
          <div className="login-benefits">
            <h3>Why sign in?</h3>
            <ul>
              <li>
                <span className="benefit-icon">☁️</span>
                <div>
                  <strong>Cloud Sync</strong>
                  <p>Sync your notes across all your devices</p>
                </div>
              </li>
              <li>
                <span className="benefit-icon">🔐</span>
                <div>
                  <strong>Secure Backup</strong>
                  <p>Never lose your notes with automatic backups</p>
                </div>
              </li>
              <li>
                <span className="benefit-icon">🤝</span>
                <div>
                  <strong>Easy Sharing</strong>
                  <p>Share notes and collaborate with others</p>
                </div>
              </li>
              <li>
                <span className="benefit-icon">🚀</span>
                <div>
                  <strong>Pro Features</strong>
                  <p>Access AI-powered tools and premium connectors</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="login-actions">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="google-login-btn"
            >
              {isLoading ? (
                <span className="loading-spinner"></span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.582c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.582 9 3.582z"
                  />
                </svg>
              )}
              <span>{isLoading ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                <p>{error}</p>
              </div>
            )}

            <p className="skip-login">
              <button
                onClick={() => onContinueAsGuest?.()}
                className="skip-btn"
                disabled={isLoading}
              >
                Continue without signing in
              </button>
            </p>

            <div className="privacy-notice">
              <p>
                By signing in, you agree to our{' '}
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

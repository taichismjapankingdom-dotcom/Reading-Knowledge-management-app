import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import './Auth.css';

export default function Auth() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert(t('auth.signup_success'));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box glass-panel">
        <h2>{isSignUp ? t('auth.create_library') : t('auth.open_library')}</h2>
        <p className="auth-subtitle">
          {isSignUp 
            ? t('auth.signup_subtitle')
            : t('auth.signin_subtitle')}
        </p>

        {errorMsg && <div className="auth-error">{errorMsg}</div>}

        <form onSubmit={handleAuth} className="auth-form">
          <div className="form-group">
            <label>{t('auth.email')}</label>
            <input
              type="email"
              placeholder={t('auth.email_placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input
              type="password"
              placeholder={t('auth.password_placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="glass-btn primary" disabled={loading}>
            {loading ? t('auth.processing') : (isSignUp ? t('auth.sign_up') : t('auth.sign_in'))}
          </button>
        </form>

        <div className="auth-toggle">
          {isSignUp ? t('auth.already_have') : t('auth.dont_have')}
          <button className="text-btn" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? t('auth.sign_in') : t('auth.sign_up')}
          </button>
        </div>
      </div>
    </div>
  );
}

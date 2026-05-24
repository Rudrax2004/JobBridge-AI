import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { Sparkles, Shield, AlertCircle } from 'lucide-react';

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    setLoggingIn(true);
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        // Check if user document exists in Firestore
        const userDocRef = doc(db, 'users', loggedInUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          navigate('/onboarding');
        } else {
          const userData = userDocSnap.data();
          if (userData.role === 'employer') {
            navigate('/employer');
          } else {
            navigate('/candidate');
          }
        }
      }
    } catch (err) {
      console.error('Sign in failed:', err);
      setError('Failed to authenticate with Google. Please try again.');
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div id="login-page-container" className="min-h-screen w-full bg-[#0F172A] flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 sm:p-10 border border-slate-100 flex flex-col items-center">
        {/* Logo/Badge */}
        <div className="flex items-center gap-2 mb-6 select-none">
          <div className="w-10 h-10 bg-[#3B82F6] rounded-xl flex items-center justify-center font-black text-white text-xl tracking-wider shadow-lg shadow-blue-500/20">
            JB
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-[#0F172A] leading-tight">JobBridge <span className="text-[#3B82F6]">AI</span></span>
            <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Immigrant Remote Hub</span>
          </div>
        </div>

        {/* Text */}
        <h1 className="text-2xl font-black text-[#0F172A] tracking-tight text-center mb-2">
          Canada Job Bridge Gateway
        </h1>
        <p className="text-slate-500 text-sm font-medium text-center mb-8 max-w-xs leading-relaxed">
          Your gateway to legitimate Canadian jobs
        </p>

        {/* Error Alert */}
        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-800 rounded-xl p-3.5 mb-6 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Button with Custom Google Icon */}
        <button
          id="btn-google-signin"
          onClick={handleSignIn}
          disabled={loggingIn}
          className="w-full h-12 bg-white hover:bg-slate-50 text-[#0F172A] font-bold text-sm rounded-xl border border-slate-200 shadow-sm transition-all duration-200 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loggingIn ? (
            <div className="w-5 h-5 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.27-3.144C18.3 1.926 15.54 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.84 11.57-11.79 0-.79-.085-1.4-.19-1.925H12.24z"
              />
            </svg>
          )}
          <span>{loggingIn ? 'Connecting to Google...' : 'Continue with Google'}</span>
        </button>

        {/* Informative tagline notice */}
        <p className="text-[11px] text-slate-400 text-center mt-6 leading-relaxed">
          New users will be asked to complete a short profile setup after signing in.
        </p>

        {/* Bottom Feature Accents (Professionalism design theme touch) */}
        <div className="w-full border-t border-slate-100 mt-8 pt-6 flex justify-around text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          <span className="flex items-center gap-1"><Shield size={12} className="text-[#3B82F6]" /> AI Safe Filter</span>
          <span className="flex items-center gap-1"><Sparkles size={12} className="text-[#3B82F6]" /> NOC Calibrated</span>
        </div>
      </div>
    </div>
  );
}

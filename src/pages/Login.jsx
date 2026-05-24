import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { Sparkles, Shield, AlertCircle, Mail, Lock, User, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { signInWithGoogle, loginWithEmail, signUpWithEmail, signInWithLinkedIn } = useAuth();
  const navigate = useNavigate();

  // Active Tab: 'signin' or 'signup'
  const [activeTab, setActiveTab] = useState('signin');
  
  // Input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState('seeker'); // 'seeker' or 'employer'

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Navigate users to corresponding workspace depending on role and onboarding state
  const routeUserByFirestoreDoc = async (uid) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        navigate('/onboarding');
      } else {
        const userData = userDocSnap.data();
        if (userData.role === 'employer') {
          navigate('/employer');
        } else {
          // If seeker has no completed background details, prompt onboarding
          if (!userData.background || !userData.skills) {
            navigate('/onboarding');
          } else {
            navigate('/candidate');
          }
        }
      }
    } catch (err) {
      console.error("Routing error:", err);
      // Fallback
      navigate('/onboarding');
    }
  };

  // 1. Email/Password Sign In
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }
    setLoading(true);
    try {
      const loggedUser = await loginWithEmail(email, password);
      if (loggedUser) {
        await routeUserByFirestoreDoc(loggedUser.uid);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Incorrect credentials or configuration error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Email/Password Sign Up
  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email.trim() || !password.trim() || !name.trim()) {
      setError('Please fill in all registration fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const loggedUser = await signUpWithEmail(email, password, name, selectedRole);
      if (loggedUser) {
        setSuccess('Account created successfully! Connecting your workspace...');
        setTimeout(() => {
          if (selectedRole === 'employer') {
            navigate('/employer');
          } else {
            navigate('/onboarding');
          }
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to register account. User might already exist.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Google OAuth
  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        await routeUserByFirestoreDoc(loggedInUser.uid);
      }
    } catch (err) {
      console.error('Google Sign-in failed:', err);
      setError('Failed to link Google credential. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 4. LinkedIn OAuth (Simulated Flow with Authentic Popup)
  const handleLinkedInSignIn = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      // Trigger LinkedIn popup and log in with simulated account linked to Firestore safely
      const loggedInUser = await signInWithLinkedIn(selectedRole);
      if (loggedInUser) {
        setSuccess('Linked LinkedIn Profile successfully!');
        setTimeout(async () => {
          await routeUserByFirestoreDoc(loggedInUser.uid);
        }, 1000);
      }
    } catch (err) {
      console.error('LinkedIn authentication failed:', err);
      setError('Could not verify LinkedIn account tokens.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-page-container" className="min-h-screen w-full bg-[#0F172A] flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans relative overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-100 flex flex-col">
        {/* Header Branding */}
        <div className="flex items-center gap-2.5 mb-5 select-none justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-xl tracking-wider shadow-lg shadow-blue-500/20">
            JB
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-[#0F172A] leading-tight">JobBridge <span className="text-blue-600">AI</span></span>
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Immigrant Remote Hub</span>
          </div>
        </div>

        <h1 className="text-xl font-black text-[#0F172A] tracking-tight text-center mb-1">
          Canada Job Gateway
        </h1>
        <p className="text-slate-500 text-xs text-center mb-6 max-w-xs mx-auto">
          Connect your credentials or sign up via email to start your safer Canadian job seek journey.
        </p>

        {/* Tab Selection Switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6 select-none">
          <button
            onClick={() => { setActiveTab('signin'); setError(null); }}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'signin' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab('signup'); setError(null); }}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'signup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 mb-5 text-xs flex items-start gap-2 animate-fade-in">
            <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 mb-5 text-xs flex items-start gap-2 animate-fade-in">
            <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {/* Primary Forms */}
        {activeTab === 'signin' ? (
          /* Sign In Form */
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Email Address</label>
              <div className="relative flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                <Mail size={15} className="text-slate-400 mr-2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@immigrant.com"
                  className="bg-transparent text-xs w-full outline-none text-[#0F172A] font-medium placeholder-slate-400"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Password</label>
              <div className="relative flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                <Lock size={15} className="text-slate-400 mr-2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent text-xs w-full outline-none text-[#0F172A] font-medium placeholder-slate-400"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/10 transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        ) : (
          /* Sign Up Form */
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Full Name</label>
              <div className="relative flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                <User size={15} className="text-slate-400 mr-2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="bg-transparent text-xs w-full outline-none text-[#0F172A] font-medium placeholder-slate-400"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Email Address</label>
              <div className="relative flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                <Mail size={15} className="text-slate-400 mr-2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.ca"
                  className="bg-transparent text-xs w-full outline-none text-[#0F172A] font-medium placeholder-slate-400"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Password</label>
              <div className="relative flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                <Lock size={15} className="text-slate-400 mr-2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="bg-transparent text-xs w-full outline-none text-[#0F172A] font-medium placeholder-slate-400"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Target Role Selector Toggles */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">I AM REGISTERING AS AN</label>
              <div className="grid grid-cols-2 gap-2">
                <label className={`border rounded-xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  selectedRole === 'seeker' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="seeker"
                    checked={selectedRole === 'seeker'}
                    onChange={() => setSelectedRole('seeker')}
                    className="sr-only"
                  />
                  <span className="text-[11px] font-extrabold text-[#0F172A]">Immigrant / Candidate</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">Looking for remote roles</span>
                </label>

                <label className={`border rounded-xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  selectedRole === 'employer' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="employer"
                    checked={selectedRole === 'employer'}
                    onChange={() => setSelectedRole('employer')}
                    className="sr-only"
                  />
                  <span className="text-[11px] font-extrabold text-[#0F172A]">Employer / Recruiter</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">Post verified vacancies</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/10 transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="relative my-6 select-none shrink-0">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-extrabold text-slate-400">
            <span className="bg-white px-2.5 tracking-wider">Or authenticate with</span>
          </div>
        </div>

        {/* Social Authentication buttons */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          {/* Google Sign-In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 py-2.5 px-3 rounded-xl hover:border-slate-300 text-xs font-bold text-slate-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.27-3.144C18.3 1.926 15.54 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.84 11.57-11.79 0-.79-.085-1.4-.19-1.925H12.24z"
              />
            </svg>
            <span>Google</span>
          </button>

          {/* LinkedIn Sign-In */}
          <button
            onClick={handleLinkedInSignIn}
            disabled={loading}
            className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-[#F3F8FC] py-2.5 px-3 rounded-xl hover:border-[#0A66C2]/40 text-xs font-bold text-slate-700 hover:text-[#0A66C2] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4 text-[#0A66C2] fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
            </svg>
            <span>LinkedIn</span>
          </button>
        </div>

        {/* Feature status badges footer */}
        <div className="w-full border-t border-slate-100 mt-6 pt-5 flex justify-center gap-6 text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">
          <span className="flex items-center gap-1"><Shield size={11} className="text-blue-500" /> AI SCAN FILTER</span>
          <span className="flex items-center gap-1"><Sparkles size={11} className="text-blue-500" /> NOC CERTIFICATION</span>
        </div>
      </div>
    </div>
  );
}

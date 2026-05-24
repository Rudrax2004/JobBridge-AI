import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, Link, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Import Page components
import Login from './pages/Login';
import OnboardingForm from './pages/OnboardingForm';
import JobBoard from './pages/JobBoard';
import EmployerDashboard from './pages/EmployerDashboard';
import CandidateDashboard from './pages/CandidateDashboard';

// Import custom reusable parts
import Chatbot from './components/Chatbot';
import AptitudeTest from './components/AptitudeTest';
import VideoInterview from './components/VideoInterview';
import { LogOut, ArrowLeft, Award, ShieldCheck, Info } from 'lucide-react';

// =========================================================
// 1. Global Navbar Component
// =========================================================
function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'CA';
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm h-16 w-full shrink-0 font-sans">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2 select-none group">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-base tracking-wider shadow-md shadow-blue-500/10">
            JB
          </div>
          <span className="text-base font-black tracking-tight text-blue-600">
            JobBridge <span className="text-slate-800 font-bold">AI</span>
          </span>
        </Link>

        {/* Center: Job Board Link */}
        <nav className="flex items-center">
          <Link to="/" className="text-sm font-extrabold text-slate-600 hover:text-blue-600 transition-colors">
            Job Board
          </Link>
        </nav>

        {/* Right: User Avatar / Session controls */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img 
                  referrerPolicy="no-referrer"
                  src={user.photoURL} 
                  alt={user.displayName || 'Avatar'} 
                  className="w-8 h-8 rounded-full border border-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                  {getInitials()}
                </div>
              )}
              <span className="hidden sm:inline text-xs font-bold text-slate-700">
                {user.displayName || user.email?.split('@')[0]}
              </span>
              <button
                onClick={async () => {
                  try {
                    await logout();
                    navigate('/login');
                  } catch (err) {
                    console.error('Logout error:', err);
                  }
                }}
                className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 font-bold text-xs px-3 py-2 rounded-xl border border-slate-200/80 transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <Link 
              to="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

// =========================================================
// 2. Protected Route Component
// =========================================================
function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfileLoading(false);
        return;
      }
      setProfileLoading(true);
      try {
        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('ProtectedRoute fetching profile failed:', err);
      } finally {
        setProfileLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verifying candidate profile...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = profile?.role;

  // Handle wrong role redirection
  if (allowedRole) {
    if (!role) {
      return <Navigate to="/onboarding" replace />;
    }
    if (role !== allowedRole) {
      if (role === 'seeker') {
        return <Navigate to="/candidate" replace />;
      }
      if (role === 'employer') {
        return <Navigate to="/employer" replace />;
      }
    }
  }

  return (
    <>
      {children}
      <Chatbot />
    </>
  );
}

// =========================================================
// 3. Login Route Wrapper
// =========================================================
function LoginRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user) {
    // Will trigger ProtectedRoute's redirect mechanism once loaded
    return <Navigate to="/candidate" replace />;
  }

  return <Login />;
}

// =========================================================
// 4. Inline Apply Page Component
// =========================================================
function ApplyPage() {
  const { jobId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [profileData, setProfileData] = useState({
    seniority: 'Intermediate',
    skills: [],
    projects: [],
    resumeText: ''
  });

  const [aptitudePassed, setAptitudePassed] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadApplyData() {
      if (!user || !jobId) return;
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Job
        const jobRef = doc(db, 'jobs', jobId);
        const jobSnap = await getDoc(jobRef);
        let targetJob = null;
        if (jobSnap.exists()) {
          targetJob = { id: jobSnap.id, ...jobSnap.data() };
        } else {
          // Pre-seeded high quality fallback remote jobs
          const BACKUP_JOBS = [
            { id: "fs-1", title: "Senior React Developer", company: "Shopify Inc.", description: "Build Shopify remote user experience templates.", experienceYears: 5 },
            { id: "fs-2", title: "Clinical Data Analyst", company: "CareCanada Digital Solutions", description: "Coordinate and review medical metrics.", experienceYears: 3 },
            { id: "fs-3", title: "Anti-Money Laundering Analyst", company: "RBC Finance Corp", description: "Detect fraud transactions patterns.", experienceYears: 4 },
            { id: "m-job-1", title: "Senior Full Stack Dev (Laravel & React)", company: "Appian Digital Inc.", description: "Maintain robust server and portal UI.", experienceYears: 6 },
            { id: "m-job-2", title: "Cloud Devops System Technician", company: "Appian Digital Inc.", description: "Manage deployment grids and nodes.", experienceYears: 4 }
          ];
          targetJob = BACKUP_JOBS.find(j => j.id === jobId);
        }

        if (!targetJob) {
          setError("This specific job vacancy parameters could not be loaded.");
          setLoading(false);
          return;
        }
        setJob(targetJob);

        // 2. Fetch User Profile
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          const skills = uData.aiExtracted?.skills || uData.skills || ['React', 'TypeScript', 'Node.js', 'APIs'];
          const projects = uData.aiExtracted?.projects || uData.projects || [];
          const resumeText = uData.aiExtracted?.rawContent || `Skills: ${skills.join(', ')}`;
          const expYears = uData.background?.experienceYears || 5;
          const seniority = expYears >= 8 ? 'Senior' : expYears <= 2 ? 'Junior' : 'Intermediate';

          setProfileData({
            seniority,
            skills,
            projects,
            resumeText
          });
        } else {
          setProfileData({
            seniority: 'Intermediate',
            skills: ['React', 'TypeScript', 'Node.js', 'Vite'],
            projects: [],
            resumeText: 'Standard Candidate Resume details'
          });
        }
      } catch (err) {
        console.error('Error initializing application page:', err);
        setError('Error fetching requirements from the database.');
      } finally {
        setLoading(false);
      }
    }
    loadApplyData();
  }, [user, jobId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Activating Evaluation Pathway...</span>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-8 text-center border border-slate-150">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center mx-auto text-xl font-bold mb-4">✕</div>
          <h3 className="text-base font-black text-slate-900 mb-2">Gate Activation Error</h3>
          <p className="text-xs text-slate-500 mb-6">{error || 'Unable to connect to the targeted job details.'}</p>
          <button 
            onClick={() => navigate('/')} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl transition-all"
          >
            Back to Job Board
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="inline-apply-page" className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      {/* Immersive Header */}
      <div className="bg-[#0F172A] text-white py-10 px-6 shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <span className="text-blue-400 font-extrabold text-[10px] tracking-wider uppercase bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded">
              AI-Augmented Safe Funnel
            </span>
            <h1 className="text-2xl font-black tracking-tight mt-1 leading-snug">{job.title}</h1>
            <p className="text-sm font-semibold text-slate-300">{job.company}</p>
          </div>
          <button 
            onClick={() => {
              if (window.confirm("Return to job board? Unfinished test progress will not be saved.")) {
                navigate('/');
              }
            }} 
            className="self-start md:self-center flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/10 transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Discard & Quit</span>
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {/* Step 1: Aptitude Test Module */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-120 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Award size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 leading-tight">Step 1: Credentialing Aptitude Test</h2>
              <p className="text-[10.5px] text-slate-400">Verifying capability priorities safely using local parameters</p>
            </div>
          </div>
          
          <AptitudeTest 
            jobTitle={job.title}
            seniorityLevel={profileData.seniority}
            skills={profileData.skills}
            projects={profileData.projects}
            jobId={jobId}
            uid={user.uid}
            onPass={() => setAptitudePassed(true)}
            onFail={() => {}}
          />
        </div>

        {/* Step 2: Video Interview Component Rendered Below */}
        {aptitudePassed && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-120 p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 leading-tight">Step 2: Interactive Video Interview</h2>
                <p className="text-[10.5px] text-emerald-600 font-bold">Aptitude credential cleared successfully!</p>
              </div>
            </div>

            <VideoInterview 
              jobTitle={job.title}
              resumeText={profileData.resumeText}
              jobDescription={job.description || "Looking for an outstanding remote expert."}
              projects={profileData.projects}
              jobId={jobId}
              uid={user.uid}
              onComplete={() => setInterviewCompleted(true)}
            />
          </div>
        )}

        {/* Final Green Success Card */}
        {interviewCompleted && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-6 shadow-md flex items-start gap-4 animate-scale-up mt-6">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xl font-bold shrink-0 shadow-sm border border-emerald-200">
              ✓
            </div>
            <div className="space-y-3">
              <div>
                <h3 className="font-extrabold text-base text-emerald-950">Application submitted!</h3>
                <p className="text-sm text-emerald-700 font-medium mt-0.5">The employer will review your results and schedule an HR round.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate('/')} 
                  className="bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg transition-all text-white font-extrabold text-xs uppercase px-4 py-2 rounded-xl cursor-pointer"
                >
                  Return to Job Board
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================
// 5. App Routes Layout
// =========================================================
function AppContent() {
  const location = useLocation();

  // Show Navbar on all pages EXCEPT /login
  const showNavbar = location.pathname !== '/login';

  return (
    <div id="jobbridge-app-layout" className="flex flex-col min-h-screen bg-slate-50 font-sans">
      {showNavbar && <Navbar />}
      
      <main className="flex-1">
        <Routes>
          {/* Public Job Board */}
          <Route path="/" element={<JobBoard />} />

          {/* Login routing with session checks */}
          <Route path="/login" element={<LoginRoute />} />

          {/* Onboarding page (protected) */}
          <Route 
            path="/onboarding" 
            element={
              <ProtectedRoute>
                <OnboardingForm />
              </ProtectedRoute>
            } 
          />

          {/* Apply page (protected) */}
          <Route 
            path="/apply/:jobId" 
            element={
              <ProtectedRoute>
                <ApplyPage />
              </ProtectedRoute>
            } 
          />

          {/* Candidate Dashboard (protected with Seeker role) */}
          <Route 
            path="/candidate" 
            element={
              <ProtectedRoute allowedRole="seeker">
                <CandidateDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Employer Dashboard (protected with Employer role) */}
          <Route 
            path="/employer" 
            element={
              <ProtectedRoute allowedRole="employer">
                <EmployerDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Fallback routing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// =========================================================
// 6. Main App Component
// =========================================================
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

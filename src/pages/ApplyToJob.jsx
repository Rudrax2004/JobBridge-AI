import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import AptitudeTest from '../components/AptitudeTest';
import VideoInterview from '../components/VideoInterview';
import { 
  Briefcase, 
  ChevronRight, 
  MapPin, 
  Award, 
  ShieldCheck, 
  ArrowLeft,
  Timer,
  Info,
  ThumbsUp,
  XCircle,
  Inbox
} from 'lucide-react';

// Unified high-trust backup jobs to support immediate preview evaluations
const DETAILED_BACKUP_JOBS = [
  {
    id: "fs-1",
    title: "Senior React Developer",
    company: "Shopify Inc.",
    salary: "$135,000 - $160,000",
    province: "Ontario (ON)",
    sector: "Tech",
    workType: "Remote",
    jobType: "Full-time",
    nocCode: "21232",
    teerLevel: 1,
    description: "Build beautiful Shopify user experiences worldwide without leaving your home. Support newcomers. Fully compliant hiring operations as a verified and trusted brand."
  },
  {
    id: "fs-2",
    title: "Clinical Data Analyst",
    company: "CareCanada Digital Solutions",
    salary: "$90,000 - $115,000",
    province: "British Columbia (BC)",
    sector: "Healthcare",
    workType: "Hybrid",
    jobType: "Full-time",
    nocCode: "21230",
    teerLevel: 1,
    description: "Analyze, secure, and index clinical client metrics securely according to standard Canadian medical privacy rules."
  },
  {
    id: "fs-3",
    title: "Anti-Money Laundering Lead Analyst",
    company: "RBC Finance Corp",
    salary: "$110,000 - $130,000",
    province: "Ontario (ON)",
    sector: "Finance",
    workType: "Remote",
    jobType: "Full-time",
    nocCode: "11101",
    teerLevel: 1,
    description: "Review transactions profiles and isolate patterns triggering warning audits according to national FINTRAC guidelines."
  },
  {
    id: "m-job-1",
    title: "Senior Full Stack Dev (Laravel & React)",
    company: "Appian Digital Inc.",
    salary: "CA$115,000 - CA$135,000 / Year",
    province: "Ontario (ON)",
    sector: "Tech",
    workType: "Remote",
    jobType: "Full-time",
    nocCode: "21232",
    teerLevel: 1,
    description: "Maintain core APIs, lead integration sprints, and verify accessibility compliance templates (WCAG / AODA) for multi-tenant logistics dashboard portals."
  },
  {
    id: "m-job-2",
    title: "Cloud Devops System Technician",
    company: "Appian Digital Inc.",
    salary: "CA$95,000 - CA$110,000 / Year",
    province: "British Columbia (BC)",
    sector: "Tech",
    workType: "Hybrid",
    jobType: "Full-time",
    nocCode: "21230",
    teerLevel: 1,
    description: "Perform system audits, manage Kubernetes clusters, secure AWS configurations, and coordinate emergency reliability protocols with offshore team channels."
  }
];

export default function ApplyToJob() {
  const { jobId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Workflow states: 'loading' | 'aptitude' | 'interview' | 'failed' | 'completed'
  const [stage, setStage] = useState('loading');
  const [job, setJob] = useState(null);
  const [profile, setProfile] = useState(null);
  const [apiError, setApiError] = useState('');

  // Loaded candidate details for AI tests
  const [seniority, setSeniority] = useState('Intermediate');
  const [skillsList, setSkillsList] = useState(['React', 'Node.js', 'TypeScript', 'SQL', 'AWS']);
  const [projectsList, setProjectsList] = useState([]);
  const [resumeBody, setResumeBody] = useState('');

  useEffect(() => {
    async function fetchEnvironment() {
      if (!user || !jobId) return;
      setStage('loading');
      try {
        // 1. Fetch Job from Firestore OR fallback
        const jobRef = doc(db, 'jobs', jobId);
        const jobSnap = await getDoc(jobRef);
        
        let targetJob = null;
        if (jobSnap.exists()) {
          targetJob = { id: jobSnap.id, ...jobSnap.data() };
        } else {
          // Check fallbacks matching IDs
          const foundBackup = DETAILED_BACKUP_JOBS.find(j => j.id === jobId);
          if (foundBackup) targetJob = foundBackup;
        }

        if (!targetJob) {
          setApiError('Unable to identify corresponding remote job opening details.');
          setStage('failed');
          return;
        }
        setJob(targetJob);

        // 2. Fetch User Profile
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userObj = userSnap.data();
          setProfile(userObj);

          // Map seniority
          const expYears = userObj.background?.experienceYears || 5;
          if (expYears >= 8) {
            setSeniority('Senior');
          } else if (expYears <= 2) {
            setSeniority('Junior');
          } else {
            setSeniority('Intermediate');
          }

          // Map skills
          if (userObj.aiExtracted?.skills && userObj.aiExtracted.skills.length > 0) {
            setSkillsList(userObj.aiExtracted.skills);
          } else if (userObj.background?.fieldOfWork) {
            // Default skills match field of work
            const sector = userObj.background.fieldOfWork;
            if (sector === 'Tech') {
              setSkillsList(['React', 'Vite', 'Node.js', 'Firebase', 'APIs']);
            } else if (sector === 'Healthcare') {
              setSkillsList(['Data Analysis', 'Reporting', 'Clinical Records', 'Audits']);
            } else if (sector === 'Finance') {
              setSkillsList(['Risk Compliance', 'Spreadsheets', 'FINTRAC rules', 'Invoicing']);
            } else {
              setSkillsList(['Customer Liaison', 'Scheduling', 'English Written', 'Inbound support']);
            }
          }

          // Map projects
          if (userObj.aiExtracted?.projects) {
            setProjectsList(userObj.aiExtracted.projects);
          }

          // Map resume text
          setResumeBody(userObj.aiExtracted?.rawContent || `Skills: ${skillsList.join(', ')}. Origin: ${userObj.background?.originCountry || 'Global'}`);
        }

        // Initialize state to Aptitude test phase
        setStage('aptitude');

      } catch (err) {
        console.error('Error orchestrating apply environment:', err);
        setApiError('Critical error initializing remote evaluation modules.');
        setStage('failed');
      }
    }
    fetchEnvironment();
  }, [user, jobId]);

  const handleAptitudePass = () => {
    // Transition to video interview
    setStage('interview');
  };

  const handleAptitudeFail = () => {
    // Transition to test failed summary
    setStage('failed');
  };

  const handleInterviewComplete = () => {
    // Accomplished!
    setStage('completed');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 text-white text-center">
        <h4 className="text-sm font-black text-rose-400 mb-2">Access Restricted</h4>
        <p className="text-xs text-slate-400 max-w-sm mb-4">Please log in using your authenticated Google credentials to proceed.</p>
        <Link to="/login" className="bg-blue-600 px-4 py-2 rounded-xl text-xs font-bold text-white">Sign In Page</Link>
      </div>
    );
  }

  return (
    <div id="apply-page-root" className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans">
      
      {/* 1. Progress Step Tracker Header */}
      <header className="bg-[#1E293B]/60 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40 shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (window.confirm("Abandon current application progress and return to Job Board?")) {
                  navigate('/jobs');
                }
              }} 
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase leading-none">AI Application Funnel</span>
              <span className="text-sm font-black text-white mt-1 leading-tight">{job?.title || 'Loading remoteness...'}</span>
            </div>
          </div>

          {/* Stepper Indicators */}
          <div className="hidden sm:flex items-center gap-5 text-xs font-bold select-none">
            <div className={`flex items-center gap-1.5 ${stage === 'aptitude' ? 'text-blue-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] leading-none ${stage === 'aptitude' ? 'bg-blue-600 text-white' : 'bg-slate-800'}`}>1</span>
              <span>Aptitude Test</span>
            </div>
            <ChevronRight size={14} className="text-slate-600" />
            <div className={`flex items-center gap-1.5 ${stage === 'interview' ? 'text-blue-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] leading-none ${stage === 'interview' ? 'bg-blue-600 text-white' : 'bg-slate-800'}`}>2</span>
              <span>Video Interview</span>
            </div>
            <ChevronRight size={14} className="text-slate-600" />
            <div className={`flex items-center gap-1.5 ${stage === 'completed' ? 'text-blue-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] leading-none ${stage === 'completed' ? 'bg-blue-600 text-white' : 'bg-slate-800'}`}>3</span>
              <span>All Done</span>
            </div>
          </div>

        </div>
      </header>

      {/* 2. Primary Layout Workspace */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 flex flex-col justify-center">

        {/* LOADING ENVIRONMENT OVERLAY */}
        {stage === 'loading' && (
          <div className="text-center py-12 space-y-4 flex flex-col items-center">
            <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <h4 className="text-sm font-black text-white mb-1">Activating application gateway</h4>
              <p className="text-xs text-slate-400">Loading verified job requirements and matching your international resume parameters...</p>
            </div>
          </div>
        )}

        {/* PHASE 1: APTITUDE TEST INTERACTIVE MODULE */}
        {stage === 'aptitude' && job && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-900/40 via-blue-950/20 to-transparent p-5 rounded-2xl border border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-blue-400 text-xs font-extrabold uppercase tracking-wide">
                  <Award size={14} />
                  <span>Phase 1 of 2: Skills Credentialing</span>
                </div>
                <h3 className="text-lg font-black text-white leading-tight">Tailored Technical Assessment</h3>
                <p className="text-xs text-slate-350 leading-relaxed">
                  To prevent credentials bias, newcomers undergo a personalized test customized by Gemini targeting <b className="text-[#3B82F6]">{job.company}</b> remote priorities.
                </p>
              </div>
              <div className="bg-blue-600/10 border border-blue-500/20 text-blue-300 text-[10.5px] font-black px-3.5 py-1.5 rounded-xl shrink-0 h-10 flex items-center gap-1">
                <Timer size={14} />
                <span>15 Minutes Timer</span>
              </div>
            </div>

            <AptitudeTest 
              jobTitle={job.title}
              seniorityLevel={seniority}
              skills={skillsList}
              projects={projectsList}
              jobId={job.id}
              uid={user.uid}
              onPass={handleAptitudePass}
              onFail={handleAptitudeFail}
            />
          </div>
        )}

        {/* PHASE 2: AI VIDEO INTERVIEW STREAMING MODULE */}
        {stage === 'interview' && job && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#1E293B] via-[#0F172A] to-transparent p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-extrabold uppercase tracking-wide">
                  <ShieldCheck size={14} />
                  <span>Phase 2 of 2: AI Conversational Interview</span>
                </div>
                <h3 className="text-lg font-black text-white leading-tight">STAR Format Video Simulator</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Record short voice/video answers. We transcribe responses instantly and analyze structural logic match against the <b className="text-sky-400">{job.title}</b> guidelines.
                </p>
              </div>
              <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10.5px] font-bold px-3 py-1 bg-slate-900 rounded-lg shrink-0 select-none h-6">
                5 Questions
              </span>
            </div>

            <VideoInterview 
              jobTitle={job.title}
              resumeText={resumeBody}
              jobDescription={job.description || "Looking for a high performance software dev with reliable remote workflows."}
              projects={projectsList}
              jobId={job.id}
              uid={user.uid}
              onComplete={handleInterviewComplete}
            />
          </div>
        )}

        {/* OUTCOME A: FAILED / INCOMPLETION SCREEN */}
        {stage === 'failed' && (
          <div className="bg-[#1E293B]/60 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-md mx-auto space-y-6 shadow-xl">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500 text-red-500 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
              ✕
            </div>
            <div className="space-y-2">
              <span className="text-[10px] text-red-400 font-extrabold uppercase tracking-widest banner block">Test Incomplete</span>
              <h3 className="text-xl font-black text-white tracking-tight">Required Score Not Reached</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {apiError ? apiError : "The aptitude score requirements did not meets Appian trust levels. Don't worry! Newcomers can review resume translations and try applying to other verified remote roles immediately."}
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-2.5">
              <button 
                onClick={() => navigate('/jobs')}
                className="w-full h-11 bg-slate-800 hover:bg-slate-700 font-bold text-xs text-white rounded-xl transition-colors shrink-0"
              >
                Browse Safe Listings
              </button>
              <button 
                onClick={() => setStage('aptitude')}
                className="w-full h-11 bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white rounded-xl transition-colors shrink-0 shadow-lg shadow-blue-500/20"
              >
                Retry Aptitude Test
              </button>
            </div>
          </div>
        )}

        {/* OUTCOME B: COMPLETED / SUCCESS SCREEN */}
        {stage === 'completed' && job && (
          <div className="bg-[#1E293B]/60 border border-slate-800 rounded-3xl p-10 sm:p-14 text-center max-w-lg mx-auto space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>

            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 w-16 h-16 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto text-3xl font-bold relative">
                ✓
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest block">Application Transmitted</span>
              <h3 className="text-2xl font-black text-white tracking-tight">Accomplished, Well Done!</h3>
              <p className="text-xs text-slate-350 leading-relaxed max-w-sm mx-auto">
                Your credentials rating, verified scores, and structural video transcript have been saved to Firestore. Recruiter team leaders at <strong className="text-white">{job.company}</strong> can now review and schedule your HR round.
              </p>
            </div>

            {/* Next expectations card */}
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-left space-y-2 max-w-sm mx-auto">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-300">
                <Info size={13} className="text-blue-500" />
                <span>What happens next?</span>
              </div>
              <ul className="text-[10.5px] text-slate-400 space-y-1 pl-4 list-decimal leading-snug">
                <li>HR leaders review matches and check meeting credentials.</li>
                <li>You'll get a verified schedule meeting link right in your profile.</li>
                <li>Your foreign credentials translate correctly into legal terms.</li>
              </ul>
            </div>

            <div className="pt-4 max-w-xs mx-auto">
              <button 
                onClick={() => navigate('/jobs')}
                className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-1 select-none cursor-pointer"
              >
                <span>Return to Remote Jobs Selection</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

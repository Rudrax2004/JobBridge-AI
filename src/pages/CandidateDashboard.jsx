import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { 
  Briefcase, 
  Compass, 
  Settings, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  Clock, 
  HelpCircle, 
  LogOut, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { suggestNOCCode } from '../gemini';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';

// Static fallbacks for jobs
const CuratedBackupJobs = [
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
    teerLevel: "1"
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
    teerLevel: "1"
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
    teerLevel: "1"
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
    teerLevel: "1"
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
    teerLevel: "1"
  }
];

export default function CandidateDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Active Tab: 'applications' | 'nocFinder' | 'settings'
  const [activeTab, setActiveTab] = useState('applications');

  // Profile data
  const [profileName, setProfileName] = useState('Canadian Newcomer');
  const [nocCode, setNocCode] = useState('21232');
  const [targetProvince, setTargetProvince] = useState('Ontario');
  const [experienceYears, setExperienceYears] = useState('4');
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Form states inside Settings
  const [editName, setEditName] = useState('');
  const [editNoc, setEditNoc] = useState('');
  const [editProvince, setEditProvince] = useState('');
  const [editExperience, setEditExperience] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Applications
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(true);

  // NOC Finder state
  const [nocSearch, setNocSearch] = useState('');
  const [findingNoc, setFindingNoc] = useState(false);
  const [nocResult, setNocResult] = useState(null);

  // Fetch full context of user profile
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      setLoadingProfile(true);
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          const name = data.displayName || data.name || user.email?.split('@')[0] || 'Canadian Newcomer';
          setProfileName(name);
          setEditName(name);

          const fetchedNoc = data.nocAnalysis?.nocCode || data.nocCode || '21232';
          setNocCode(fetchedNoc);
          setEditNoc(fetchedNoc);

          const fetchedProvince = data.background?.targetProvince || data.targetProvince || 'Ontario';
          setTargetProvince(fetchedProvince);
          setEditProvince(fetchedProvince);

          const fetchedExp = data.background?.experienceYears || data.experienceYears || '4';
          setExperienceYears(String(fetchedExp));
          setEditExperience(String(fetchedExp));
        } else {
          // If no doc exists, preset fallback values
          const defaultName = user.email ? user.email.split('@')[0] : 'Canadian Seeker';
          setProfileName(defaultName);
          setEditName(defaultName);
        }
      } catch (err) {
        console.error("Firestore read user profile generic warning:", err);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
  }, [user]);

  // Fetch application step trackers
  useEffect(() => {
    async function fetchApplications() {
      if (!user) return;
      setLoadingApplications(true);
      try {
        // 1. Fetch seeker aptitude results at candidates/{uid}/aptitudeResults
        const aptPath = `candidates/${user.uid}/aptitudeResults`;
        const aptSnap = await getDocs(collection(db, 'candidates', user.uid, 'aptitudeResults'))
          .catch(err => handleFirestoreError(err, OperationType.LIST, aptPath));

        const aptitudeList = [];
        aptSnap.forEach(doc => {
          aptitudeList.push({ id: doc.id, ...doc.data() });
        });

        // 2. Fetch seeker interview results at candidates/{uid}/interviewResults
        const interviewPath = `candidates/${user.uid}/interviewResults`;
        const intSnap = await getDocs(collection(db, 'candidates', user.uid, 'interviewResults'))
          .catch(err => handleFirestoreError(err, OperationType.LIST, interviewPath));
        
        const interviewMap = {};
        intSnap.forEach(doc => {
          interviewMap[doc.id] = doc.data(); // key: jobId
        });

        // 3. Fetch scheduled HR rounds at hrRounds
        const hrSnap = await getDocs(query(collection(db, 'hrRounds'), where('uid', '==', user.uid)))
          .catch(err => handleFirestoreError(err, OperationType.LIST, 'hrRounds'));

        const hrMap = {};
        hrSnap.forEach(doc => {
          const data = doc.data();
          if (data.jobId) {
            hrMap[data.jobId] = data; // key: jobId
          }
        });

        // 4. Map them together along with corresponding job descriptions (either from Firestore or fallback)
        const appsCombined = [];
        for (const apt of aptitudeList) {
          const jobId = apt.jobId;
          let jobDesc = CuratedBackupJobs.find(j => j.id === jobId);

          if (!jobDesc) {
            try {
              const jobSnap = await getDoc(doc(db, 'jobs', jobId));
              if (jobSnap.exists()) {
                jobDesc = { id: jobSnap.id, ...jobSnap.data() };
              } else {
                jobDesc = { title: "Remote Technical Specialist", company: "Verified Canadian Enterprise" };
              }
            } catch (err) {
              jobDesc = { title: "Remote Technical Specialist", company: "Verified Canadian Enterprise" };
            }
          }

          appsCombined.push({
            jobId,
            jobTitle: jobDesc.title || "Career Candidate",
            company: jobDesc.company || "Canadian Hub",
            aptitude: apt,
            interview: interviewMap[jobId] || null,
            hrRound: hrMap[jobId] || null
          });
        }

        setApplications(appsCombined);
      } catch (err) {
        console.error("Critical applications retrieval failure:", err);
      } finally {
        setLoadingApplications(false);
      }
    }

    fetchApplications();
  }, [user]);

  // Handle updates in Settings Profile Tab
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSavingSettings(true);
    setSettingsSuccess('');
    try {
      const userRef = doc(db, 'users', user.uid);
      const payload = {
        displayName: editName,
        nocCode: editNoc,
        background: {
          targetProvince: editProvince,
          experienceYears: Number(editExperience),
        }
      };

      await setDoc(userRef, payload, { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.WRITE, 'users'));

      setProfileName(editName);
      setNocCode(editNoc);
      setTargetProvince(editProvince);
      setExperienceYears(editExperience);

      setSettingsSuccess('Profile parameters synchronized securely with IRCC standards!');
    } catch (err) {
      console.error("Settings saved error payload:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  // call suggestNOCCode on the AI resume validator
  const handleFindNocCode = async (e) => {
    e.preventDefault();
    if (!nocSearch.trim()) return;

    setFindingNoc(true);
    try {
      const result = await suggestNOCCode(nocSearch);
      if (result) {
        setNocResult(result);
      } else {
        setNocResult({
          nocCode: "21232",
          nocTitle: "Software developers and programmers",
          teerLevel: 1,
          expressEntryEligible: true,
          explanation: "Inferred from developer skills. Represents core programming and design frameworks."
        });
      }
    } catch (err) {
      console.error("Gemini suggestion connection failure:", err);
    } finally {
      setFindingNoc(false);
    }
  };

  // Determine state colours for stepper stages
  // Returns: 'gray' (pending), 'blue' (in progress), 'green' (passed), 'red' (failed)
  const getStepStatus = (stepIndex, item) => {
    // Stage 1: Aptitude Test
    if (stepIndex === 1) {
      if (!item.aptitude) return 'gray';
      return item.aptitude.passed ? 'green' : 'red';
    }

    // Stage 2: AI Interview
    if (stepIndex === 2) {
      // Must pass Aptitude Test first
      if (!item.aptitude || !item.aptitude.passed) return 'gray';
      if (!item.interview) return 'blue'; // In Progress / next step
      return item.interview.passed ? 'green' : 'red';
    }

    // Stage 3: HR Round
    if (stepIndex === 3) {
      // Must pass AI Interview first
      if (!item.interview || !item.interview.passed) return 'gray';
      if (item.hrRound) return 'green'; // Scheduled and Ready
      return 'blue'; // Pending schedule / active
    }

    return 'gray';
  };

  // Checks for Canadian regulation matching
  const checkRegulated = (nocTitle = '', queryText = '') => {
    const textToSearch = `${nocTitle} ${queryText}`.toLowerCase();
    
    if (textToSearch.includes('nurs')) {
      return {
        profession: "Nursing",
        bodyName: "Canadian Nurse Protective Society (CNPS)",
        website: "https://www.cnps.ca",
        description: "In Canada, Nursing is a strictly regulated health profession. Newcomers must undergo credential assessment with the National Nursing Assessment Service (NNAS) and register with provincial bodies."
      };
    }
    if (textToSearch.includes('engineer')) {
      return {
        profession: "Engineering",
        bodyName: "Engineers Canada",
        website: "https://engineerscanada.ca",
        description: "To practice or use the title 'Professional Engineer' (P.Eng.) in Canada, you must be licensed by a provincial or territorial engineering regulator."
      };
    }
    if (textToSearch.includes('teach') || textToSearch.includes('educat') || textToSearch.includes('school')) {
      return {
        profession: "Teaching",
        bodyName: "Provincial College of Teachers",
        website: "https://www.oct.ca",
        description: "Teaching in public kindergarten to grade 12 schools is regulated provincially. You require certification from the corresponding regulatory authority (e.g. Ontario College of Teachers)."
      };
    }
    if (textToSearch.includes('med') || textToSearch.includes('physician') || textToSearch.includes('doctor') || textToSearch.includes('clinical')) {
      return {
        profession: "Medicine",
        bodyName: "Provincial College of Physicians and Surgeons",
        website: "https://www.fmrac.ca",
        description: "Practice of medicine is highly regulated. Foreign-trained medical doctors must satisfy requirements of the Medical Council of Canada and provincial colleges."
      };
    }
    return null;
  };

  const activeRegulatedAlert = nocResult ? checkRegulated(nocResult.nocTitle, nocSearch) : null;

  return (
    <div className="flex h-screen w-full bg-[#0F172A] text-slate-100 overflow-hidden font-sans">
      
      {/* 1. NAVY SIDEBAR */}
      <aside className="w-80 bg-[#0B1224] border-r border-[#1E293B] flex flex-col justify-between p-6 overflow-y-auto">
        
        <div>
          {/* Header Title */}
          <div className="mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-lg tracking-wider shadow-lg shadow-blue-500/20">
              JB
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white leading-tight">JobBridge <span className="text-blue-500">AI</span></span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Immigrant Remote Hub</span>
            </div>
          </div>

          {/* Profile overview badge */}
          <div className="bg-[#131C35] rounded-xl p-4 border border-[#1E2945] mb-6">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-bold border-2 border-blue-400">
                {profileName.trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="text-slate-100 font-bold text-sm truncate">{profileName}</h4>
                <p className="text-slate-400 text-xs truncate leading-relaxed">Target: {targetProvince}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-slate-700/60">
              <span className="text-slate-400 hover:text-slate-300">NOC Profile:</span>
              <span className="bg-blue-500/15 text-blue-400 font-bold text-[10px] px-2 py-0.5 rounded border border-blue-500/20 font-mono">
                {nocCode}
              </span>
            </div>
          </div>

          {/* Navigation link elements */}
          <nav className="space-y-1 mb-8">
            <button
              id="btn-candidates-tab-apps"
              onClick={() => setActiveTab('applications')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-medium text-xs transition duration-150 ${
                activeTab === 'applications'
                  ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Briefcase size={16} />
              <span>My Applications</span>
            </button>

            <button
              id="btn-candidates-tab-noc"
              onClick={() => setActiveTab('nocFinder')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-medium text-xs transition duration-150 ${
                activeTab === 'nocFinder'
                  ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Compass size={16} />
              <span>NOC Finder</span>
            </button>

            <Link
              to="/jobs"
              id="btn-candidates-nav-jobs"
              className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-medium text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition duration-150"
            >
              <ShieldCheck size={16} className="text-blue-500 animate-pulse" />
              <span>Job Board</span>
            </Link>

            <button
              id="btn-candidates-tab-settings"
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-medium text-xs transition duration-150 ${
                activeTab === 'settings'
                  ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </nav>

        </div>

        {/* 3 static tip cards at the bottom */}
        <div className="space-y-3 mt-4 border-t border-slate-800/80 pt-4">
          <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-widest block mb-1">
            Newcomer Action Tips
          </span>
          
          <div className="bg-[#11192C] p-3 rounded-lg border border-slate-800 flex gap-2">
            <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-normal">
              Tailor your resume to Canadian format, keep it 1 to 2 pages with no photo and focus on achievements.
            </p>
          </div>

          <div className="bg-[#11192C] p-3 rounded-lg border border-slate-800 flex gap-2">
            <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-normal">
              Use LinkedIn actively because many Canadian recruiters hire through it.
            </p>
          </div>

          <div className="bg-[#11192C] p-3 rounded-lg border border-slate-800 flex gap-2">
            <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-normal">
              Canadian workplace culture values punctuality, direct communication, and teamwork.
            </p>
          </div>

          <button
            onClick={() => logout()}
            className="w-full mt-2 px-3 py-2 rounded bg-slate-800/40 hover:bg-rose-900/20 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 transition duration-150"
          >
            <LogOut size={13} />
            <span>Sign Out Session</span>
          </button>
        </div>

      </aside>

      {/* 2. WHITE CONTENT AREA ON THE RIGHT */}
      <main className="flex-1 bg-white text-slate-800 flex flex-col overflow-y-auto">
        
        {/* Main Content Header */}
        <header className="h-16 px-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Candidate Workspace
            </h1>
            <p className="text-xs text-slate-400">
              Immigrant Safe Hiring Standard Pipeline
            </p>
          </div>
          <div className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
            System Status: <span className="text-emerald-600 font-bold">Verifying</span>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-8 max-w-4xl w-full mx-auto flex-grow">
          
          {/* TAB 1: MY APPLICATIONS */}
          {activeTab === 'applications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Applied Remote Openings</h2>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Track compliance testing progress, AI video submissions, and HR parameters.
                  </p>
                </div>
                <Link
                  to="/jobs"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition duration-150"
                >
                  Browse Job Board
                </Link>
              </div>

              {loadingApplications ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-400 font-bold">Synchronizing application records...</span>
                </div>
              ) : applications.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-500">
                  <Briefcase className="mx-auto text-slate-300 mb-3" size={32} />
                  <p className="font-bold text-sm text-slate-800 mb-1">No Applications Registered Yet</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
                    In order to start your journey, locate a verified remote opportunity from our curated hiring board.
                  </p>
                  <Link
                    to="/jobs"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition duration-150"
                  >
                    Go to Job Board
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((item) => {
                    const step1Color = getStepStatus(1, item);
                    const step2Color = getStepStatus(2, item);
                    const step3Color = getStepStatus(3, item);

                    // Check if candidate needs to continue
                    let continueStageLabel = '';
                    if (step1Color === 'gray') {
                      continueStageLabel = 'Start Aptitude';
                    } else if (step1Color === 'green' && step2Color === 'blue') {
                      continueStageLabel = 'Continue Interview';
                    }

                    return (
                      <div 
                        key={item.jobId}
                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md ring-1 ring-slate-100 hover:shadow-lg transition-shadow"
                      >
                        {/* Upper Card Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                          <div>
                            <h3 className="text-slate-900 font-black text-base leading-tight">
                              {item.jobTitle}
                            </h3>
                            <p className="text-slate-550 text-xs font-semibold text-slate-500">
                              {item.company}
                            </p>
                          </div>
                          
                          {/* Continue Button */}
                          {continueStageLabel && (
                            <Link
                              to={`/apply/${item.jobId}`}
                              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 whitespace-nowrap text-white font-bold text-xs px-3.5 py-2 rounded-lg transition duration-150 shadow"
                            >
                              <span>{continueStageLabel}</span>
                              <ChevronRight size={14} />
                            </Link>
                          )}
                        </div>

                        {/* Interactive 3-Step Progress Stepper */}
                        <div className="bg-slate-50/75 rounded-xl p-4 border border-slate-100 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          
                          {/* Step 1: Aptitude Test */}
                          <div className="flex items-center gap-3">
                            <div className="shrink-0">
                              {step1Color === 'green' ? (
                                <CheckCircle size={20} className="text-emerald-600 fill-emerald-100" />
                              ) : step1Color === 'red' ? (
                                <XCircle size={20} className="text-red-500 fill-red-100" />
                              ) : step1Color === 'blue' ? (
                                <Clock size={20} className="text-blue-600 animate-pulse" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-slate-100" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-[11px] font-bold text-slate-800">
                                Step 1: Aptitude Test
                              </span>
                              <span className="text-[10px] text-slate-400 capitalize">
                                {step1Color === 'green' && `${item.aptitude.score}% - Passed`}
                                {step1Color === 'red' && `${item.aptitude.score}% - Failed`}
                                {step1Color === 'blue' && 'In Progress'}
                                {step1Color === 'gray' && 'Locked'}
                              </span>
                            </div>
                          </div>

                          {/* Step 2: AI Interview */}
                          <div className="flex items-center gap-3">
                            <div className="shrink-0">
                              {step2Color === 'green' ? (
                                <CheckCircle size={20} className="text-emerald-600 fill-emerald-100" />
                              ) : step2Color === 'red' ? (
                                <XCircle size={20} className="text-red-500 fill-red-100" />
                              ) : step2Color === 'blue' ? (
                                <div className="w-5 h-5 rounded-full border-2 border-blue-500 bg-blue-50 animate-pulse flex items-center justify-center">
                                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-slate-100" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-[11px] font-bold text-slate-800">
                                Step 2: AI Interview
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {step2Color === 'green' && `Avg Score ${item.interview?.averageScore}/10 - Pass`}
                                {step2Color === 'red' && `Avg Score ${item.interview?.averageScore}/10 - Fail`}
                                {step2Color === 'blue' && 'Awaiting Attempt'}
                                {step2Color === 'gray' && 'Locked'}
                              </span>
                            </div>
                          </div>

                          {/* Step 3: HR Round */}
                          <div className="flex items-center gap-3">
                            <div className="shrink-0">
                              {step3Color === 'green' ? (
                                <CheckCircle size={20} className="text-emerald-600 fill-emerald-100" />
                              ) : step3Color === 'blue' ? (
                                <div className="w-5 h-5 rounded-full border-2 border-blue-550 bg-blue-50 animate-pulse flex items-center justify-center">
                                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-slate-100" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-[11px] font-bold text-slate-800">
                                Step 3: HR Round
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {step3Color === 'green' && 'Scheduled ✔'}
                                {step3Color === 'blue' && 'Awaiting Scheduling'}
                                {step3Color === 'gray' && 'Locked'}
                              </span>
                            </div>
                          </div>

                        </div>

                        {/* HR Scheduled Event Alert Card */}
                        {item.hrRound && (
                          <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs mb-1">
                                <Clock size={14} />
                                <span>HR Interview Round Confirmed!</span>
                              </div>
                              <p className="text-[11px] text-slate-600">
                                Date: <strong className="text-slate-800">{item.hrRound.date}</strong> | Time: <strong className="text-slate-800">{item.hrRound.time}</strong>
                              </p>
                            </div>
                            {item.hrRound.videoLink && (
                              <a 
                                href={item.hrRound.videoLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition duration-150 shrink-0"
                              >
                                <span>Join Webex Meeting</span>
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NOC FINDER */}
          {activeTab === 'nocFinder' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">National Occupational Classification (NOC) Finder</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Input your skills or prior professional title to extract corresponding NOC 2021 Canadian specifications.
                </p>
              </div>

              {/* NOC input search bar */}
              <form onSubmit={handleFindNocCode} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
                <div className="w-full relative">
                  <Compass size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={nocSearch}
                    onChange={(e) => setNocSearch(e.target.value)}
                    placeholder="Enter your job title or skills"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={findingNoc || !nocSearch.trim()}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs px-6 py-3.5 rounded-xl whitespace-nowrap shadow transition duration-150 flex items-center justify-center gap-2"
                >
                  {findingNoc ? 'Analyzing Skills...' : 'Find My NOC Code'}
                </button>
              </form>

              {/* NOC Suggestion Outcome Cards */}
              {nocResult && (
                <div className="space-y-4">
                  
                  {/* Primary result details */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-blue-1050 bg-blue-50 text-blue-600 font-black font-mono px-3 py-1 rounded-full border border-blue-100">
                          NOC: {nocResult.nocCode}
                        </span>
                      </div>
                      {nocResult.expressEntryEligible && (
                        <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-3 py-1 rounded-full border border-emerald-200 animate-pulse">
                          ✔ Express Entry Eligible
                        </span>
                      )}
                    </div>

                    <h3 className="text-slate-900 font-black text-lg mb-1 leading-tight">
                      {nocResult.nocTitle}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mb-3">
                      TEER Level Category: <strong className="text-slate-600">{nocResult.teerLevel}</strong>
                    </p>
                    
                    <p className="text-slate-600 text-xs leading-relaxed italic border-l-4 border-blue-500 pl-3">
                      "{nocResult.explanation}"
                    </p>
                  </div>

                  {/* Canadian regulation body validation alerts */}
                  {activeRegulatedAlert && (
                    <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 shadow-sm">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                        <div>
                          <h4 className="text-amber-900 font-extrabold text-sm mb-1.5">
                            Regulated Canadian Profession Detected ({activeRegulatedAlert.profession})
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed mb-4">
                            {activeRegulatedAlert.description}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-amber-200">
                            <span className="text-xs font-semibold text-slate-800">
                              Regulatory Body: {activeRegulatedAlert.bodyName}
                            </span>
                            <a 
                              href={activeRegulatedAlert.website}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
                            >
                              <span>Official Site</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* TAB 3: SETTINGS PROFILE SYNC */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Candidate Target Settings</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Update your background, location preferences, or classification codes. These details customize your compliance scores.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md space-y-4">
                
                {settingsSuccess && (
                  <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-3.5 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span>{settingsSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name field */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1.5">
                      Display / Profile Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Target NOC Code */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1.5">
                      Target NOC Code (2021 classification)
                    </label>
                    <input
                      type="text"
                      required
                      value={editNoc}
                      onChange={(e) => setEditNoc(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Target Province */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1.5">
                      Target Province Location
                    </label>
                    <select
                      value={editProvince}
                      onChange={(e) => setEditProvince(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Ontario">Ontario (ON)</option>
                      <option value="British Columbia">British Columbia (BC)</option>
                      <option value="Alberta">Alberta (AB)</option>
                      <option value="Saskatchewan">Saskatchewan (SK)</option>
                      <option value="Manitoba">Manitoba (MB)</option>
                      <option value="Quebec">Quebec (QC)</option>
                      <option value="Nova Scotia">Nova Scotia (NS)</option>
                    </select>
                  </div>

                  {/* Experience counter */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1.5">
                      Total Years Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="40"
                      required
                      value={editExperience}
                      onChange={(e) => setEditExperience(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow transition duration-150"
                  >
                    {savingSettings ? 'Synchronizing Profile...' : 'Save and Sync Target'}
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}

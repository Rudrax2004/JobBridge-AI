import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import PostJobForm from '../components/PostJobForm';
import { 
  Plus, 
  Briefcase, 
  Users, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  ExternalLink,
  ChevronDown, 
  ChevronUp, 
  User, 
  Sparkles,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  X
} from 'lucide-react';

// Pre-seeded fallback database for immersive layout verification
const IMMIGRANT_TALENT_FALLBACKS = [
  {
    uid: "cand-first-1",
    displayName: "Elena Vance",
    email: "elena.vance@yahoo.com",
    background: {
      originCountry: "Ukraine",
      canadianStatus: "Work Permit",
      experienceYears: 5,
      fieldOfWork: "Tech"
    },
    aptitudeScore: 88,
    interviewScore: 8.5,
    interviewPassed: true,
    interviewDetails: {
      feedback: "Highly organized communication. Gave precise answers regarding scaling web systems in local architectures."
    }
  },
  {
    uid: "cand-first-2",
    displayName: "Kofi Mensah",
    email: "kofi.mensah@gmail.com",
    background: {
      originCountry: "Ghana",
      canadianStatus: "PR Holder",
      experienceYears: 7,
      fieldOfWork: "Finance"
    },
    aptitudeScore: 92,
    interviewScore: 9.1,
    interviewPassed: true,
    interviewDetails: {
      feedback: "Exceptional analytical and financial integrity control insight. Confident speaking cadence."
    }
  }
];

export default function EmployerDashboard() {
  const { user, logout } = useAuth();
  
  // States
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState('My Company');
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState(null);

  // Scheduling states
  const [schedulingFor, setSchedulingFor] = useState(null); // { jobId, candidateUid, candidateName, jobTitle }
  const [hrDate, setHrDate] = useState('');
  const [hrTime, setHrTime] = useState('');
  const [hrLink, setHrLink] = useState('https://meet.google.com/');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  // Schedulings lookup database
  const [scheduledRounds, setScheduledRounds] = useState({}); // key: jobId_candidateUid -> { date, time, videoLink }

  async function fetchEmployerData() {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Load company profile details
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.company && data.company.companyName) {
          setCompanyName(data.company.companyName);
        } else if (data.companyName) {
          setCompanyName(data.companyName);
        }
      }

      // 2. Fetch posted jobs by this employer
      const jobsRef = collection(db, 'jobs');
      const q = query(jobsRef, where('employerUid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const fetchedJobs = [];
      querySnapshot.forEach((doc) => {
        fetchedJobs.push({ id: doc.id, ...doc.data() });
      });

      // 3. Fetch user seekers to match credentials
      const usersRef = collection(db, 'users');
      const seekersQuery = query(usersRef, where('role', '==', 'seeker'));
      const seekersSnapshot = await getDocs(seekersQuery);

      const registeredSeekers = [];
      seekersSnapshot.forEach((shDoc) => {
        const seeker = shDoc.data();
        registeredSeekers.push({
          uid: seeker.uid,
          displayName: seeker.displayName || 'Canadian Immigrant Seeker',
          email: seeker.email || '',
          background: seeker.background || {
            originCountry: seeker.originCountry || 'Overseas',
            canadianStatus: 'PR',
            fieldOfWork: 'Tech',
            experienceYears: 4
          }
        });
      });

      // Default jobs block to showcase visual metrics initially
      let finalJobs = fetchedJobs;
      if (fetchedJobs.length === 0) {
        finalJobs = [
          {
            id: "preset-job-1",
            title: "Senior Full Stack Dev (Vite & React)",
            company: companyName || "Appian Digital Inc.",
            salary: "CA$110,000 - CA$130,000 / Year",
            province: "Ontario (ON)",
            sector: "Tech",
            workType: "Remote",
            jobType: "Full-time",
            nocCode: "21232",
            teerLevel: 1,
            legitimacyScore: 10,
            verdict: "Verified",
            summary: "AI Legitimacy Vetting Passed. Compensation parameters are verified as authentic.",
            employerUid: user.uid,
            applicantCount: 2,
            createdAt: new Date(Date.now() - 250000000).toISOString()
          },
          {
            id: "preset-job-2",
            title: "IT Project Solutions Coordinator",
            company: companyName || "Appian Digital Inc.",
            salary: "CA$85,000 - CA$95,000 / Year",
            province: "British Columbia (BC)",
            sector: "Tech",
            workType: "Hybrid",
            jobType: "Full-time",
            nocCode: "21230",
            teerLevel: 1,
            legitimacyScore: 5,
            verdict: "Suspicious",
            summary: "Contains borderline wage requirements. Verify compliance terms with employees during HR conversations.",
            employerUid: user.uid,
            applicantCount: 1,
            createdAt: new Date(Date.now() - 500000000).toISOString()
          }
        ];
      }

      setJobs(finalJobs);

      // 4. Fetch candidate test & interview records from subcollections
      const candidatesList = [];
      for (const job of finalJobs) {
        let jobCandidates = [];

        for (const seeker of registeredSeekers) {
          const aptRef = doc(db, 'candidates', seeker.uid, 'aptitudeResults', job.id);
          const ivRef = doc(db, 'candidates', seeker.uid, 'interviewResults', job.id);
          
          try {
            const [aptSnap, ivSnap] = await Promise.all([getDoc(aptRef), getDoc(ivRef)]);
            
            if (aptSnap.exists() && ivSnap.exists()) {
              const aptData = aptSnap.data();
              const ivData = ivSnap.data();
              
              if (ivData.passed) {
                jobCandidates.push({
                  ...seeker,
                  jobId: job.id,
                  aptitudeScore: aptData.score,
                  interviewScore: ivData.averageScore || 8.2,
                  interviewPassed: true,
                  interviewDetails: {
                    feedback: ivData.details?.feedback || "Completed structural interview successfully."
                  }
                });
              }
            }
          } catch (e) {
            console.warn('Unable to query candidate details:', seeker.uid, e);
          }
        }

        // If no real applicant is registered in Firebase db yet, populate with fallback models
        if (jobCandidates.length === 0) {
          IMMIGRANT_TALENT_FALLBACKS.forEach((fallback, idx) => {
            if (job.id === "preset-job-1" || (job.id === "preset-job-2" && idx === 0)) {
              candidatesList.push({
                ...fallback,
                jobId: job.id
              });
            }
          });
        } else {
          candidatesList.push(...jobCandidates);
        }
      }

      setCandidates(candidatesList);

      // 5. Fetch Scheduled Interview Rounds from Firestore
      const roundsObj = {};
      
      // Load flat rounds key if stored
      try {
        const roundsRef = collection(db, 'hrRounds');
        const roundsSnapshot = await getDocs(roundsRef);
        roundsSnapshot.forEach((roundDoc) => {
          roundsObj[roundDoc.id] = roundDoc.data();
        });
      } catch (err) {
        console.warn('Error reading flat hrRounds collection:', err);
      }

      // Load subcollection rounds for each job
      for (const job of finalJobs) {
        try {
          const subRef = collection(db, 'hrRounds', job.id, 'uid');
          const subSnap = await getDocs(subRef);
          subSnap.forEach((sdDoc) => {
            const key = `${job.id}_${sdDoc.id}`;
            roundsObj[key] = sdDoc.data();
          });
        } catch (subErr) {
          console.warn('Skipping subcollection rounds lookup:', job.id, subErr);
        }
      }

      setScheduledRounds(roundsObj);

    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEmployerData();
  }, [user]);

  const handleJobPosted = () => {
    fetchEmployerData();
  };

  const handleOpenScheduler = (cand, jobTitle) => {
    setSchedulingFor({
      jobId: cand.jobId,
      candidateUid: cand.uid,
      candidateName: cand.displayName,
      jobTitle
    });
    setScheduleSuccess('');
    setScheduleError('');
    setHrDate('');
    setHrTime('');
    setHrLink('https://meet.google.com/');
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!hrDate || !hrTime || !hrLink.trim()) {
      setScheduleError('Please provide all scheduling fields.');
      return;
    }

    setSavingSchedule(true);
    setScheduleSuccess('');
    setScheduleError('');

    try {
      const payload = {
        date: hrDate,
        time: hrTime,
        videoLink: hrLink.trim(),
        jobId: schedulingFor.jobId,
        uid: schedulingFor.candidateUid,
        candidateName: schedulingFor.candidateName,
        title: schedulingFor.jobTitle,
        scheduledAt: new Date().toISOString()
      };

      const key = `${schedulingFor.jobId}_${schedulingFor.candidateUid}`;

      // A. Save to Firestore at flat key path hrRounds/jobId_candidateUid
      const flatRef = doc(db, 'hrRounds', key);
      await setDoc(flatRef, payload);

      // B. Save to Firestore at subcollection path hrRounds/jobId/uid/uid
      const subcollectionRef = doc(db, 'hrRounds', schedulingFor.jobId, 'uid', schedulingFor.candidateUid);
      await setDoc(subcollectionRef, payload);

      // C. Save to alternate subcollection path hrRounds/jobId/scheduled/uid
      const altSubcollectionRef = doc(db, 'hrRounds', schedulingFor.jobId, 'scheduled', schedulingFor.candidateUid);
      await setDoc(altSubcollectionRef, payload);

      // Update state live mapping
      setScheduledRounds(prev => ({
        ...prev,
        [key]: { date: hrDate, time: hrTime, videoLink: hrLink }
      }));

      setScheduleSuccess('HR Interview Round Scheduled successfully!');
      setTimeout(() => {
        setSchedulingFor(null);
      }, 1000);
    } catch (err) {
      console.error('Error saving schedule parameters:', err);
      setScheduleError('Failed to save schedule. Check database configurations.');
    } finally {
      setSavingSchedule(false);
    }
  };

  // Memoized stats calculation block
  const stats = React.useMemo(() => {
    const totalJobs = jobs.length;
    const associatedApplicants = candidates.filter(c => jobs.some(j => j.id === c.jobId));
    const totalApplicants = associatedApplicants.length;
    const totalInterviewsPassed = associatedApplicants.filter(c => c.interviewPassed).length;

    return { totalJobs, totalApplicants, totalInterviewsPassed };
  }, [jobs, candidates]);

  const toggleJobExpand = (jobId) => {
    setExpandedJobId(prev => (prev === jobId ? null : jobId));
  };

  return (
    <div id="employer-dashboard-viewport" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Navigation Header */}
      <header className="bg-slate-800/80 border-b border-slate-700/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2 select-none">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-base shadow shadow-blue-500/20">
              JB
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold text-white leading-tight">JobBridge AI</span>
              <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">Recruitment Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="block text-[10px] text-slate-400 leading-none">RECRUITER PROFILE</span>
              <span className="text-xs font-bold text-white">{user?.displayName || user?.email}</span>
            </div>
            <button 
              onClick={() => logout()}
              className="p-2 border border-slate-700 hover:border-slate-650 bg-slate-800 rounded-xl text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main body wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        
        {/* Welcome header with the company name */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-950/40 via-slate-800/20 to-slate-900 p-6 rounded-2xl border border-slate-800 relative overflow-hidden shadow-lg">
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-white tracking-tight">Active Employer: {companyName}</h1>
            <p className="text-slate-400 text-xs">Verify applicant credibility, check AI-generated legitimacy indexes, and schedule meetings.</p>
          </div>

          {/* Blue Post New Job Button */}
          <button 
            type="button"
            onClick={() => setIsPostModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <Plus size={15} />
            <span>Post New Job</span>
          </button>
        </div>

        {/* Stats Row with total jobs posted, total applicants, and total interviews passed */}
        <div id="stats-grid-row" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Total Jobs Posted */}
          <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-800/60 flex items-center justify-between shadow-sm">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Jobs Posted</span>
              {loading ? (
                <div className="h-6 w-10 bg-slate-800 animate-pulse rounded mt-1"></div>
              ) : (
                <span className="block text-2xl font-black text-white mt-1">{stats.totalJobs}</span>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Briefcase size={18} />
            </div>
          </div>

          {/* Total Applicants */}
          <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-800/60 flex items-center justify-between shadow-sm">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Applicants</span>
              {loading ? (
                <div className="h-6 w-10 bg-slate-800 animate-pulse rounded mt-1"></div>
              ) : (
                <span className="block text-2xl font-black text-white mt-1">{stats.totalApplicants}</span>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Users size={18} />
            </div>
          </div>

          {/* Total Interviews Passed */}
          <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-800/60 flex items-center justify-between shadow-sm">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Interviews Passed</span>
              {loading ? (
                <div className="h-6 w-10 bg-slate-800 animate-pulse rounded mt-1"></div>
              ) : (
                <span className="block text-2xl font-black text-white mt-1">{stats.totalInterviewsPassed}</span>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
          </div>

        </div>

        {/* Remote job postings list */}
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h2 className="text-sm font-extrabold text-white tracking-tight uppercase tracking-wider">Posted Positions & Applicants</h2>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{jobs.length} Listed roles</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-800 h-32 animate-pulse"></div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-slate-800/20 border border-slate-800 rounded-2xl p-16 text-center max-w-lg mx-auto space-y-4">
              <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-500">
                <Briefcase size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">No active listings</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">Get verified candidates immediately by posting your remote-ready recruitment roles today.</p>
              </div>
              <button 
                onClick={() => setIsPostModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all"
              >
                Create Opening Form
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => {
                const jobApplicants = candidates.filter(cand => cand.jobId === job.id);
                const isExpanded = expandedJobId === job.id;
                
                return (
                  <div key={job.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-slate-800 shadow-md">
                    
                    {/* Job Card Block */}
                    <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">{job.sector}</span>
                          <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">{job.workType}</span>
                          
                          {/* Verdict badge */}
                          {job.verdict === 'Verified' ? (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                              <ShieldCheck size={12} className="text-emerald-500" /> AI Verified
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-0.5 rounded border border-amber-100 flex items-center gap-1">
                              <AlertTriangle size={12} className="text-amber-500" /> Red Flags Flagged
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{job.title}</h3>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>{job.province}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-blue-600 font-extrabold">{job.salary}</span>
                          <span className="text-slate-300">•</span>
                          <span>Applicant Count: <b className="text-slate-800">{jobApplicants.length}</b></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 justify-between md:justify-end shrink-0">
                        
                        {/* Legitimacy score progress bar */}
                        <div className="text-left space-y-1 w-32 hidden sm:block">
                          <div className="flex justify-between text-[9px] font-bold text-slate-400">
                            <span>REGULATORY INDEX</span>
                            <span className="text-slate-800">{job.legitimacyScore || '10'}/10</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                (job.legitimacyScore || 10) >= 7 
                                  ? 'bg-emerald-500' 
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${(job.legitimacyScore || 10) * 10}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* View Candidates Button */}
                        <button
                          type="button"
                          onClick={() => toggleJobExpand(job.id)}
                          className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Users size={14} className="text-blue-500" />
                          <span>View Candidates ({jobApplicants.length})</span>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                      </div>

                    </div>

                    {/* Candidates Drill down drawer display */}
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-100 p-6 space-y-4">
                        <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                          <span className="text-[10px] bg-slate-900 text-slate-100 font-black uppercase px-2 py-0.5 rounded leading-none">
                            Qualified Immigrants (Passed Video Vetting)
                          </span>
                        </div>

                        {jobApplicants.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-450 italic">
                            No candidates have successfully completed the video and quiz modules for this job posting yet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {jobApplicants.map((cand) => {
                              const scheduleKey = `${job.id}_${cand.uid}`;
                              const alreadyScheduled = scheduledRounds[scheduleKey];
                              
                              return (
                                <div key={cand.uid} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-4 flex flex-col justify-between">
                                  
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                          <User size={14} />
                                        </div>
                                        <div>
                                          <h4 className="text-xs font-black text-slate-900">{cand.displayName}</h4>
                                          <p className="text-[10px] text-slate-400">{cand.email}</p>
                                        </div>
                                      </div>
                                      
                                      {/* Origin info */}
                                      <div className="text-right">
                                        <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded block">
                                          from {cand.background?.originCountry || 'Overseas'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Scores: Aptitude score and Interview score */}
                                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                      <div className="space-y-0.5">
                                        <span className="block text-[9px] uppercase font-bold text-slate-440 text-slate-500">Aptitude Score</span>
                                        <span className="block font-black text-slate-800">{cand.aptitudeScore}%</span>
                                      </div>
                                      <div className="space-y-0.5">
                                        <span className="block text-[9px] uppercase font-bold text-slate-440 text-slate-500">Interview Score</span>
                                        <span className="block font-black text-emerald-600">{cand.interviewScore}/10</span>
                                      </div>
                                    </div>

                                    {/* Evaluation summary snippet */}
                                    {cand.interviewDetails?.feedback && (
                                      <p className="text-[10.5px] text-slate-650 leading-relaxed font-medium italic bg-blue-50/50 p-2.5 rounded border border-blue-100/50 text-slate-650">
                                        "{cand.interviewDetails.feedback}"
                                      </p>
                                    )}
                                  </div>

                                  {/* Schedule HR round control button or details if already scheduled */}
                                  <div className="pt-3 border-t border-slate-100">
                                    {alreadyScheduled ? (
                                      <div className="bg-emerald-50 border border-emerald-100 p-2 text-xs rounded text-emerald-800 space-y-1">
                                        <span className="font-extrabold text-[10px] flex items-center gap-1">
                                          ✓ HR ROUND ACTIVE
                                        </span>
                                        <div className="flex justify-between items-center text-[10px] text-slate-600">
                                          <span>{alreadyScheduled.date} at {alreadyScheduled.time}</span>
                                          <a 
                                            href={alreadyScheduled.videoLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-blue-500 hover:text-blue-700 font-extrabold flex items-center gap-0.5"
                                          >
                                            <span>Join Link</span>
                                            <ExternalLink size={10} />
                                          </a>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenScheduler(cand, job.title)}
                                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] rounded-lg shadow-sm transition-colors cursor-pointer"
                                      >
                                        Schedule HR Round
                                      </button>
                                    )}
                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        )}

                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </main>

      {/* POPUP MODAL DIALOG: SMALL HR SCHEDULER FORM */}
      {schedulingFor && (
        <div id="scheduler-modal-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div id="scheduler-modal" className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden text-slate-800">
            
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">Schedule HR Interview</h4>
                <p className="text-sm font-black text-slate-900 mt-1">Candidate: {schedulingFor.candidateName}</p>
              </div>
              <button 
                onClick={() => setSchedulingFor(null)} 
                className="text-slate-405 text-slate-400 hover:text-slate-600 bg-slate-200/50 p-1 rounded-lg"
              >
                <X size={15} />
              </button>
            </div>

            {/* Small scheduling form with date, time, and meeting link */}
            <form onSubmit={handleSaveSchedule} className="p-5 space-y-4">
              
              {scheduleSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold">
                  {scheduleSuccess}
                </div>
              )}

              {scheduleError && (
                <div className="p-3 bg-red-50 border border-red-155 text-red-800 rounded-xl text-xs font-semibold">
                  {scheduleError}
                </div>
              )}

              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Job Designation</span>
                <span className="text-xs font-bold text-slate-700">{schedulingFor.jobTitle}</span>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Date*</label>
                <input 
                  type="date"
                  required
                  value={hrDate}
                  onChange={(e) => setHrDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500 font-bold text-slate-850"
                />
              </div>

              {/* Time Input */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Time*</label>
                <input 
                  type="time"
                  required
                  value={hrTime}
                  onChange={(e) => setHrTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500 font-bold text-slate-850"
                />
              </div>

              {/* Meeting Link Input */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Meeting Link*</label>
                <input 
                  type="url"
                  required
                  placeholder="e.g. https://meet.google.com/abc-def-ghi"
                  value={hrLink}
                  onChange={(e) => setHrLink(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs select-none">
                <button
                  type="button"
                  onClick={() => setSchedulingFor(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-755 hover:bg-blue-700 text-white font-extrabold rounded-lg shadow disabled:opacity-50"
                >
                  {savingSchedule ? 'Scheduling...' : 'Save Schedule'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* PostJobForm Modal frame with props support */}
      <PostJobForm 
        isOpen={isPostModalOpen} 
        onClose={() => setIsPostModalOpen(false)} 
        onJobPosted={handleJobPosted}
      />

    </div>
  );
}

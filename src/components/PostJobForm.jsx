import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { scoreJobLegitimacy } from '../gemini';
import { 
  X, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  HelpCircle 
} from 'lucide-react';

const CANADIAN_PROVINCES = [
  'Ontario (ON)',
  'British Columbia (BC)',
  'Alberta (AB)',
  'Quebec (QC)',
  'Manitoba (MB)',
  'Saskatchewan (SK)',
  'Nova Scotia (NS)',
  'New Brunswick (NB)',
  'Newfoundland and Labrador (NL)',
  'Prince Edward Island (PEI)',
  'Northwest Territories (NT)',
  'Yukon (YT)',
  'Nunavut (NU)'
];

const SECTORS = ['Tech', 'Healthcare', 'Finance', 'Trades', 'Education', 'Other'];

export default function PostJobForm({ isOpen, onClose, onJobPosted }) {
  const { user } = useAuth();
  
  // Form inputs
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [province, setProvince] = useState(CANADIAN_PROVINCES[0]);
  const [sector, setSector] = useState(SECTORS[0]);
  const [workType, setWorkType] = useState('Remote');
  const [jobType, setJobType] = useState('Full-time');
  const [nocCode, setNocCode] = useState('');
  const [teerLevel, setTeerLevel] = useState('0');
  const [yearsExperience, setYearsExperience] = useState('0');

  // Logic states
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [checkingLegitimacy, setCheckingLegitimacy] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [aiResult, setAiResult] = useState(null); // { score, flags, verdict, summary }
  const [errorText, setErrorText] = useState('');

  // Pre-fill company name from the employer profile on edit or mount
  useEffect(() => {
    async function loadEmployerProfile() {
      if (!user) return;
      setLoadingProfile(true);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.role === 'employer') {
            if (data.company && data.company.companyName) {
              setCompanyName(data.company.companyName);
            } else if (data.companyName) {
              setCompanyName(data.companyName);
            }
          }
        }
      } catch (err) {
        console.error('Error loading employer profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    }
    if (isOpen) {
      loadEmployerProfile();
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  // Format combined text for Gemini AI scam detection scan
  const buildJobInspectionText = () => {
    return `
Job Title: ${jobTitle}
Company Name: ${companyName}
Salary Range: CA$${salaryMin} - CA$${salaryMax} annually
Province: ${province}
Sector: ${sector}
Work Term: ${workType}
Job Type: ${jobType}
Required NOC: ${nocCode || 'Unspecified'} (TEER ${teerLevel})
Required Experience: ${yearsExperience} years
Job Description details:
${jobDescription}
    `.trim();
  };

  const handleValidateForm = () => {
    if (!jobTitle.trim()) return 'Job title is required.';
    if (!companyName.trim()) return 'Company name is required.';
    if (jobDescription.trim().length < 100) {
      return `Job description requires at least 100 characters. Currently at ${jobDescription.trim().length} characters.`;
    }
    if (!salaryMin || isNaN(Number(salaryMin)) || Number(salaryMin) <= 0) {
      return 'Please enter a valid minimum salary.';
    }
    if (!salaryMax || isNaN(Number(salaryMax)) || Number(salaryMax) <= 0) {
      return 'Please enter a valid maximum salary.';
    }
    if (Number(salaryMin) > Number(salaryMax)) {
      return 'Minimum salary cannot exceed maximum salary.';
    }
    if (!yearsExperience || isNaN(Number(yearsExperience)) || Number(yearsExperience) < 0) {
      return 'Please provide valid minimum experience years.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorText('');
    setAiResult(null);

    const validationError = handleValidateForm();
    if (validationError) {
      setErrorText(validationError);
      return;
    }

    setCheckingLegitimacy(true);
    try {
      const inspectText = buildJobInspectionText();
      const result = await scoreJobLegitimacy(inspectText);

      if (!result) {
        throw new Error('AI legitimacy scan returned empty payload.');
      }

      // Calculate verdict securely based on score boundary constraints:
      // Rejected: score < 5
      // Suspicious: score between 5 and 6
      // Verified: score >= 7
      let finalVerdict = result.verdict || 'Verified';
      if (result.score < 5) {
        finalVerdict = 'Rejected';
      } else if (result.score === 5 || result.score === 6) {
        finalVerdict = 'Suspicious';
      } else if (result.score >= 7) {
        finalVerdict = 'Verified';
      }

      const boundResult = {
        score: result.score,
        flags: result.flags || [],
        verdict: finalVerdict,
        summary: result.summary || 'Job posting legitimacy details verified.'
      };

      setAiResult(boundResult);
      
      // If Verified (score >= 7), save immediately to Firestore as requested
      if (boundResult.verdict === 'Verified') {
        await saveJobData(boundResult);
      }
    } catch (err) {
      console.error('Error analyzing job postings:', err);
      setErrorText('Failed to perform AI legitimacy analysis. Please check your connection and try again.');
    } finally {
      setCheckingLegitimacy(false);
    }
  };

  const saveJobData = async (aiFeedback) => {
    setSavingJob(true);
    try {
      const derivedSalary = `CA$${Number(salaryMin).toLocaleString()} - CA$${Number(salaryMax).toLocaleString()} / Year`;
      
      const jobPayload = {
        title: jobTitle,
        company: companyName,
        description: jobDescription,
        salaryMin: Number(salaryMin),
        salaryMax: Number(salaryMax),
        salary: derivedSalary,
        province,
        sector,
        workType,
        jobType,
        nocCode: nocCode.trim() || 'N/A',
        teerLevel: Number(teerLevel),
        experienceYears: Number(yearsExperience),
        legitimacyScore: aiFeedback.score,
        verdict: aiFeedback.verdict,
        flags: aiFeedback.flags || [],
        summary: aiFeedback.summary || 'Verified legitimate remote job opportunity.',
        employerUid: user.uid,
        applicantCount: 0,
        createdAt: new Date().toISOString()
      };

      const jobsCollection = collection(db, 'jobs');
      await addDoc(jobsCollection, jobPayload);
    } catch (err) {
      console.error('Error registering job document:', err);
      setErrorText('Error saving job to database. Verify authorization rules.');
    } finally {
      setSavingJob(false);
    }
  };

  const confirmSuspiciousPost = async () => {
    if (!aiResult) return;
    await saveJobData(aiResult);
    onJobPosted();
    onClose();
    resetForm();
  };

  const handleVerifiedFinish = () => {
    onJobPosted();
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setJobTitle('');
    setJobDescription('');
    setSalaryMin('');
    setSalaryMax('');
    setProvince(CANADIAN_PROVINCES[0]);
    setSector(SECTORS[0]);
    setWorkType('Remote');
    setJobType('Full-time');
    setNocCode('');
    setTeerLevel('0');
    setYearsExperience('0');
    setAiResult(null);
    setErrorText('');
  };

  return (
    <div id="post-job-modal-overlay" className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      
      {/* Centered white modal with rounded corners and large shadow */}
      <div id="post-job-modal" className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden my-8 max-h-[90vh] flex flex-col text-slate-800">
        
        {/* Header Block */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold">
              💼
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 leading-tight">Post New Job</h2>
              <p className="text-[10px] text-slate-500">Subject to real-time AI security scans to block fraud and remote traps.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 relative">
          
          {errorText && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-start gap-2">
              <span className="text-red-500 mt-0.5">⚠️</span>
              <p>{errorText}</p>
            </div>
          )}

          {/* AI VERIFYING SPINNER OVERLAY */}
          {checkingLegitimacy && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
              <div className="relative mb-4 flex items-center justify-center">
                <div className="absolute inset-0 w-16 h-16 bg-blue-500/15 rounded-full animate-ping"></div>
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
                  <Sparkles size={24} className="animate-spin" />
                </div>
              </div>
              <h4 className="text-sm font-black text-slate-900 mb-1">AI is verifying your job posting</h4>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Our Gemini parser is checking remuneration standards, compliance benchmarks, and scanning against scam patterns.
              </p>
            </div>
          )}

          {/* AI RESULT VERDICT INTERFACE */}
          {aiResult && (
            <div className="absolute inset-0 bg-white z-20 flex flex-col justify-between max-h-full">
              
              <div className="p-6 overflow-y-auto flex-1 space-y-6 flex flex-col justify-center items-center text-center">
                
                {/* 1. REJECTED VERDICT COVER (Score < 5) */}
                {aiResult.verdict === 'Rejected' && (
                  <div className="space-y-4 max-w-md animate-fade-in">
                    <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl font-bold">
                      ✕
                    </div>
                    <div>
                      <span className="bg-red-100 text-red-700 text-[10px] font-black uppercase px-3 py-1 rounded-full text-xs">
                        Scam Vector Detected
                      </span>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight mt-3">Job Posting Analysis Rejected</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        This listing failed the security assessment with a score of <b className="text-red-600">{aiResult.score}/10</b>. We do not allow posting roles with suspicious parameters to protect newcomers.
                      </p>
                    </div>

                    {aiResult.flags.length > 0 && (
                      <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-left">
                        <h4 className="text-xs font-black text-red-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <ShieldAlert size={14} /> Critical Issues Flagged:
                        </h4>
                        <ul className="space-y-1.5">
                          {aiResult.flags.map((flag, idx) => (
                            <li key={idx} className="text-xs text-red-750 flex items-baseline gap-1.5">
                              <span className="text-red-500 font-bold">•</span>
                              <span>{flag}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. SUSPICIOUS VERDICT COVER (Score 5-6) */}
                {aiResult.verdict === 'Suspicious' && (
                  <div className="space-y-4 max-w-md animate-fade-in">
                    <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl font-bold">
                      <AlertTriangle size={28} />
                    </div>
                    <div>
                      <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-3 py-1 rounded-full text-xs">
                        Vulnerability Warning
                      </span>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight mt-3">Suspicious Flagged Indicators</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        This job has a borderline rating of <b className="text-amber-600">{aiResult.score}/10</b> due to potential communication anomalies or compensation ambiguities.
                      </p>
                    </div>

                    {aiResult.flags.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                        <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <AlertTriangle size={14} /> Attention Flags:
                        </h4>
                        <ul className="space-y-1.5">
                          {aiResult.flags.map((flag, idx) => (
                            <li key={idx} className="text-xs text-amber-700 flex items-baseline gap-1.5">
                              <span className="text-amber-500">•</span>
                              <span>{flag}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 italic">
                      Please confirm that this remote role matches all Canada Employment Standard guidelines.
                    </p>
                  </div>
                )}

                {/* 3. VERIFIED VERDICT COVER (Score >= 7) */}
                {aiResult.verdict === 'Verified' && (
                  <div className="space-y-4 max-w-md py-6 animate-fade-in">
                    <div className="relative inline-flex items-center justify-center">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
                      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold relative">
                        <CheckCircle2 size={32} />
                      </div>
                    </div>
                    <div>
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-3 py-1 rounded-full text-xs">
                        Legitimacy Verified
                      </span>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight mt-3">Job Verified & Published!</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Earned a legal trust score of <b className="text-emerald-600">{aiResult.score}/10</b>. This opportunity is now active for qualified incoming newcomers.
                      </p>
                    </div>
                    {aiResult.summary && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-xs text-emerald-800 leading-snug font-medium">
                        "{aiResult.summary}"
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Action Buttons for AI covers */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                {aiResult.verdict === 'Rejected' && (
                  <button
                    onClick={() => setAiResult(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-705 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Adjust Fields
                  </button>
                )}

                {aiResult.verdict === 'Suspicious' && (
                  <>
                    <button
                      onClick={() => setAiResult(null)}
                      className="px-4 py-2 bg-slate-205 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      Back to Editing
                    </button>
                    <button
                      onClick={confirmSuspiciousPost}
                      disabled={savingJob}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 font-bold text-xs text-white rounded-xl flex items-center gap-1.5 transition-opacity disabled:opacity-50"
                    >
                      {savingJob ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        'Confirm & Post Anyway'
                      )}
                    </button>
                  </>
                )}

                {aiResult.verdict === 'Verified' && (
                  <button
                    onClick={handleVerifiedFinish}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Core Form Fields */}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Input Job Title */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Job Title*</label>
              <input 
                type="text"
                required
                placeholder="e.g. Remote Backend Coordinator"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Input Company Name (Pre-filled) */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Company Name*</label>
              <input 
                type="text"
                required
                placeholder="Pre-filled automatically from corporate profile..."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={loadingProfile}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-75"
              />
            </div>

            {/* Job Description with criteria check */}
            <div className="sm:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Job Description (At least 100 char)*</label>
                <span className={`text-[9px] font-bold ${jobDescription.trim().length >= 100 ? 'text-emerald-500' : 'text-slate-450'}`}>
                  {jobDescription.trim().length}/100 Character Target
                </span>
              </div>
              <textarea 
                required
                rows={4}
                placeholder="Describe day-to-day work tasks, tooling requirements, standard work protocols. (Minimum 100 characters required)"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
              />
            </div>

            {/* Salary Minimum and Maximum side-by-side */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Salary Minimum (Annual CA$)*</label>
              <input 
                type="number"
                required
                placeholder="e.g. 60000"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Salary Maximum (Annual CA$)*</label>
              <input 
                type="number"
                required
                placeholder="e.g. 85000"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Province selector */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Province*</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none cursor-pointer"
              >
                {CANADIAN_PROVINCES.map((p, index) => (
                  <option key={index} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Sector selector */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Sector*</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none cursor-pointer"
              >
                {SECTORS.map((s, index) => (
                  <option key={index} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Work type Option */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Work Type*</label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none cursor-pointer"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Onsite">Onsite</option>
              </select>
            </div>

            {/* Job Type Option */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Job Type*</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-210 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none cursor-pointer"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Internship">Internship</option>
                <option value="Student">Student</option>
              </select>
            </div>

            {/* NOC occupation Code */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Required NOC Code (Optional)</label>
              <input 
                type="text"
                placeholder="e.g. 21232"
                value={nocCode}
                onChange={(e) => setNocCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* TEER level */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">TEER Level*</label>
              <select
                value={teerLevel}
                onChange={(e) => setTeerLevel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none cursor-pointer"
              >
                <option value="0">TEER 0 (Management)</option>
                <option value="1">TEER 1 (Professional)</option>
                <option value="2">TEER 2 (Technical & Trades)</option>
                <option value="3">TEER 3 (Intermediate)</option>
                <option value="4">TEER 4 (Semi-Skilled / Admin)</option>
                <option value="5">TEER 5 (Entry Level)</option>
              </select>
            </div>

            {/* Required years of experience */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Required Years of Experience*</label>
              <input 
                type="number"
                min="0"
                required
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Form actions */}
            <div className="sm:col-span-2 pt-4 border-t border-slate-100 flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 text-slate-600 text-xs font-bold rounded-xl transition-colors shrink-0"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-blue-500/10 shrink-0"
              >
                <Sparkles size={14} />
                <span>Verify with AI</span>
              </button>
            </div>

          </form>

        </div>

      </div>

    </div>
  );
}

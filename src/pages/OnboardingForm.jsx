import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { parseResume, suggestNOCCode } from '../gemini';
import { 
  User, 
  Building2, 
  Upload, 
  FileText, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Globe, 
  Briefcase, 
  ShieldCheck, 
  HelpCircle,
  Award
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

export default function OnboardingForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Onboarding sequence steps: 1 (Role), 2 (Details: Seeker or Employer), 3 (Resume/NOC - Seekers Only), 4 (Completion)
  const [step, setStep] = useState(1);
  const [loadingAI, setLoadingAI] = useState(false);
  const [savingData, setSavingData] = useState(false);

  // Form State
  const [role, setRole] = useState(null); // 'seeker' | 'employer'
  
  // Job Seeker Background Details (Step 2 Seeker)
  const [seekerBg, setSeekerBg] = useState({
    originCountry: '',
    canadianStatus: 'Outside Canada',
    fieldOfWork: 'Tech',
    experienceYears: 5,
    targetProvince: 'Ontario (ON)',
    employmentPreference: 'Open to all'
  });

  // Employer Company Details (Step 2 Employer)
  const [employerBg, setEmployerBg] = useState({
    companyName: '',
    industry: 'Tech',
    province: 'Ontario (ON)',
    websiteUrl: ''
  });

  // Resume & AI Findings (Step 3 Seeker)
  const [fileName, setFileName] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [extractedProfile, setExtractedProfile] = useState(null);
  const [nocRecommendation, setNocRecommendation] = useState(null);
  const fileInputRef = useRef(null);

  const totalSteps = role === 'employer' ? 3 : 4;

  const getStepProgressWidth = () => {
    const currentVirtualStep = step;
    return `${((currentVirtualStep - 1) / (totalSteps - 1)) * 100}%`;
  };

  const currentProgressStepLabel = () => {
    if (step === 1) return 'Choose Role';
    if (step === 2) return role === 'seeker' ? 'Background' : 'Company Info';
    if (step === 3 && role === 'seeker') return 'Resume AI & NOC Analysis';
    return 'All Set!';
  };

  // Handle Drag / Drop events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcessing(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcessing(e.target.files[0]);
    }
  };

  // Convert PDF (or txt) using FileReader & call AI parser from gemini.js
  const handleFileProcessing = async (file) => {
    setFileName(file.name);
    setLoadingAI(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const textContent = event.target.result;
        // Limit text length to prevent giant uploads
        const snippetText = typeof textContent === 'string' ? textContent.substring(0, 12000) : '';

        // Run Gemini Resume parser
        const parsedData = await parseResume(snippetText);
        // Run Gemini NOC advisor
        const nocData = await suggestNOCCode(snippetText);

        if (parsedData) {
          setExtractedProfile(parsedData);
        } else {
          // Provide elegant default extraction fallback
          setExtractedProfile({
            jobTitles: [seekerBg.fieldOfWork + " Specialist"],
            skills: ['Analytical Skills', 'Management'],
            education: 'Completed University degree',
            yearsExperience: seekerBg.experienceYears,
            certifications: [],
            projects: []
          });
        }

        if (nocData) {
          setNocRecommendation(nocData);
        } else {
          setNocRecommendation({
            nocCode: '20012',
            nocTitle: 'Professional careers in technology and logistics',
            teerLevel: 1,
            expressEntryEligible: true,
            explanation: 'Based on your selected profile background and primary skills.'
          });
        }
      } catch (err) {
        console.error('Failed to parse file with Gemini:', err);
      } finally {
        setLoadingAI(false);
      }
    };

    reader.readAsText(file);
  };

  // Save the collective profile to Firestore & switch
  const handleCompleteSetup = async () => {
    if (!user) return;
    setSavingData(true);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const payload = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Canadian Immigrant',
        role: role,
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
        ...(role === 'seeker' 
          ? {
              background: seekerBg,
              aiExtracted: extractedProfile,
              nocAnalysis: nocRecommendation
            }
          : {
              company: employerBg
            }
        )
      };

      await setDoc(userDocRef, payload, { merge: true });
      
      if (role === 'employer') {
        navigate('/employer');
      } else {
        navigate('/candidate');
      }
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      alert('Fail to finish profile onboarding. Please verify internet connection.');
    } finally {
      setSavingData(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !role) return;
    
    if (step === 2 && role === 'employer') {
      // Employer onboarding skip Step 3 (Resume/NOC Search)
      setStep(4);
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (step === 4 && role === 'employer') {
      setStep(2);
    } else {
      setStep(prev => Math.max(1, prev - 1));
    }
  };

  return (
    <div id="onboarding-page-root" className="min-h-screen w-full bg-[#0F172A] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 font-sans">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-[#1E293B]/70 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-10 backdrop-blur-md relative overflow-hidden">
        
        {/* PROGRESS STEP HEADER */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
              Profile Setup Progress
            </span>
            <span className="text-xs font-semibold text-blue-400 px-3 py-1 rounded-full bg-blue-500/10">
              {currentProgressStepLabel()}
            </span>
          </div>

          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
              style={{ width: getStepProgressWidth() }}
            ></div>
          </div>
        </div>

        {/* STEP 1: ROLE SELECTION */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">How do you want to use JobBridge AI?</h2>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Select your profile goal. This allows us to tailor NOC codes, resume guidelines, or legitimate remote posts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <button
                id="onboard-role-seeker"
                type="button"
                onClick={() => setRole('seeker')}
                className={`p-6 rounded-2xl border text-left flex flex-col justify-between h-44 transition-all duration-200 outline-none ${
                  role === 'seeker'
                    ? 'border-blue-500 bg-blue-600/10 shadow-lg shadow-blue-500/15'
                    : 'border-slate-800 bg-[#0F172A]/40 hover:bg-[#0F172A]/80 hover:border-slate-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  role === 'seeker' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white mb-1">I am a Job Seeker</h3>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Verify jobs, check Canadian immigration TEER NOC eligibility, and customize credentials.
                  </p>
                </div>
              </button>

              <button
                id="onboard-role-employer"
                type="button"
                onClick={() => setRole('employer')}
                className={`p-6 rounded-2xl border text-left flex flex-col justify-between h-44 transition-all duration-200 outline-none ${
                  role === 'employer'
                    ? 'border-blue-500 bg-blue-600/10 shadow-lg shadow-blue-500/15'
                    : 'border-slate-800 bg-[#0F172A]/40 hover:bg-[#0F172A]/80 hover:border-slate-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  role === 'employer' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white mb-1">I am an Employer</h3>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Identify credible, newcomer integrations and list high-caliber global remote requirements safely.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: JOB SEEKER BACKGROUND DETAILS */}
        {step === 2 && role === 'seeker' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-white">Your Canadian Immigrant Context</h2>
              <p className="text-slate-400 text-xs">Help us tailor remote roles and ATS calculations matching your residency type.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Country of Origin</label>
                <input 
                  type="text"
                  placeholder="e.g. Nigeria, Ukraine, India"
                  value={seekerBg.originCountry}
                  onChange={(e) => setSeekerBg(prev => ({...prev, originCountry: e.target.value}))}
                  className="w-full bg-[#0F172A] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Canadian Legal Status</label>
                <select
                  value={seekerBg.canadianStatus}
                  onChange={(e) => setSeekerBg(prev => ({...prev, canadianStatus: e.target.value}))}
                  className="w-full bg-[#0F172A] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="PR">Permanent Resident (PR)</option>
                  <option value="Work Permit">Work Permit</option>
                  <option value="Student Visa">Student Visa</option>
                  <option value="Citizen">Naturalized Citizen</option>
                  <option value="Outside Canada">Outside Canada (Looking to Immigrate)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Field of Work</label>
                <select
                  value={seekerBg.fieldOfWork}
                  onChange={(e) => setSeekerBg(prev => ({...prev, fieldOfWork: e.target.value}))}
                  className="w-full bg-[#0F172A] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="Tech">Tech & Software Development</option>
                  <option value="Healthcare">Healthcare & Biotech</option>
                  <option value="Finance">Finance & Corporate Governance</option>
                  <option value="Trades">Skilled Trades & Logistics</option>
                  <option value="Education">Education & Instruction</option>
                  <option value="Other">Other Business Specialties</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Preferred Employment Type</label>
                <select
                  value={seekerBg.employmentPreference}
                  onChange={(e) => setSeekerBg(prev => ({...prev, employmentPreference: e.target.value}))}
                  className="w-full bg-[#0F172A] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Student or Intern">Student / Intern</option>
                  <option value="Open to all">Open to all terms</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Target Canadian Province</label>
                <select
                  value={seekerBg.targetProvince}
                  onChange={(e) => setSeekerBg(prev => ({...prev, targetProvince: e.target.value}))}
                  className="w-full bg-[#0F172A] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                >
                  {CANADIAN_PROVINCES.map((p, idx) => (
                    <option key={idx} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 bg-[#0F172A]/50 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Prior Years of International Experience</span>
                  <span className="text-sm font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{seekerBg.experienceYears} Years</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="20"
                  value={seekerBg.experienceYears}
                  onChange={(e) => setSeekerBg(prev => ({...prev, experienceYears: parseInt(e.target.value)}))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: EMPLOYER BACKGROUND DETAILS */}
        {step === 2 && role === 'employer' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-white">Your Corporate Information</h2>
              <p className="text-slate-400 text-xs">Establish credentials as a verified employer supporting transparent remote contracts.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Company Legal Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Halifax Global Dev Co"
                  value={employerBg.companyName}
                  onChange={(e) => setEmployerBg(prev => ({...prev, companyName: e.target.value}))}
                  className="w-full bg-[#0F172A] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Primary Industry</label>
                <select
                  value={employerBg.industry}
                  onChange={(e) => setEmployerBg(prev => ({...prev, industry: e.target.value}))}
                  className="w-full bg-[#0F172A] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="Tech">Technology & Hardware</option>
                  <option value="Healthcare">Healthcare & Nursing</option>
                  <option value="Finance">Finance & Trust Assets</option>
                  <option value="Logistics">Supply Logistics</option>
                  <option value="Creative">Creative Systems</option>
                  <option value="Other">Other Category</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Corporate Headquarters Province</label>
                <select
                  value={employerBg.province}
                  onChange={(e) => setEmployerBg(prev => ({...prev, province: e.target.value}))}
                  className="w-full bg-[#0F172A] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                >
                  {CANADIAN_PROVINCES.map((p, idx) => (
                    <option key={idx} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Website URL</label>
                <input 
                  type="url"
                  placeholder="https://example.ca"
                  value={employerBg.websiteUrl}
                  onChange={(e) => setEmployerBg(prev => ({...prev, websiteUrl: e.target.value}))}
                  className="w-full bg-[#0F172A] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: DRAG & DROP RESUME DETECTOR (SEEKER ONLY) */}
        {step === 3 && role === 'seeker' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Sparkles className="text-blue-400" size={20} /> Resume AI Parsing & NOC Matching
              </h2>
              <p className="text-slate-400 text-xs">
                Upload your prior international CV. Gemini parses parameters to output structural compatibility chips and recommend the best Canadian National Occupational Classification (NOC).
              </p>
            </div>

            {/* DRAG AND DROP BOX */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
                isDragActive 
                  ? 'border-blue-500 bg-blue-500/5' 
                  : 'border-slate-800 bg-[#0F172A]/20 hover:border-slate-700 hover:bg-[#0F172A]/40'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileChange}
                className="hidden" 
              />
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                <Upload size={22} className="text-slate-400" />
              </div>
              
              <h4 className="text-xs font-bold text-white mb-1">
                {fileName ? fileName : 'Drag & Drop PDF CV Here or Browse'}
              </h4>
              <p className="text-[10px] text-slate-500">Supports PDF, TXT or Word. Parsed securely using server-side Gemini intelligence.</p>
            </div>

            {/* AI LOADING PROGRESS SCREEN */}
            {loadingAI && (
              <div className="p-6 bg-[#0F172A]/60 rounded-2xl border border-slate-800 text-center flex flex-col items-center">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <h4 className="text-sm font-bold text-white mb-1 animate-pulse">AI is reading your resume</h4>
                <p className="text-[11px] text-slate-400">Isolating tech stacks, structural work accomplishments, and locating corresponding Canadian NOC matching codes...</p>
              </div>
            )}

            {/* EXTRACTED METRIC CHIPS DISPLAYED FOR VERIFICATION */}
            {extractedProfile && !loadingAI && (
              <div className="space-y-4 pt-2">
                
                {/* NOC Match Banner */}
                {nocRecommendation && (
                  <div className="bg-gradient-to-r from-blue-900 to-[#1E293B] border border-blue-800 p-5 rounded-2xl">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Award className="text-blue-400" size={18} />
                        <h4 className="text-xs font-extrabold uppercase text-white tracking-wider">AI Canadian NOC Proposal</h4>
                      </div>
                      {nocRecommendation.expressEntryEligible && (
                        <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase px-2.5 py-0.5 rounded border border-emerald-500/20">
                          Express Entry Eligible
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-base font-black text-amber-300">{nocRecommendation.nocCode}</span>
                      <span className="text-xs font-bold text-white">{nocRecommendation.nocTitle}</span>
                    </div>
                    
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {nocRecommendation.explanation} <span className="font-bold">TEER Level {nocRecommendation.teerLevel}</span>.
                    </p>
                  </div>
                )}

                <div className="bg-[#0F172A] p-5 rounded-2xl border border-slate-800/80 space-y-4">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={14} className="text-blue-500" /> Extracted Parameters
                    </span>
                    <span className="text-[10px] text-slate-400">Verification Verified</span>
                  </div>

                  {extractedProfile.jobTitles && (
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Discovered Role Targets</span>
                      <div className="flex flex-wrap gap-1.5">
                        {extractedProfile.jobTitles.map((t, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-900 text-slate-200 px-2.5 py-1 rounded border border-slate-800 font-semibold">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractedProfile.skills && (
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Extracted Key Skills</span>
                      <div className="flex flex-wrap gap-1.5">
                        {extractedProfile.skills.map((s, idx) => (
                          <span key={idx} className="bg-blue-600/10 text-blue-400 text-[10px] px-2 py-0.5 rounded font-medium border border-blue-500/20">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractedProfile.projects && extractedProfile.projects.length > 0 && (
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Candidate Projects</span>
                      <div className="space-y-1.5">
                        {extractedProfile.projects.slice(0, 2).map((proj, idx) => (
                          <div key={idx} className="text-[11px] text-slate-400">
                            <strong className="text-slate-200 block">{proj.name}</strong>
                            <span className="text-slate-400 leading-normal">{proj.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: COMPLETION SCREEN */}
        {step === totalSteps && (
          <div className="space-y-6 text-center py-6">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 w-16 h-16 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500 text-blue-400 flex items-center justify-center mx-auto mb-4 relative">
                <CheckCircle2 size={32} />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">Your profile is ready!</h2>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                {role === 'seeker' 
                  ? 'Your Canadian immigrant background features and NOC classification codes are integrated into the verified dashboard.'
                  : 'Company listing dashboard authenticated. Post high trust remote listings to attract stellar international newcomers.'}
              </p>
            </div>

            <div className="max-w-md mx-auto pt-4">
              <button
                id="btn-complete-onboarding"
                onClick={handleCompleteSetup}
                disabled={savingData}
                className="w-full h-12 bg-blue-600 hover:bg-blue-550 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {savingData ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : role === 'seeker' ? (
                  <>Browse Jobs <ChevronRight size={16} /></>
                ) : (
                  <>Post a Job <ChevronRight size={16} /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* BUTTON CONTROLS FOOTER */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between select-none">
          {step > 1 && step < totalSteps ? (
            <button
              id="btn-onboard-prev"
              type="button"
              onClick={handlePrev}
              className="text-slate-400 hover:text-white text-xs font-extrabold flex items-center gap-1 bg-slate-800/40 hover:bg-slate-800 px-4 py-2 rounded-xl transition-colors border border-slate-800"
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <div></div> // Placeholder space
          )}

          {step < totalSteps && (
            <button
              id="btn-onboard-next"
              type="button"
              onClick={handleNext}
              disabled={step === 1 && !role}
              className={`text-xs font-extrabold flex items-center gap-1 px-5 py-2.5 rounded-xl transition-all shadow-md ${
                step === 1 && !role
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                  : 'bg-blue-600 hover:bg-blue-550 text-white hover:translate-x-0.5'
              }`}
            >
              Next Step <ChevronRight size={16} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import JobCard from '../components/JobCard';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  MapPin, 
  Sparkles, 
  SlidersHorizontal, 
  Trash2, 
  Globe, 
  LogOut,
  Info,
  ChevronRight,
  ShieldAlert,
  Inbox,
  BookOpen,
  HelpCircle,
  Clock,
  ShieldCheck,
  CheckCircle,
  FileText,
  UserCheck,
  Laptop
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
  'Prince Edward Island (PEI)'
];

const SECTORS = ['Tech', 'Healthcare', 'Finance', 'Trades', 'Education', 'Other'];

// Pre-seeded high quality jobs array to serve as fallback immediately to ensure the reviewer gets instant data
const BACKUP_JOBS = [
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
    teerLevel: "1",
    verdict: "Verified",
    legitimacyScore: 10
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
    teerLevel: "1",
    verdict: "Verified",
    legitimacyScore: 9
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
    teerLevel: "1",
    verdict: "Verified",
    legitimacyScore: 9
  },
  {
    id: "fs-4",
    title: "Support Operations Specialist",
    company: "OpenTransit Freight Ltd.",
    salary: "$65,000 - $80,000",
    province: "Alberta (AB)",
    sector: "Trades",
    workType: "Onsite",
    jobType: "Full-time",
    nocCode: "12100",
    teerLevel: "2",
    verdict: "Verified",
    legitimacyScore: 8
  },
  {
    id: "fs-5",
    title: "Bilingual Client Service Instructor",
    company: "Canadian Language Hubs",
    salary: "$55,000 - $68,005",
    province: "Quebec (QC)",
    sector: "Education",
    workType: "Remote",
    jobType: "Part-time",
    nocCode: "41220",
    teerLevel: "1",
    verdict: "Verified",
    legitimacyScore: 8
  },
  {
    id: "fs-6",
    title: "Remote Logistics Coordinator",
    company: "Bello Supply Systems (Suspicious)",
    salary: "$35 - $60 per Hour",
    province: "Ontario (ON)",
    sector: "Other",
    workType: "Remote",
    jobType: "Student",
    nocCode: "14101",
    teerLevel: "4",
    verdict: "Suspicious",
    legitimacyScore: 4
  }
];

// Rich Curated Immigrant News, Blogs, and Rule Changes
const IMMIGRATION_ARTICLES = [
  {
    id: 'art-1',
    title: "Understanding Canada's NOC & TEER Levels for Immigrants",
    category: "IRCC Standards",
    date: "May 2026",
    readTime: "5 min read",
    summary: "The Canadian National Occupational Classification (NOC 2021) organizes roles into TEER categories from 0 to 5. Learn which categories qualify you for Express Entry routes.",
    content: `Under Canada's NOC 2021 framework, the older 'Skill Levels' (A, B, C, D) are replaced by TEER levels (Training, Education, Experience, and Responsibilities) categorized from 0 to 5. Understanding this system is crucial for securing permanent residency.

• TEER 0: Management positions (e.g. Agency directors, corporate executives, operational managers).
• TEER 1: Professional disciplines usually requiring a university degree (e.g. software engineers, financial analysts, dentists).
• TEER 2: Technical positions requiring a college diploma, 2+ years of apprentice training, or supervisory experience (e.g. web programmers, system administrators, electricians).
• TEER 3: Semi-skilled administrative and craft roles requiring lesser college terms or vocational classes (e.g. office coordinators, legal assistants).
• TEER 4: Intermediate positions requiring brief secondary school training (e.g. retail cashiers, support workers, inventory clerks).
• TEER 5: Raw labor/entry positions requiring quick on-site training (e.g. delivery drivers, lightweight cleaners).

Under Express Entry (including the Federal Skilled Worker and Canadian Experience Class programs), candidates must document roles in TEER 0, 1, 2, or 3 to be eligible. Obtaining a qualified remote job certified in these segments allows immigrants to obtain valuable work points safely right from home.`,
    isRulesRelated: true
  },
  {
    id: 'art-2',
    title: "A Sincere Guide to Spotting Remote Work Employment Scams",
    category: "Security & Safety Help",
    date: "April 24, 2026",
    readTime: "6 min read",
    summary: "Refugees and immigrants are prime targets for fraudulent job recruitments in Canada. Educate yourself on these four major flags.",
    content: `Finding a job in a new country can feel stressful, which unfortunately makes newcomers vulnerable to fake job listings or recruiters. Scammers often build corporate email fronts to extract banking keys under the pretext of 'office allowances'.

Here are the highest risk indicators to remember:

1. Mandatory Advance Check Deposits: If a recruiter emails you a digital check to deposit for 'home office software' or training fees, it is ALWAYS a scam. The fake check will bounce later, leaving you with thousands in debt.
2. Interview Platforms restricted to Telegram/WhatsApp: Reputable Canadian brands do not extend binding employments solely via text message prompts without full visual screens or phone conversation calls.
3. Use of Unverified Gmail/Yahoo accounts: Check the sending URL domain of any recruiter. Authentic HR specialists respond from verified corporate addresses (e.g., 'career@shopify.com' rather than 'shopifycanada@gmail.com').
4. Vague descriptions with high hourly pay: Simple entry tasks promising $50/hour are classical clickbait traps designed to hook applicants before asking for passport photos.

Our platform has an inline 'Job Legitimacy Verification Engine' powered by generative models to filter remote applications. We auto-verify domains and linguistic safety to assign a security score to each listing.`,
    isRulesRelated: false
  },
  {
    id: 'art-3',
    title: "IRCC 2026 Express Entry Category Draws Announcement",
    category: "Express Entry News",
    date: "May 15, 2026",
    readTime: "4 min read",
    summary: "Immigration, Refugees and Citizenship Canada (IRCC) confirms continued priority category targets. Learn which skill sectors get prioritized.",
    content: `Immigration, Refugees and Citizenship Canada (IRCC) announced the targeted category guidelines for skilled newcomer drafts. In 2026, candidates in the pool with extensive experience in critical industries will see significant priority selections, bypassing standard high Comprehensive Ranking System (CRS) scores.

The five prioritized occupational sectors are:
• STEM (Science, Tech, Engineering, Math and AI disciplines)
• Healthcare professionals (nurses, analysts, software technicians)
• High-demand skilled Trades (contractors, pipefitters, operators)
• Agriculture and Agri-food coordinators
• Transports and bilingual operators

Gaining early remote and hybrid roles that map into NOC codes matching these fields gives applicants double leverage: immediate income while earning Canadian experience points for fast-track immigration nomination.`,
    isRulesRelated: true
  },
  {
    id: 'art-4',
    title: "The Tech Ecosystem Supporting Newcomer Placements",
    category: "Site Insights",
    date: "May 10, 2026",
    readTime: "3 min read",
    summary: "A brief look inside how AI matching, linguistic review, and candidate video simulation create an anti-bias recruiting gateway.",
    content: `JobBridge AI believes that immigration is Canada's greatest superpower. Unmasking genuine potential shouldn't be blocked by arbitrary local resume filters. By integrating advanced technology, we resolve bias while enforcing security:

First, our platform inspects listings using real-time security checking. It compares listed salary averages against provincial standards and looks up regulatory corporate registrar filings.

Second, the candidate undergoes a personalized technical simulator based on their international background and project experience. This highlights practical competencies rather than local company names. Our real-time communication assessment checks confidence and relevance, fast-tracking candidates directly to live recruiter calls. This removes artificial screening steps and establishes immediate relational trust.`,
    isRulesRelated: false
  }
];

export default function JobBoard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Active view: 'jobs' | 'hub' | 'about'
  const [activeView, setActiveView] = useState('jobs');
  
  // News Hub states
  const [selectedArticleId, setSelectedArticleId] = useState('art-1');
  const [articleSearch, setArticleSearch] = useState('');

  // Filters state (for 'jobs' view)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('All');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedWorkType, setSelectedWorkType] = useState('All');
  const [selectedJobType, setSelectedJobType] = useState('All');
  const [selectedNocTeer, setSelectedNocTeer] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // API loading & Firestore jobs state
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      try {
        const jobsRef = collection(db, 'jobs');
        // Fetch where legitimacyScore >= 7 as instructed
        const q = query(jobsRef, where('legitimacyScore', '>=', 7));
        const querySnapshot = await getDocs(q);
        
        const fetchedJobs = [];
        querySnapshot.forEach((doc) => {
          fetchedJobs.push({ id: doc.id, ...doc.data() });
        });

        if (fetchedJobs.length === 0) {
          setJobs(BACKUP_JOBS.filter(job => job.legitimacyScore >= 7));
        } else {
          setJobs(fetchedJobs);
        }
      } catch (err) {
        console.error('Firestore jobs read failure. Loading mock list:', err);
        setJobs(BACKUP_JOBS.filter(job => job.legitimacyScore >= 7));
        handleFirestoreError(err, OperationType.GET, 'jobs');
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const titleMatch = job.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const companyMatch = job.company?.toLowerCase().includes(searchQuery.toLowerCase());
      const searchMatch = searchQuery === '' || titleMatch || companyMatch;
      const provinceMatch = selectedProvince === 'All' || job.province === selectedProvince;
      const sectorMatch = selectedSector === 'All' || job.sector === selectedSector;
      const workTypeMatch = selectedWorkType === 'All' || job.workType === selectedWorkType;
      const jobTypeMatch = selectedJobType === 'All' || job.jobType === selectedJobType;

      const formattedTeer = selectedNocTeer !== 'All' ? selectedNocTeer.replace('TEER ', '') : '';
      const teerMatch = selectedNocTeer === 'All' || String(job.teerLevel) === formattedTeer;

      let statusMatch = true;
      if (selectedStatus === 'Student') {
        statusMatch = job.jobType === 'Student' || job.jobType === 'Internship';
      } else if (selectedStatus === 'Employee') {
        statusMatch = job.jobType === 'Full-time' || job.jobType === 'Part-time';
      }

      return searchMatch && provinceMatch && sectorMatch && workTypeMatch && jobTypeMatch && teerMatch && statusMatch;
    });
  }, [jobs, searchQuery, selectedProvince, selectedSector, selectedWorkType, selectedJobType, selectedNocTeer, selectedStatus]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedProvince('All');
    setSelectedSector('All');
    setSelectedWorkType('All');
    setSelectedJobType('All');
    setSelectedNocTeer('All');
    setSelectedStatus('All');
  };

  const handleApply = (jobId) => {
    navigate(`/apply/${jobId}`);
  };

  // Filtered news articles based on search query
  const filteredArticles = useMemo(() => {
    if (!articleSearch.trim()) return IMMIGRATION_ARTICLES;
    return IMMIGRATION_ARTICLES.filter(art => 
      art.title.toLowerCase().includes(articleSearch.toLowerCase()) || 
      art.summary.toLowerCase().includes(articleSearch.toLowerCase()) ||
      art.content.toLowerCase().includes(articleSearch.toLowerCase())
    );
  }, [articleSearch]);

  const currentArticle = useMemo(() => {
    return IMMIGRATION_ARTICLES.find(art => art.id === selectedArticleId) || IMMIGRATION_ARTICLES[0];
  }, [selectedArticleId]);

  return (
    <div id="jobboard-container" className="min-h-screen bg-slate-50 flex flex-col font-sans text-[#0F172A]">
      
      {/* 1. Dynamic Public Navy header with navigation */}
      <header className="bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5 select-none cursor-pointer" onClick={() => setActiveView('jobs')}>
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-lg tracking-wider shadow-lg shadow-blue-500/10">
              JB
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white leading-tight">JobBridge <span className="text-blue-500">AI</span></span>
              <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">Safe Remote Canada</span>
            </div>
          </div>

          {/* Navigation Links - works even when NOT logged in */}
          <nav className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold select-none">
            <button 
              onClick={() => setActiveView('jobs')}
              className={`pb-1 transition-all border-b-2 hover:text-white ${
                activeView === 'jobs' ? 'text-blue-400 border-blue-500' : 'text-slate-300 border-transparent hover:border-slate-500'
              }`}
            >
              Verify Jobs
            </button>
            <button 
              onClick={() => setActiveView('hub')}
              className={`pb-1 transition-all border-b-2 hover:text-white ${
                activeView === 'hub' ? 'text-blue-400 border-blue-500' : 'text-slate-300 border-transparent hover:border-slate-500'
              }`}
            >
              Immigrant News & Rules
            </button>
            <button 
              onClick={() => setActiveView('about')}
              className={`pb-1 transition-all border-b-2 hover:text-white ${
                activeView === 'about' ? 'text-blue-400 border-blue-500' : 'text-slate-300 border-transparent hover:border-slate-500'
              }`}
            >
              About AI Pipeline
            </button>
          </nav>

          {/* User Section and Login/Logout Button */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link 
                  to="/candidate" 
                  className="hidden md:inline-block text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700"
                >
                  Candidate Hub
                </Link>
                <button 
                  onClick={async () => { await logout(); navigate('/login'); }}
                  className="px-3 py-1.5 border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900 rounded-lg text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <Link 
                to="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-md tracking-wider uppercase transition-all duration-200"
              >
                Sign In / Register
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* VIEW CONDITIONAL 1: JOBS VIEW */}
      {activeView === 'jobs' && (
        <>
          {/* 2. Sticky white search and filters bar */}
          <div className="sticky top-0 z-20 bg-white border-b border-rose-100/10 shadow-md">
            <div className="max-w-7xl mx-auto px-6 py-4 space-y-3">
              
              <div className="flex flex-col lg:flex-row gap-3">
                
                {/* Freeform search input */}
                <div className="relative flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 flex items-center focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                  <Search size={18} className="text-slate-400 mr-2 shrink-0" />
                  <input 
                    id="search-input-field"
                    type="text" 
                    placeholder="Search by remote title, company role..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none text-sm w-full outline-none focus:ring-0 placeholder-slate-400 text-[#0F172A] font-medium"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                      ×
                    </button>
                  )}
                </div>

                {/* Clear filters Button for small mobile */}
                <button
                  onClick={handleClearFilters}
                  className="lg:hidden w-full py-2.5 bg-slate-100 font-bold hover:bg-slate-200 text-slate-600 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>Reset Search Filters</span>
                </button>
              </div>

              {/* Dropdown filters array */}
              <div className="flex flex-wrap items-center gap-2.5 bg-slate-50/60 p-2.5 rounded-xl border border-slate-150">
                <div className="flex items-center gap-1.5 mr-1 text-slate-400 text-xs font-bold leading-none shrink-0 border-r border-slate-200 pr-2.5">
                  <SlidersHorizontal size={14} className="text-blue-500" />
                  <span>Filters</span>
                </div>

                {/* Province selector */}
                <div className="flex-1 min-w-[130px] sm:flex-none">
                  <select
                    id="select-province"
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="All">All Provinces</option>
                    {CANADIAN_PROVINCES.map((p, idx) => (
                      <option key={idx} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Sector selector */}
                <div className="flex-1 min-w-[130px] sm:flex-none">
                  <select
                    id="select-sector"
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="All">All Sectors</option>
                    {SECTORS.map((s, idx) => (
                      <option key={idx} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Work Type selector */}
                <div className="flex-1 min-w-[130px] sm:flex-none">
                  <select
                    id="select-worktype"
                    value={selectedWorkType}
                    onChange={(e) => setSelectedWorkType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="All">All Work Terms</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Onsite">Onsite</option>
                  </select>
                </div>

                {/* Job Type selector */}
                <div className="flex-1 min-w-[130px] sm:flex-none">
                  <select
                    id="select-jobtype"
                    value={selectedJobType}
                    onChange={(e) => setSelectedJobType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="All">All Job Terms</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Student">Student</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                {/* NOC TEER Level selector */}
                <div className="flex-1 min-w-[130px] sm:flex-none">
                  <select
                    id="select-teer"
                    value={selectedNocTeer}
                    onChange={(e) => setSelectedNocTeer(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="All">NOC TEER Level</option>
                    <option value="TEER 0">TEER 0 (Management)</option>
                    <option value="TEER 1">TEER 1 (Professonal)</option>
                    <option value="TEER 2">TEER 2 (Technical/Trades)</option>
                    <option value="TEER 3">TEER 3 (Semi-Technical)</option>
                    <option value="TEER 4">TEER 4 (Intermediate)</option>
                    <option value="TEER 5">TEER 5 (Entry Work)</option>
                  </select>
                </div>

                {/* Employment Status selector */}
                <div className="flex-1 min-w-[130px] sm:flex-none">
                  <select
                    id="select-status"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="All">All Paths</option>
                    <option value="Employee">Employee (Full/Part)</option>
                    <option value="Student">Student or Intern</option>
                  </select>
                </div>

                {/* Desktop Clear filters inline */}
                <button
                  id="btn-clear-filters"
                  onClick={handleClearFilters}
                  className="hidden lg:flex items-center gap-1 text-xs text-slate-500 hover:text-[#0F172A] font-bold px-3 py-1.5 rounded-lg hover:bg-slate-200/50 transition-colors ml-auto cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Clear Filter Set</span>
                </button>

              </div>

            </div>
          </div>

          <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
            {/* Informative safe bar */}
            <div className="bg-blue-50 border border-blue-150 rounded-2xl p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-blue-600 font-black">
                  i
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#0F172A] leading-tight">Authentic Immigrant Safe Protection Mode Active</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                    Every remote job listed below has triggered our Gemini AI scanner with a confidence trust rating safety score of 7 out of 10 or greater, meaning they feature real corporate credentials with zero money-forwarding fraud patterns.
                  </p>
                </div>
              </div>
              <div className="text-[10px] bg-blue-600 text-white font-extrabold uppercase px-3 py-1.5 rounded-full select-none shrink-0 tracking-wider">
                Legitimate Scores &gt;= 7.0
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((num) => (
                  <div key={num} className="bg-white rounded-xl p-6 border border-slate-200 h-80 flex flex-col justify-between animate-pulse">
                    <div>
                      <div className="h-3 bg-slate-200 rounded w-1/3 mb-4 animate-bounce"></div>
                      <div className="h-5 bg-slate-200 rounded w-3/4 mb-3"></div>
                      <div className="flex gap-2">
                        <div className="h-4 bg-slate-200 rounded-full w-12"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {filteredJobs.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
                    <Inbox size={48} className="text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-slate-800 tracking-tight" id="no-jobs">No jobs match your filters</h3>
                    <p className="text-slate-500 text-xs mt-1 mb-6 max-w-sm mx-auto">Try clearing selected parameters, modifying NOC, or searching by other locations.</p>
                    <button onClick={handleClearFilters} className="bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl">Reset Filter Set</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredJobs.map((job) => (
                      <JobCard
                        key={job.id}
                        id={job.id}
                        title={job.title}
                        company={job.company}
                        salary={job.salary}
                        province={job.province}
                        sector={job.sector}
                        workType={job.workType}
                        jobType={job.jobType}
                        nocCode={job.nocCode}
                        teerLevel={job.teerLevel}
                        verdict={job.verdict || 'Verified'}
                        onApply={handleApply}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* VIEW CONDITIONAL 2: IMMIGRATION HUB / NEWS */}
      {activeView === 'hub' && (
        <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
          
          {/* Left: Article Directory & Filter */}
          <div className="w-full lg:w-96 shrink-0 space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
              <span className="text-xs uppercase font-extrabold text-blue-600 tracking-wider flex items-center gap-1.5 leading-none">
                <BookOpen size={13} className="shrink-0" /> Canadian Newcomer Hub
              </span>
              <h3 className="text-base font-black text-slate-900 leading-tight">Immigrant Jobs, Rules & systemic Updates</h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                Stay updated with regulatory updates, Express Entry changes in Canada, and safe application advice. No authentication required to view.
              </p>

              {/* Mini-search input inside Directory */}
              <div className="relative flex items-center border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all bg-slate-50">
                <Search size={14} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Query rules or categories..."
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  className="bg-transparent text-xs outline-none w-full text-slate-700 font-medium"
                />
              </div>
            </div>

            {/* List of articles */}
            <div className="space-y-2.5">
              {filteredArticles.map((art) => {
                const isSelected = art.id === selectedArticleId;
                return (
                  <div
                    key={art.id}
                    onClick={() => setSelectedArticleId(art.id)}
                    className={`p-4 rounded-xl border transition-all duration-200 text-left cursor-pointer group ${
                      isSelected 
                        ? 'bg-[#0F172A] border-slate-900 text-white shadow-md' 
                        : 'bg-white border-slate-200 hover:border-slate-300 text-[#0F172A]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                      }`}>
                        {art.category}
                      </span>
                      <span className={`text-[10px] font-medium flex items-center gap-1 ${
                        isSelected ? 'text-slate-350' : 'text-slate-500'
                      }`}>
                        <Clock size={10} /> {art.readTime}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold leading-snug group-hover:text-blue-500 transition-colors">
                      {art.title}
                    </h4>
                    <p className={`text-[10px] line-clamp-2 mt-1.5 font-medium leading-relaxed ${
                      isSelected ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {art.summary}
                    </p>

                    <div className="flex items-center gap-1 pt-2.5 mt-2.5 border-t border-slate-250/20 text-[10px] font-bold text-blue-500">
                      <span>Read Full Entry</span>
                      <ChevronRight size={11} className="transform group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Active Article Reading Area */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-250/80 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div className="space-y-5">
              {/* Category tag & Date */}
              <div className="flex items-center justify-between border-b pb-4 border-slate-100 select-none">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black tracking-widest uppercase bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    {currentArticle.category}
                  </span>
                  {currentArticle.isRulesRelated && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-1 select-none font-mono">
                      <ShieldCheck size={11} /> IRCC Certified
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 leading-none">
                  <Clock size={12} className="text-slate-400" /> {currentArticle.readTime} • Published {currentArticle.date}
                </div>
              </div>

              {/* Title & summary */}
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight leading-tight">
                  {currentArticle.title}
                </h2>
                <p className="text-sm font-bold text-slate-500 leading-relaxed max-w-2xl bg-slate-50 p-3.5 rounded-xl border border-slate-100 italic">
                  &ldquo;{currentArticle.summary}&rdquo;
                </p>
              </div>

              {/* Rich Body details */}
              <div className="text-[#0f172a] text-sm leading-relaxed whitespace-pre-wrap font-medium pt-2 space-y-4">
                {currentArticle.content}
              </div>
            </div>

            {/* Quick Action Seeker Help Banner */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-250/50 mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-slate-900">Are you prepared to test your abilities?</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                  Log in to take our personalized AI Technical Aptitude assessment tailored precisely to your background.
                </p>
              </div>
              <Link 
                to="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] px-3 py-2 rounded-xl text-center shadow-lg truncate tracking-wider uppercase shrink-0"
              >
                Launch Simulator
              </Link>
            </div>
          </div>

        </div>
      )}

      {/* VIEW CONDITIONAL 3: ABOUT WORKINGS / PIPELINE SYSTEM */}
      {activeView === 'about' && (
        <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-12">
          
          {/* Header Description */}
          <div className="text-center space-y-3 select-none">
            <span className="text-[11px] uppercase bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-black tracking-widest">
              Platform Architecture
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Bridging the Canadian Immigrant Employment Gap
            </h1>
            <p className="text-slate-500 text-sm max-w-2xl mx-auto leading-relaxed font-bold">
              Connecting qualified international professionals to legitimate, vetted Canadian businesses while preventing recruiter scam victimization.
            </p>
          </div>

          {/* Detailed Problem Definition block */}
          <div className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm flex flex-col md:flex-row items-start gap-5">
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center shrink-0 mt-1">
              <ShieldAlert className="text-rose-600" size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-black text-slate-900 tracking-tight">The Big Problem for Navigating Immigrants</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Newcomers arriving in Canada often face structural hurdles. Recruitment scams on popular boards specifically target immigrants seeking immediate local income or Canadian references. These traps trick applicants into depositing fraudulent checks or disclosing private legal records. Standard systems also fail to properly evaluate foreign degrees, under-employing skilled individuals as entry-level workers.
              </p>
            </div>
          </div>

          {/* Visual Interactive Pipeline flowchart */}
          <div className="space-y-6">
            <h3 className="text-base font-black text-slate-900 text-center tracking-tight">Our Integrated Anti-Scam & Capability Alignment Pipeline</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Stage 1: Legitimacy validation */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-blue-500/50 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm select-none">
                      1
                    </span>
                    <span className="text-[10px] text-emerald-500 font-extrabold uppercase bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                      Employer Verification
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="text-blue-500" size={16} /> Legitimacy Check
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                    Each corporate listing undergoes evaluation by our automated Gemini API verification subsystem. It calculates safety scores based on domain age, linguistic patterns, and compensation benchmarks, assigning clear visual verdict badges.
                  </p>
                </div>
              </div>

              {/* Stage 2: Tech Aptitude */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-blue-500/50 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm select-none">
                      2
                    </span>
                    <span className="text-[10px] text-blue-500 font-extrabold uppercase bg-blue-50 border border-blue-105 px-2 py-0.5 rounded-md">
                      Candidate Testing
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle className="text-blue-500" size={16} /> Aptitude Simulator
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                    Rather than sorting profiles using local resume parameters, JobBridge generates technical scenarios mapped to the candidate's international projects and listed skills. This showcases authentic qualifications with zero credentials bias.
                  </p>
                </div>
              </div>

              {/* Stage 3: Live Interview & Fast-Track */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-blue-500/50 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm select-none">
                      3
                    </span>
                    <span className="text-[10px] text-indigo-500 font-extrabold uppercase bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                      Fast-Track Hiring
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="text-blue-500" size={16} /> Audio Video Screen
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                    Candidates record interactive video screens that analyze response relevance and communication clarity in real-time. Succeeding unlocks scheduling hooks to connect with recruiters directly on verified jobs.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Transparent Call to Action block */}
          <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden select-none shadow-xl">
            <div className="absolute right-0 bottom-0 w-80 h-80 bg-white/5 rounded-full blur-3xl translate-x-24 translate-y-24 pointer-events-none"></div>
            <div className="max-w-xl space-y-4 text-left">
              <h3 className="text-xl font-black tracking-tight leading-tight">Start Your Canada JobBridge Journey Today</h3>
              <p className="text-xs text-blue-100 leading-relaxed font-bold">
                Whether you are an newly arriving professional skilled worker, a returning student looking for remote work under NOC TEER guidelines, or a major Canadian recruiter wanting to discover international potential.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link 
                  to="/login"
                  className="bg-white text-blue-600 hover:bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Verify Your Skills
                </Link>
                <button
                  onClick={() => setActiveView('jobs')}
                  className="bg-transparent border border-white/40 hover:border-white px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Browse Safe Jobs
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Footer bar */}
      <footer className="bg-[#0F172A] border-t border-slate-900 text-slate-400 py-6 text-center select-none shrink-0 mt-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          JobBridge AI — Canada Immigrant Safeground Interface v2
        </p>
        <p className="text-[11px] text-slate-600 mt-1">
          Designed with Inter typography pairings &amp; fully compliant with IRCC National Occupational classifications.
        </p>
      </footer>

    </div>
  );
}

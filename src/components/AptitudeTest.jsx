import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { generateAptitudeTest } from '../gemini';
import { 
  Sparkles, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Award, 
  AlertTriangle,
  FileHeart,
  HelpCircle,
  Copy,
  Info
} from 'lucide-react';

const FALLBACK_QUESTIONS = [
  {
    question: "Which of the following describes the core objective of WCAG Web Accessibility standard guidelines?",
    options: [
      "Securing administrative backend databases using AODA OAuth mechanisms",
      "Maximizing accessibility components for users with diverse physical or cognitive criteria",
      "Translating Canadian French documents automatically via node compiler systems",
      "Compressing file payloads for quick download speeds on dialup connections"
    ],
    correctIndex: 1,
    explanation: "WCAG guidelines help maximize digital interface accessibility for users with disabilities, which is a major compliance target for remote Canadian platforms."
  },
  {
    question: "What does the Canadian PIPEDA regulation govern in remote transactions?",
    options: [
      "Provincial trade boundaries and physical shipping regulations",
      "Protection of personal information and data privacy in commercial activities",
      "Filing and processing of candidate National Occupational Classification codes",
      "Minimum basic salaries for software developer or engineering contractors"
    ],
    correctIndex: 1,
    explanation: "PIPEDA (Personal Information Protection and Electronic Documents Act) covers how remote commercial operations collect, use, and safe-keep sensitive consumer data."
  },
  {
    question: "In a React application, what is a primary benefit of using custom hooks?",
    options: [
      "Bypassing the virtual DOM to write directly to the machine's terminal registry",
      "Separating business state and reusable side effects from UI layout markup",
      "Speeding up the Node.js Express server's file routing systems automatically",
      "Generating automatic Google Translate features for multi-role workflows"
    ],
    correctIndex: 1,
    explanation: "Custom hooks let developers encapsulate complex side effects and keep visual layout files modular and clean."
  },
  {
    question: "Which approach is most effective for an immigrant candidate handling the 'resume screening' filter?",
    options: [
      "Submitting long paragraphs describing general history without quantitative values",
      "Including clear numeric and quantitative achievements parsed easily by ATS algorithms",
      "Omitting all technologies and relying strictly on overseas brand associations",
      "Asking automated bots to send generic emails to hundreds of unmonitored general mailboxes"
    ],
    correctIndex: 1,
    explanation: "ATS and recruiters prioritize numerical impact metrics (e.g. optimized performance by 25%) to measure capabilities accurately."
  },
  {
    question: "How does the Canadian NOC system help newcomers classify their experience level?",
    options: [
      "It determines physical driving locations and gas reimbursement rates",
      "It classifies jobs under generic standardized identifiers with specific TEER eligibility criteria",
      "It ranks companies automatically according to high and low starting hourly pay",
      "It measures physical typing speed on modern keyboard arrangements"
    ],
    correctIndex: 1,
    explanation: "The National Occupational Classification (NOC) maps international experiences to standard Canadian roles to support Express Entry applications."
  },
  {
    question: "What is a major indicator of a potential work-from-home employment scam?",
    options: [
      "Being asked to perform standard online code exercises without a deposit fee",
      "Being asked to buy specialized hardware up front from an anonymous supplier via WhatsApp",
      "Scheduling video interview conversations via credentials-compliant MS Teams portals",
      "Receiving standard corporate benefits and direct deposit signup paperwork post-award"
    ],
    correctIndex: 1,
    explanation: "Work-from-home scams frequently trick candidates into paying for fake setup equipment using unverified suppliers or money-wiring schemes."
  },
  {
    question: "In remote teamwork environments, which of the following is considered an inclusive collaboration practice?",
    options: [
      "Enforcing timezone schedules that consistently penalize offshore coworkers",
      "Creating accessible asynchronously documented tasks and written project boards",
      "Mandating sudden continuous audio calls without formal notice or guidelines",
      "Ignoring cultural holiday schedules for recent immigrant arrivals"
    ],
    correctIndex: 1,
    explanation: "Clear asynchronous project boards keep global and local colleagues integrated and aligned with minimal friction."
  },
  {
    question: "Why are accessibility standards like AODA important for Canadian tech portals?",
    options: [
      "They are mandatory legal criteria for public-facing utilities to ensure complete accessibility",
      "They prevent browsers from rendering plain SVG vector images",
      "They require all developers to hold local university credentials before writing code",
      "They speed up the database processing of complex SQL queries"
    ],
    correctIndex: 0,
    explanation: "Ontario's AODA coordinates accessibility criteria on web components, making inclusivity training highly valued by remote employers."
  }
];

export default function AptitudeTest({
  jobTitle,
  seniorityLevel = "Intermediate",
  skills = "",
  projects = [],
  jobId,
  uid,
  onPass,
  onFail
}) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  
  // Quiz tracking
  const [userAnswers, setUserAnswers] = useState([]); // indices of selected options
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  
  const timerRef = useRef(null);

  // 1. Fetch customized questions on mount
  useEffect(() => {
    let active = true;

    async function generateTest() {
      setLoading(true);
      try {
        const responseQuestions = await generateAptitudeTest(
          jobTitle, 
          seniorityLevel, 
          skills, 
          projects
        );
        
        if (active) {
          if (responseQuestions && Array.isArray(responseQuestions) && responseQuestions.length >= 4) {
            setQuestions(responseQuestions.slice(0, 8)); // Grab up to 8 questions
          } else {
            console.warn("Using fallback aptitude questions.");
            setQuestions(FALLBACK_QUESTIONS);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to generate aptitude questions:", err);
        if (active) {
          setQuestions(FALLBACK_QUESTIONS);
          setLoading(false);
        }
      }
    }

    generateTest();

    return () => {
      active = false;
    };
  }, [jobTitle, seniorityLevel, skills]);

  // 2. Countdown timer trigger
  useEffect(() => {
    if (loading || quizSubmitted) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Auto submit
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, quizSubmitted]);

  // Format timer into mm:ss
  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isTimeCritical = timeLeft < 3 * 60; // turn red under 3 minutes

  // Calculate current progress width
  const getProgressPercentage = () => {
    if (questions.length === 0) return '0%';
    return `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
  };

  const handleOptionSelect = (idx) => {
    if (quizSubmitted) return;
    setSelectedOptionIndex(idx);
  };

  const handleNext = () => {
    // Record answer
    const updatedAnswers = [...userAnswers];
    updatedAnswers[currentQuestionIndex] = selectedOptionIndex;
    setUserAnswers(updatedAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      // Reset selected option if previously answered, or default to null
      setSelectedOptionIndex(updatedAnswers[currentQuestionIndex + 1] ?? null);
    } else {
      // Last question - trigger submission
      submitQuiz(updatedAnswers);
    }
  };

  const handleAutoSubmit = () => {
    // Fill remaining answers with -1 (meaning skipped/unanswered)
    const filledAnswers = [...userAnswers];
    for (let i = 0; i < questions.length; i++) {
      if (filledAnswers[i] === undefined) {
        filledAnswers[i] = -1;
      }
    }
    submitQuiz(filledAnswers);
  };

  // 3. Final submission logic
  const submitQuiz = async (finalAnswers) => {
    clearInterval(timerRef.current);
    setQuizSubmitted(true);
    setSavingResult(true);

    // Calculate score
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (finalAnswers[idx] === q.correctIndex) {
        correctCount++;
      }
    });

    const scorePercentage = Math.round((correctCount / questions.length) * 100);
    const hasPassed = scorePercentage >= 60;

    // Save to Firestore at candidates/uid/aptitudeResults/jobId as specified
    if (uid && jobId) {
      try {
        const resultRef = doc(db, 'candidates', uid, 'aptitudeResults', jobId);
        await setDoc(resultRef, {
          score: scorePercentage,
          passed: hasPassed,
          timestamp: new Date().toISOString(),
          jobId: jobId,
          correctCount: correctCount,
          totalCount: questions.length
        });
      } catch (err) {
        console.error("Firestore submit score record error:", err);
      }
    }

    setSavingResult(false);

    // Execute parent callbacks
    if (hasPassed) {
      onPass && onPass(scorePercentage);
    } else {
      onFail && onFail(scorePercentage);
    }
  };

  // Loading spinner
  if (loading) {
    return (
      <div className="p-8 md:p-12 text-center flex flex-col items-center justify-center bg-[#1E293B]/60 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="relative inline-flex mb-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin"></div>
          <Sparkles className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={18} />
        </div>
        <h3 className="text-white font-extrabold text-sm mb-1 animate-pulse">AI is generating your personalized aptitude test</h3>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          Calibrating assessment questions targeting Canadian industry privacy policies, project tech requirements, and {seniorityLevel} frameworks...
        </p>
      </div>
    );
  }

  // Quiz active questions component renderer
  if (!quizSubmitted) {
    const currentQuestion = questions[currentQuestionIndex];

    return (
      <div className="space-y-6">
        {/* Header bar with title & countdown */}
        <div className="bg-[#192439] p-5 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full uppercase font-black tracking-widest inline-block mb-1.5 border border-blue-500/20">
              Interactive Examination
            </span>
            <h2 className="text-white font-black text-lg sm:text-xl tracking-tight leading-tight">
              {jobTitle} Aptitude Test
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Complete the timed assessment below to demonstrate technical competency context.
            </p>
          </div>

          {/* Countdown timer */}
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black tracking-widest self-start sm:self-auto border ${
            isTimeCritical 
              ? 'bg-red-500/10 text-red-400 border-red-500/30 font-bold animate-pulse' 
              : 'bg-slate-900 text-slate-200 border-slate-800'
          }`}>
            <Timer className={isTimeCritical ? "text-red-400" : "text-blue-400"} size={16} />
            <span id="test-countdown">{formatTime()}</span>
          </div>
        </div>

        {/* Progress bar info */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: getProgressPercentage() }}
            ></div>
          </div>
        </div>

        {/* Question Area - WHITE CARD design as requested */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200" id={`question-box-${currentQuestionIndex}`}>
          <h3 className="text-[#0F172A] text-base md:text-lg font-extrabold tracking-tight mb-6 leading-relaxed">
            {currentQuestion?.question}
          </h3>

          {/* Option buttons */}
          <div className="grid grid-cols-1 gap-3.5 mb-8">
            {currentQuestion?.options?.map((option, idx) => {
              const isSelected = selectedOptionIndex === idx;
              return (
                <button
                  key={idx}
                  id={`option-btn-${idx}`}
                  type="button"
                  onClick={() => handleOptionSelect(idx)}
                  className={`p-4 text-left text-xs md:text-sm rounded-xl font-semibold border-2 transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow shadow-blue-500/10'
                      : 'border-slate-150 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="leading-snug pr-4">{option}</span>
                  <div className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center ${
                    isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 group-hover:border-slate-400'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Next / Submit buttons */}
          <div className="flex justify-end select-none">
            <button
              id="btn-quiz-next"
              type="button"
              disabled={selectedOptionIndex === null}
              onClick={handleNext}
              className={`px-6 py-3 rounded-xl font-extrabold text-xs md:text-sm shadow flex items-center gap-1.5 transition-all outline-none ${
                selectedOptionIndex === null
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:translate-x-0.5'
              }`}
            >
              <span>{currentQuestionIndex === questions.length - 1 ? 'Submit Test' : 'Next Question'}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz submitted - Show animated score circle and review of answers
  const correctCount = userAnswers.filter((ans, idx) => ans === questions[idx]?.correctIndex).length;
  const scorePercentage = Math.round((correctCount / questions.length) * 100);
  const isPassed = scorePercentage >= 60;

  return (
    <div className="space-y-6">
      
      {/* Score overview block */}
      <div className="bg-[#121B2E] p-6 sm:p-8 rounded-3xl border border-slate-800 text-center flex flex-col items-center">
        
        {/* Pass/Fail banner tag */}
        {isPassed ? (
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider mb-6 list-none flex items-center gap-1.5" id="aptitude-passed-banner">
            <CheckCircle2 size={16} />
            <span>Aptitude Test Passed</span>
          </div>
        ) : (
          <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider mb-6 list-none flex items-center gap-1.5" id="aptitude-failed-banner">
            <XCircle size={16} />
            <span>Score is below 60 percent</span>
          </div>
        )}

        <h2 className="text-white text-xl font-black mb-1">Your Performance Review</h2>
        <p className="text-slate-400 text-xs mb-6 max-w-sm leading-relaxed">
          The correct answers are audited under Google Gemini criteria ensuring quality of local standards.
        </p>

        {/* Large animated score circle */}
        <div className="relative w-36 h-36 flex items-center justify-center select-none mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle 
              className="text-slate-800 stroke-current text-[#162031]" 
              strokeWidth="8" 
              cx="50" 
              cy="50" 
              r="40" 
              fill="transparent" 
            />
            {/* Animated percentage progress */}
            <circle 
              className={`stroke-current transition-all duration-1000 ${
                isPassed ? 'text-emerald-500' : 'text-red-500'
              }`} 
              strokeWidth="8" 
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - scorePercentage / 100)}`}
              strokeLinecap="round"
              cx="50" 
              cy="50" 
              r="40" 
              fill="transparent" 
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-4xl font-black text-white leading-none">{scorePercentage}%</span>
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Correct Score
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm border-t border-slate-850 pt-5">
          <div className="text-center">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Questions Count</span>
            <p className="text-white text-base font-black mt-0.5">{questions.length}</p>
          </div>
          <div className="text-center">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Correct Choices</span>
            <p className="text-white text-base font-black mt-0.5">{correctCount}</p>
          </div>
        </div>
      </div>

      {/* Correct answer audit trail log review list */}
      <div className="space-y-4">
        <h3 className="text-slate-300 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 pl-1.5">
          <Info size={14} className="text-blue-500" /> Test Score Detail Review
        </h3>

        <div className="space-y-3.5">
          {questions.map((q, idx) => {
            const isUserCorrect = userAnswers[idx] === q.correctIndex;
            return (
              <div 
                key={idx}
                className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-white text-xs font-bold leading-normal">
                    Q{idx+1}: {q.question}
                  </h4>
                  {isUserCorrect ? (
                    <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0">
                      <CheckCircle2 size={12} /> Correct
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-red-500/10 text-red-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-red-500/20 shrink-0">
                      <XCircle size={12} /> Incorrect
                    </span>
                  )}
                </div>

                {/* Answer evaluation boxes */}
                <div className="space-y-1 text-[11px] sm:text-xs">
                  <p className="text-slate-400">
                    Your Answer: <span className={isUserCorrect ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                      {userAnswers[idx] === -1 ? "Timed Out / Skipped" : q.options[userAnswers[idx]]}
                    </span>
                  </p>
                  {!isUserCorrect && (
                    <p className="text-slate-300">
                      Correct Answer: <span className="text-emerald-400 font-semibold">{q.options[q.correctIndex]}</span>
                    </p>
                  )}
                </div>

                {/* Explanations snippet */}
                <div className="bg-[#0F172A] p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-normal">
                  <strong className="text-slate-200 uppercase tracking-widest text-[9px] block mb-1">AI Explanation Note:</strong>
                  {q.explanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

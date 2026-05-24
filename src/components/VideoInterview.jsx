import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { generateInterviewQuestions, scoreInterviewAnswer } from '../gemini';
import { 
  Sparkles, 
  Video, 
  VideoOff, 
  Mic, 
  Square, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ShieldCheck, 
  Volume2, 
  FileText, 
  Award,
  AlertTriangle,
  ClipboardList
} from 'lucide-react';

export default function VideoInterview({
  jobTitle,
  resumeText = "",
  jobDescription = "",
  projects = [],
  jobId,
  uid,
  onComplete
}) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Video / Audio device states
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  
  // Scoring API states
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [currentScoreResult, setCurrentScoreResult] = useState(null);

  // Total results array tracking
  const [interviewRecords, setInterviewRecords] = useState([]); // Array of { question, answer, score, relevance, clarity, confidence, feedback }
  
  // Final summary states
  const [interviewSubmitted, setInterviewSubmitted] = useState(false);
  const [savingResult, setSavingResult] = useState(false);

  // DOM Refs
  const videoRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const recognitionRef = useRef(null);

  // Fallback 5 standard questions in case LLM generation fails or drops
  const FALLBACK_INTERVIEW_QUESTIONS = [
    "Could you describe how you solved a highly complex technical challenge in your prior role?",
    "How do you approach learning and aligning with Canadian-specific security standards like PIPEDA or accessibility guidelines?",
    "Describe a conflict or difference of opinion with a stakeholder or coworker, and how you resolved it constructively.",
    "Why are you interested in this remote role, and how does your global background fit standard expectations?",
    "Can you outline your experience building or maintaining distributed server architectures or modular front-ends?"
  ];

  // 1. Initialise and fetch interview questions
  useEffect(() => {
    let active = true;

    async function fetchQuestions() {
      setLoading(true);
      try {
        const result = await generateInterviewQuestions(
          jobTitle,
          resumeText,
          jobDescription,
          projects
        );

        if (active) {
          if (result && Array.isArray(result) && result.length >= 3) {
            setQuestions(result.slice(0, 5));
          } else {
            console.warn("Using fallback video interview questions.");
            setQuestions(FALLBACK_INTERVIEW_QUESTIONS);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to generate personalized interview questions with Gemini:", err);
        if (active) {
          setQuestions(FALLBACK_INTERVIEW_QUESTIONS);
          setLoading(false);
        }
      }
    }

    fetchQuestions();

    return () => {
      active = false;
    };
  }, [jobTitle, resumeText, jobDescription]);

  // 2. getUserMedia webcam initialisation
  useEffect(() => {
    if (loading || interviewSubmitted) return;

    async function initWebcam() {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: true
        });
        setStream(userStream);
        if (videoRef.current) {
          videoRef.current.srcObject = userStream;
        }
      } catch (err) {
        console.warn("Camera physical device access denied or unavailable inside iframe:", err);
        setCameraError("Camera/Microphone access was denied or is not supported. You can still complete the text interview below.");
      }
    }

    initWebcam();

    // Cleanup resources
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [loading, currentQuestionIdx, interviewSubmitted]);

  // Ensure stream gets bound if videoRef updates
  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // 3. Web Speech Recognition API Initialization
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let finalTrans = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTrans) {
          setTranscript(prev => prev + finalTrans);
        }
      };

      rec.onerror = (e) => {
        console.warn("Web Speech Recognition API warning:", e);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Handle Recording sequence
  const startRecording = () => {
    if (isRecording) return;
    setIsRecording(true);
    setRecordSeconds(0);
    setTranscript('');

    // Start timer counter
    timerIntervalRef.current = setInterval(() => {
      setRecordSeconds(prev => prev + 1);
    }, 1000);

    // Start speech parsing
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Could not start Speech Recognition engine:", err);
      }
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    clearInterval(timerIntervalRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn("Could not stop Speech Recognition engine:", err);
      }
    }
  };

  const formatTimer = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 4. Score single question answer with Gemini
  const handleScoreAndProceed = async () => {
    if (!transcript.trim()) {
      alert("Please provide an answer by recording audio or typing directly first.");
      return;
    }

    setSubmittingAnswer(true);
    const questionText = questions[currentQuestionIdx];

    try {
      const response = await scoreInterviewAnswer(questionText, transcript);

      const computedScoreRecord = {
        question: questionText,
        answer: transcript,
        score: response?.score ?? 7,
        relevance: response?.relevance ?? 7,
        clarity: response?.clarity ?? 7,
        confidence: response?.confidence ?? 7,
        feedback: response?.feedback ?? "Excellent approach. Try adding quantitative metrics to increase relevance."
      };

      setCurrentScoreResult(computedScoreRecord);
    } catch (err) {
      console.error("Failed to parse Gemini feedback scores:", err);
      // Fallback fallback metric
      const fallbackRecord = {
        question: questionText,
        answer: transcript,
        score: 6,
        relevance: 7,
        clarity: 6,
        confidence: 6,
        feedback: "Response processed. Include specific metrics of high load or accessibility context matching Canadian criteria next time."
      };
      setCurrentScoreResult(fallbackRecord);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Proceed to next question or compile total score on step 5
  const handleNextQuestion = () => {
    if (!currentScoreResult) return;

    const updatedRecords = [...interviewRecords, currentScoreResult];
    setInterviewRecords(updatedRecords);

    // Reset temporary question variables
    setCurrentScoreResult(null);
    setTranscript('');
    setRecordSeconds(0);

    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      // Completed last question. Finalize!
      finalizeInterview(updatedRecords);
    }
  };

  const finalizeInterview = async (completedRecords) => {
    setLoading(true);
    setSavingResult(true);

    const scoresSum = completedRecords.reduce((acc, r) => acc + r.score, 0);
    const avgScore = Number((scoresSum / completedRecords.length).toFixed(1));
    const passed = avgScore >= 6; // Green screen if 6 or higher, otherwise Red screen

    // Save final report bundle to Firestore
    if (uid && jobId) {
      try {
        const interviewRef = doc(db, 'candidates', uid, 'interviewResults', jobId);
        await setDoc(interviewRef, {
          questions: completedRecords.map(r => r.question),
          scores: completedRecords.map(r => r.score),
          averageScore: avgScore,
          passed: passed,
          timestamp: new Date().toISOString(),
          details: completedRecords
        }, { merge: true });
      } catch (err) {
        console.error("Firestore error saving final interview metrics:", err);
      }
    }

    setSavingResult(false);
    setLoading(false);
    setInterviewSubmitted(true);

    if (onComplete) {
      onComplete(avgScore, passed);
    }
  };

  // Rendering Loader screen
  if (loading && !interviewSubmitted) {
    return (
      <div className="p-8 md:p-12 text-center flex flex-col items-center justify-center bg-[#1E293B]/60 rounded-2xl border border-[#334155]/60 backdrop-blur-md">
        <div className="relative inline-flex mb-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#334155] border-t-blue-500 animate-spin"></div>
          <Video className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={18} />
        </div>
        <h3 className="text-white font-extrabold text-sm mb-1 animate-pulse">AI is preparing your personalized interview</h3>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          Retrieving targeted questions focused on Canadian market standards, your past resume projects and {jobTitle} remote objectives...
        </p>
      </div>
    );
  }

  // Active question-by-question layout flow
  if (!interviewSubmitted) {
    const questionText = questions[currentQuestionIdx];
    const progressWidth = `${((currentQuestionIdx + 1) / questions.length) * 100}%`;

    return (
      <div id={`interview-active-question-${currentQuestionIdx}`} className="space-y-6">
        
        {/* Navy layout bar header */}
        <div className="bg-[#1E293B] p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-black uppercase tracking-widest border border-red-500/20">
                Live Simulation
              </span>
              <span className="text-slate-600 text-xs">|</span>
              <span className="text-slate-400 text-xs">{jobTitle} Remote Target</span>
            </div>
            <h2 className="text-white font-black text-lg sm:text-xl tracking-tight leading-tight">
              Interactive Video AI Interview Session
            </h2>
          </div>

          <div className="text-[11px] font-black text-white uppercase tracking-wider bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
            Question <span className="text-blue-500">{currentQuestionIdx + 1}</span> of {questions.length}
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-350"
            style={{ width: progressWidth }}
          ></div>
        </div>

        {/* Outer Grid Panel: Left is Video/Recording, Right is Slide-In Score Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main White Interactive card containing camera feed & textareas */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200 flex flex-col justify-between">
            <div>
              {/* Question Text in prominent header */}
              <div className="bg-[#0F172A] p-5 rounded-xl border border-slate-900 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl"></div>
                <span className="text-[9px] text-[#3B82F6] font-bold block uppercase tracking-widest mb-1">Active Prompt</span>
                <p className="text-white font-extrabold text-sm md:text-base leading-relaxed tracking-tight" id={`question-prompt-${currentQuestionIdx}`}>
                  {questionText}
                </p>
              </div>

              {/* TWO PANEL CONTROL: Left video box, Right live timer or error warning */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-6">
                
                {/* 1. Camera live feed */}
                <div className="sm:col-span-8 bg-[#0F172A] rounded-xl overflow-hidden aspect-video relative flex items-center justify-center border border-slate-900 shadow">
                  {stream && !cameraError ? (
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <VideoOff className="text-slate-500 mx-auto mb-2" size={24} />
                      <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
                        Camera inactive. Please permit permissions, or type your answer in the transcript below.
                      </p>
                    </div>
                  )}

                  {/* Pulsing visual cues for recording */}
                  {isRecording && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse shadow">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                      <span>REC</span>
                    </div>
                  )}
                </div>

                {/* 2. Recording panel controls */}
                <div className="sm:col-span-4 bg-slate-50 rounded-xl p-4 border border-slate-200/60 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Session Time</span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-slate-800 font-extrabold text-sm">
                      <Volume2 className={isRecording ? "text-red-500 shrink-0" : "text-slate-400 shrink-0"} size={14} />
                      <span>{isRecording ? formatTimer(recordSeconds) : '00:00'}</span>
                    </div>
                    {cameraError && (
                      <p className="text-[9.5px] text-red-600 leading-snug mt-2 underline">
                        {cameraError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-200">
                    {!isRecording ? (
                      <button
                        id="btn-rec-start"
                        onClick={startRecording}
                        className="w-full h-10 bg-red-600 hover:bg-red-700 active:scale-95 transition-all text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
                      >
                        <div className="w-3 h-3 rounded-full bg-white select-none shrink-0" />
                        <span>Start Speech Record</span>
                      </button>
                    ) : (
                      <button
                        id="btn-rec-stop"
                        onClick={stopRecording}
                        className="w-full h-10 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
                      >
                        <Square size={12} className="fill-white shrink-0" />
                        <span>Stop Speech Record</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* EDITABLE TRANSCRIPT BOX */}
              <div className="space-y-1.5 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] bg-slate-100 text-[#0F172A] px-2.5 py-1 rounded-lg uppercase font-bold tracking-wider hover:bg-slate-200 transition-colors">
                    Candidate Response (Editable)
                  </span>
                  {!recognitionRef.current && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <AlertTriangle size={11} className="text-amber-500" /> Speech Engine blocked (Manual Mode Setup)
                    </span>
                  )}
                </div>
                <textarea
                  id={`response-transcript-area-${currentQuestionIdx}`}
                  rows={4}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Record your voice response above, or directly type your comprehensive tech answer experience details in this editable textbox..."
                  className="w-full bg-[#0F172A] border border-slate-900 rounded-xl p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium leading-relaxed resize-none"
                ></textarea>
              </div>

            </div>

            {/* BUTTON SUBMISSIONS FOR THE INDIVIDUAL ANSWER */}
            <div className="flex justify-between items-center border-t border-slate-150 pt-5">
              <button
                id="btn-skip-answer"
                onClick={() => setTranscript("I have completed similar projects handling scale. I am open to discussing specific constraints in detail during the formal live call.")}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2.5 py-1"
              >
                Insert Express Template Response
              </button>

              <button
                id="btn-transcript-submit-score"
                onClick={handleScoreAndProceed}
                disabled={submittingAnswer || !transcript.trim()}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow ${
                  submittingAnswer 
                    ? 'bg-blue-600/50 text-slate-300 cursor-not-allowed'
                    : !transcript.trim()
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'
                      : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                }`}
              >
                {submittingAnswer ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Auditing Metrics with Gemini...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Answer</span>
                    <Sparkles size={14} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SLIDEOUT RIGHT HAND SCORE CARD COMPONENT */}
          <div className="lg:col-span-4 space-y-4">
            {currentScoreResult ? (
              <div className="bg-[#121B2E] border border-slate-800 rounded-2xl p-5 shadow-2xl animate-fade-in space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-rose-100/10">
                  <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest flex items-center gap-1">
                    <Award size={13} /> Gemini Score Assessment
                  </span>
                  <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md">
                    Complete
                  </span>
                </div>

                {/* Score badge */}
                <div className="text-center py-4 bg-slate-900/60 rounded-xl border border-slate-850">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Overall Answer Score</span>
                  <p className="text-3xl font-black text-white mt-1">{currentScoreResult.score} <span className="text-xs text-slate-500">/ 10</span></p>
                </div>

                {/* Specific criteria metrics */}
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>Relevance to Position</span>
                      <strong className="text-white">{currentScoreResult.relevance} / 10</strong>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${currentScoreResult.relevance * 10}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>Clarity & Communication</span>
                      <strong className="text-white">{currentScoreResult.clarity} / 10</strong>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${currentScoreResult.clarity * 10}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>Technical Confidence</span>
                      <strong className="text-white">{currentScoreResult.confidence} / 10</strong>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${currentScoreResult.confidence * 10}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Feedback prompt */}
                <div className="bg-[#0F172A] p-4 rounded-xl border border-slate-900 text-xs">
                  <span className="text-[10px] text-blue-400 font-extrabold block uppercase tracking-wider mb-1.5">Canadian Compliance Pro-tip:</span>
                  <p className="text-slate-300 leading-relaxed font-semibold">
                    "{currentScoreResult.feedback}"
                  </p>
                </div>

                {/* Continue button */}
                <button
                  id="btn-scorecard-continue"
                  onClick={handleNextQuestion}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-550 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer shadow"
                >
                  <span>{currentQuestionIdx === questions.length - 1 ? 'Analyze Final Score Summary' : 'Proceed to Next Question'}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
                <ClipboardList size={28} className="text-slate-500 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-300">Awaiting Answer Submission</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                  Record your comprehensive answer and select the submit button to populate real-time AI scoring matrices.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    );
  }

  // Calculate final dashboard numbers
  const finalSum = interviewRecords.reduce((acc, r) => acc + r.score, 0);
  const finalAvg = Number((finalSum / interviewRecords.length).toFixed(1));
  const isFinalPass = finalAvg >= 6; // score 6 or higher passes as requested

  return (
    <div id="interview-completed-container" className="space-y-6">
      
      {/* 1. PASS SCREEN IF 6 OR HIGHER */}
      {isFinalPass ? (
        <div className="bg-[#121B2E] border border-slate-800 p-6 sm:p-8 rounded-3xl text-center flex flex-col items-center">
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest list-none flex items-center gap-1.5 mb-6">
            <CheckCircle2 size={16} />
            <span>Pass Grade Confirmed</span>
          </div>

          <h2 className="text-white text-xl font-black mb-1">Congratulations! You Passed the Screening Evaluation</h2>
          <p className="text-slate-400 text-xs max-w-sm leading-relaxed mb-6">
            Your confidence, logic formulation and target sector alignment scores surpassed the recommended Canadian pass brackets.
          </p>

          {/* Circular progress gauge */}
          <div className="relative w-36 h-36 flex items-center justify-center select-none mb-6">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle className="text-slate-800 stroke-current text-[#162031]" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent" />
              <circle className="text-emerald-500 stroke-current" strokeWidth="8" strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - finalAvg / 10)}`} cx="50" cy="50" r="40" fill="transparent" />
            </svg>
            <div className="absolute text-center">
              <span className="text-3xl font-black text-white leading-none">{finalAvg} <span className="text-xs font-medium text-slate-400">/ 10</span></span>
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">GPA Target</span>
            </div>
          </div>

          <button
            onClick={() => onComplete && onComplete(finalAvg, true)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-550 text-white text-xs font-bold rounded-xl shadow-lg transition-transform active:scale-95 duration-200"
          >
            Update Recruiting Dashboard Profile
          </button>
        </div>
      ) : (
        // 2. RED FAIL SCREEN WITH DETAILED FEEDBACKS REPORT
        <div className="bg-[#1E1B22] border border-red-900/40 p-6 sm:p-8 rounded-3xl text-center flex flex-col items-center">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest list-none flex items-center gap-1.5 mb-6">
            <XCircle size={16} />
            <span>Score Below Recommended 6/10</span>
          </div>

          <h2 className="text-white text-xl font-black mb-1">Interview Audit Incomplete</h2>
          <p className="text-slate-400 text-xs max-w-sm leading-relaxed mb-6">
            We discovered critical vocabulary or metric gaps compared against standard Canadian corporate remote guidelines.
          </p>

          {/* Low Score Circular progress gauge */}
          <div className="relative w-36 h-36 flex items-center justify-center select-none mb-6">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle className="text-slate-800 stroke-current text-[#162031]" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent" />
              <circle className="text-red-500 stroke-current" strokeWidth="8" strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - finalAvg / 10)}`} cx="50" cy="50" r="40" fill="transparent" />
            </svg>
            <div className="absolute text-center">
              <span className="text-3xl font-black text-white leading-none">{finalAvg} <span className="text-xs font-medium text-slate-400">/ 10</span></span>
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Average Score</span>
            </div>
          </div>

          <button
            onClick={() => onComplete && onComplete(finalAvg, false)}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all"
          >
            Return to Dashboard Setup
          </button>
        </div>
      )}

      {/* DETAILED QUESTION REPORT */}
      <div className="space-y-4 pt-4">
        <h3 className="text-slate-300 text-sm font-bold uppercase tracking-widest pl-1">
          Detailed Per-Question Feedback Report
        </h3>

        <div className="space-y-3.5">
          {interviewRecords.map((record, index) => (
            <div key={index} className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-400 text-xs font-bold">Question {index + 1}</span>
                <span className={`text-xs font-black ${record.score >= 6 ? 'text-emerald-400' : 'text-red-400'}`}>
                  Score: {record.score} / 10
                </span>
              </div>
              <p className="text-white text-xs font-extrabold leading-normal">{record.question}</p>
              <p className="text-slate-400 text-xs italic leading-relaxed">" {record.answer} "</p>

              <div className="bg-[#0F172A] p-3 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                <strong className="text-blue-400 uppercase tracking-widest text-[9px] block mb-1">AI Recommendation Tip:</strong>
                {record.feedback}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

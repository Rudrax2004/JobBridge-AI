import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { chatbotReply } from '../gemini';
import { MessageSquare, X, Send, Sparkles, User, HelpCircle } from 'lucide-react';

export default function Chatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [profileContext, setProfileContext] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hi there! I am your JobBridge AI assistant. How can I help you navigate your Canadian job search, NOC classifications, or remote safety checks today?"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const chatEndRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Load user context
  useEffect(() => {
    async function loadUserContext() {
      if (!user) return;
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          const name = data.displayName || user.email?.split('@')[0] || 'User';
          const role = data.role || 'seeker';
          const background = data.background ? JSON.stringify(data.background) : 'Not provided';
          const skills = data.aiExtracted?.skills ? data.aiExtracted.skills.join(', ') : 'Not provided';
          const noc = data.nocAnalysis?.nocCode || data.nocCode || 'None';
          
          setProfileContext(
            `User Name: ${name}. Role: ${role}. Experience Profile: ${background}. Highlighted Skills: ${skills}. Active NOC code target: ${noc}.`
          );
        } else {
          setProfileContext(`User Email: ${user.email}. Authentication UID: ${user.uid}. Status: Onboarding is incomplete.`);
        }
      } catch (err) {
        console.error('Failed to preload user context for chatbot:', err);
      }
    }
    loadUserContext();
  }, [user]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue.trim();
    if (!text) return;

    if (!textToSend) {
      setInputValue('');
    }

    // Append user message
    const userMsg = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setIsSending(true);

    try {
      const reply = await chatbotReply(text, profileContext || `Fallback user email is ${user?.email}`);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: reply || "I ran into a temporary issue analyzing that. Please try rephrasing your question!"
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('Error generating chatbot reply:', err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 2,
          sender: 'bot',
          text: "I couldn't generate a reply right now. Please ensure your Google Gemini API key is configured correctly."
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const currentQuestions = [
    "Tell me about TEER levels?",
    "How to verify if a job is fake?",
    "What NOC code suits my skills?"
  ];

  return (
    <div id="ai-companion-wrapper" className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          id="btn-chatbot-trigger"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-xl hover:shadow-blue-500/20 active:scale-95 transition-all duration-200"
          title="Open JobBridge Assistant"
        >
          <MessageSquare size={24} />
          <span className="text-xs font-extrabold pr-1.5 hidden md:inline">AI Companion</span>
        </button>
      )}

      {/* Expanded Chat Box */}
      {isOpen && (
        <div 
          id="chatbot-expanded-box" 
          className="w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-fade-in"
        >
          {/* Header */}
          <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                JB
              </div>
              <div>
                <h4 className="text-sm font-black leading-tight flex items-center gap-1">
                  JobBridge Co-pilot
                  <Sparkles size={11} className="text-blue-400 fill-blue-400" />
                </h4>
                <p className="text-[10px] text-slate-400">Canadian Migrant Safety Guide</p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Panel */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex gap-2 w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-6 h-6 rounded bg-blue-600/10 flex items-center justify-center shrink-0">
                    <Sparkles size={12} className="text-blue-600" />
                  </div>
                )}
                
                <div 
                  className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-xs font-medium leading-relaxed shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center shrink-0">
                    <User size={12} className="text-slate-600" />
                  </div>
                )}
              </div>
            ))}
            {isSending && (
              <div className="flex gap-2 w-full justify-start items-center">
                <div className="w-6 h-6 rounded bg-blue-600/10 flex items-center justify-center shrink-0">
                  <Sparkles size={12} className="text-blue-600 animate-pulse" />
                </div>
                <div className="bg-white border border-slate-100 rounded-xl rounded-tl-none px-4 py-2 text-xs text-slate-400 font-semibold flex items-center gap-1 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce delay-150"></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Helper Suggestion Chips */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex gap-1.5 overflow-x-auto shrink-0 select-none scrollbar-none">
            {currentQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="bg-white hover:bg-blue-50 border border-slate-100 hover:border-blue-200 text-[10.5px] text-slate-600 hover:text-blue-600 rounded-full px-3 py-1 font-bold whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
              >
                <HelpCircle size={10} />
                <span>{q}</span>
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="p-3 border-t border-slate-100 flex gap-2 items-center bg-white shrink-0"
          >
            <input
              id="chatbot-text-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type message..."
              disabled={isSending}
              className="flex-1 text-xs border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 outline-none font-medium placeholder-slate-400 bg-slate-50 focus:bg-white transition-all disabled:opacity-60"
            />
            <button
              id="btn-chatbot-send"
              type="submit"
              disabled={!inputValue.trim() || isSending}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-300 p-2.5 rounded-xl active:scale-95 transition-all outline-none"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

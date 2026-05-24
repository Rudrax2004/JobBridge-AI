const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

function cleanJsonString(str) {
  if (!str) return '';
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

async function callGemini(prompt, isJson = true) {
  const response = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: isJson ? { responseMimeType: 'application/json' } : undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No text returned from Gemini API');
  }
  return text;
}

export async function generateAptitudeTest(jobTitle, seniorityLevel, skills, projects) {
  try {
    const prompt = `Generate 8 multiple choice questions for the job title "${jobTitle}" at seniority level "${seniorityLevel}".
Taking into account candidate skills: "${skills || 'None'}" and projects: "${JSON.stringify(projects || [])}".
Each question must have:
- question (string)
- options (array of exactly 4 strings)
- correctIndex (number between 0 and 3)
- explanation (string)

Return ONLY a valid JSON array of objects conforming to this schema. No markdown fences, no conversational text. Example format:
[
  {
    "question": "What is ...?",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "Because..."
  }
]`;
    const resText = await callGemini(prompt, true);
    return JSON.parse(cleanJsonString(resText));
  } catch (error) {
    console.error('Error in generateAptitudeTest:', error);
    return null;
  }
}

export async function generateInterviewQuestions(jobTitle, resumeText, jobDescription, projects) {
  try {
    const prompt = `Generate 5 interview questions personalized to the candidate resume and projects for the job: "${jobTitle}".
Candidate Resume: "${resumeText || 'None'}"
Job Description: "${jobDescription || 'None'}"
Projects: "${JSON.stringify(projects || [])}"

Return ONLY a valid JSON array of exactly 5 question strings. Do not return keys, return a straight array of strings. Example:
["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"]`;
    const resText = await callGemini(prompt, true);
    return JSON.parse(cleanJsonString(resText));
  } catch (error) {
    console.error('Error in generateInterviewQuestions:', error);
    return null;
  }
}

export async function scoreInterviewAnswer(question, transcript) {
  try {
    const prompt = `Evaluate code or response for the interview question.
Question: "${question}"
Candidate Answer / Transcript: "${transcript}"

Assess the response and return ONLY a valid JSON object containing exactly the following numeric ratings (1 to 10) and one feedback sentence:
{
  "score": 8,
  "relevance": 9,
  "clarity": 7,
  "confidence": 8,
  "feedback": "One sentence actionable improvement tip for a newcomer to Canada."
}`;
    const resText = await callGemini(prompt, true);
    return JSON.parse(cleanJsonString(resText));
  } catch (error) {
    console.error('Error in scoreInterviewAnswer:', error);
    return null;
  }
}

export async function scoreJobLegitimacy(jobText) {
  try {
    const prompt = `Analyze this Canadian job contract or posting for scams, pyramid scheme red flags, unrealistic salary guarantees, communication red flags (e.g. WhatsApp recruitment, demanding setup fee/home kit buying).
Job Posting Content:
"${jobText}"

Based on this analysis, return ONLY a valid JSON object in this format:
{
  "score": 8, // Legitimacy score out of 10. Low numbers (1-4) mean suspicious scam elements found.
  "flags": ["list", "of", "detected", "scam", "vectors", "or", "issues"],
  "verdict": "Verified", // Must be exactly "Verified", "Suspicious", or "Rejected"
  "summary": "One sentence summary highlighting the trust level."
}`;
    const resText = await callGemini(prompt, true);
    return JSON.parse(cleanJsonString(resText));
  } catch (error) {
    console.error('Error in scoreJobLegitimacy:', error);
    return null;
  }
}

export async function parseResume(resumeText) {
  try {
    const prompt = `Parse the following raw resume text and extract the structured components.
Resume Text:
"${resumeText}"

Return ONLY a valid JSON object matching this structure exactly:
{
  "jobTitles": ["string"],
  "skills": ["string"],
  "education": "string summary",
  "yearsExperience": 5, // number
  "certifications": ["string"],
  "projects": [
    {
      "name": "project name",
      "description": "project description"
    }
  ]
}`;
    const resText = await callGemini(prompt, true);
    return JSON.parse(cleanJsonString(resText));
  } catch (error) {
    console.error('Error in parseResume:', error);
    return null;
  }
}

export async function suggestNOCCode(resumeText) {
  try {
    const prompt = `Analyze this resume background and find the most relevant and accurate National Occupational Classification (NOC) Code for the Canadian immigration pathway (NOC 2021 system).
Resume:
"${resumeText}"

Return ONLY a valid JSON object matching this structure:
{
  "nocCode": "21232", // sample 5-digit NOC 2021 code
  "nocTitle": "Software developers and programmers",
  "teerLevel": 1, // TEER level as an integer from 0 to 5
  "expressEntryEligible": true, // boolean
  "explanation": "One sentence explaining why this fits best."
}`;
    const resText = await callGemini(prompt, true);
    return JSON.parse(cleanJsonString(resText));
  } catch (error) {
    console.error('Error in suggestNOCCode:', error);
    return null;
  }
}

export async function chatbotReply(userMessage, context) {
  try {
    const prompt = `You are JobBridge AI Assistant, a helpful guide for Canadian immigrants looking for remote jobs.
User context profile: "${context}"
User query: "${userMessage}"

Reply to the user message in 2 to 3 friendly sentences focused on Canadian job market topics like NOC codes, Express Entry, and job search tips.
Return only the straight text reply. Do not wrap in JSON or markdown blocks.`;
    const resText = await callGemini(prompt, false);
    return resText ? resText.trim() : null;
  } catch (error) {
    console.error('Error in chatbotReply:', error);
    return null;
  }
}

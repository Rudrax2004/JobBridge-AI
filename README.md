# JobBridge AI
### Connecting Canadian Immigrants to Legitimate Remote Jobs Through AI

Navigating the Canadian job market can be a daunting experience for new immigrants. From decoding complex National Occupational Classification (NOC) system structures to avoiding predatory employment scams in online listings, newcomers often encounter substantial barriers and vulnerabilities. Traditional recruitment channels frequently overlook international credentials and experiences, resulting underemployment or vulnerability to fraudulent recruitment schemes that exploit candidates seeking valid Canadian employment experience. JobBridge AI bridges this gap, establishing a secure, verified hiring ecosystem tailored for the newcomer community.

Our platform operates on a comprehensive two-fold AI-powered safeguard. First, an automated **Job Legitimacy Verification Engine** inspects all employer job submissions in real-time, calculating a trust score and assigning diagnostic verdict badges to weed out suspicious schemes. Second, candidates undergo a structured **Three-Stage AI Assessment Pipeline**, starting with a personalized technical aptitude test derived from their specific resumes and projects, leading into an AI-powered Video Interview scoring their relevance and communication, and concluding with transparent HR scheduling. This integrated cycle allows verified newcomers to showcase genuine capabilities directly to Canadian employers without bias or friction.

---

## Key Features

- **AI Job Legitimacy Scoring**: Real-time regulatory trust checking of remote opportunities with visual verdict badges ("Verified", "Suspicious", "Rejected") protecting immigrant candidates from potential recruitment scams.
- **Personalized AI Aptitude Test**: Dynamically generated technical and context-specific testing parameters mapped directly to the candidate's resume contents, projects, and target seniority levels.
- **AI Video Interview**: Integrated audio/video response simulator providing real-time evaluation feedback based on core competencies, relevance, articulation, and clarity.
- **NOC Code Finder Tool**: Natural language tool that takes target skills or past roles and maps them instantly to official National Occupational Classification (NOC 2021) codes and TEER requirements.
- **AI Chatbot Assistant**: Interactive continuous help copilot providing real-time guidance regarding Canadian workplace expectations, TEER metrics, and resume-building strategies.
- **Advanced Filtering Capabilities**: Easily drill down into relevant opportunities using parameters such as location (Canadian Province), TEER Level requirements, physical structure (Remote/Hybrid), and job arrangement.
- **Three-Stage Recruitment Pipeline**: Fully structured candidate funnel starting from the preliminary technical evaluation all the way to a scheduled live HR video conference round.

---

## Tech Stack

- **Frontend & Rendering**: React (with Vite)
- **Styling**: TailwindCSS
- **Database & Identity**: Firebase Authentication & Cloud Firestore database
- **Artificial Intelligence Orchestration**: Gemini API (`gemini-1.5-flash`)
- **Navigation Routing**: React Router v6

---

## Setup & Local Installation

Follow these steps to spin up and run JobBridge AI locally:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your credentials as specified below:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain_here
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id_here
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket_here
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id_here
   VITE_FIREBASE_APP_ID=your_firebase_app_id_here
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

---

## Deployment

### Frontend Deployment (Firebase Hosting)
Compile production-ready static assets and deploy directly using the Firebase CLI tool:
```bash
# Build the optimized production bundle
npm run build

# Deploy assets to hosting live container
firebase deploy
```

### Backend Deployment (Render)
To host any required backend services:
1. Connect your Github repository directly inside your **Render Dashboard**.
2. Create a new Node.js Web Service.
3. Configure your build command as `npm run build` and start command as `npm run start`.
4. Inject all relevant environment variables under the **Environment** settings panel in Render.

---

## The Team

- **Rudrax Prajapati** — MSc. Computational Science Student @ Laurentian University
- **Daivanshika Patel** — MSc. Computational Science @ Laurentian University
- **Omkumar Patel** — MSc. Computational Science @ Laurentian University

*Note: This project was built for the **Scale Hackathon** and submitted on **Devpost**.*

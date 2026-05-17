# Velora: Next-Gen Neural Architecture

Velora is an elite technical intelligence platform designed for rapid software engineering, deep research, and high-fidelity asset synthesis. It leverages a proprietary multi-agent loop powered by state-of-the-art Gemini models to deliver production-grade results with autonomous execution capabilities.

## 🚀 Key Features

### 1. Neural Core (Agent Modes)
Velora operates through three distinct neural specializations optimized for specific technical workflows:
- **VION (Rapid)**: Powered by `gemini-2.0-flash-exp` for ultra-fast technical answers, code snippets, and quick debugging.
- **PULSE (Deep Search)**: Utilizes `gemini-1.5-pro` for complex research, architectural reviews, and deep file analysis across thousands of context tokens.
- **STUDIO (Asset Generation)**: A dedicated creative engine for synthesizing high-fidelity realistic placeholders and studio-grade UI assets.

### 2. Neural Link (RAG)
Integrated vector search capabilities using text embeddings to provide contextual grounding. Velora can ingest and reference specific technical documentation or project context to minimize hallucinations and maximize accuracy.

### 3. Basic Guard Security
Implemented "Basic Guard" neural encryption and essential data protection protocols to ensure a secure operating environment for technical queries.

### 4. Real-time Streaming
Experience high-velocity inference with real-time neural streaming, providing instant feedback as the agents process complex instructions.

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS (Mobile-first, Responsive)
- **Animations**: Framer Motion (`motion/react`)
- **Backend**: Express + Node.js (TypeScript)
- **AI/ML**: Google Generative AI (@google/genai)
- **Database**: Firebase (Firestore) & Vector Embeddings
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4

## 📦 Getting Started

### Prerequisites
- Node.js 20+
- Google Gemini API Key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables (copy `.env.example` to `.env`):
   ```env
   GEMINI_API_KEY=your_api_key_here
   PINECONE_API_KEY=optional_vector_store_key
   PINECONE_INDEX=velora
   ```

### Development

Run the development server (Proxy + Frontend):
```bash
npm run dev
```
The server will be available at `http://localhost:3000`.

### Production Build

Build and bundle the application:
```bash
npm run build
npm start
```

## 🚀 Deployment to Render

This application is ready for deployment on **Render** as a Web Service.

### 1. Simple Deployment (Render Blueprint)
1. Fork or upload this repository to GitHub/GitLab.
2. In your Render Dashboard, click **New +** and select **Blueprint**.
3. Connect your repository. Render will automatically detect the `render.yaml` file.
4. Provide the required Environment Variables when prompted (`GEMINI_API_KEY`).

### 2. Manual Deployment
If you prefer to configure it manually:
1. Create a new **Web Service**.
2. **Runtime**: Node
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. **Environment Variables**:
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `NODE_VERSION`: `20` (recommended).

---


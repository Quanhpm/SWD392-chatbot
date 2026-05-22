# SE1939 RAG Chatbot — Course Document Q&A System

Build a full-stack Retrieval-Augmented Generation (RAG) chatbot web application for course document Q&A. The app serves the university course "SE1939 — Software Modeling and Design: UML, Use Cases, Patterns, and Software Architectures".

## 1. Project Overview & Features
Users can upload course materials (PDF chapters, DOCX notes, PPTX slides). The backend automatically extracts text, splits it into semantic chunks, generates vector embeddings, and stores everything in MongoDB. Users ask course-related questions in a natural chat interface. The system retrieves relevant chunks, sends them as context to Gemini, and generates an answer strictly from the uploaded materials, including precise citations.

- **Document Vault**: Manage and view all indexed materials (PDF, DOCX, PPTX).
- **Intelligent RAG Pipeline**: Local cosine similarity ranking for free tier MongoDB compatibility.
- **Academic Chat Interface**: Multi-session conversations with interactive source citations.
- **Test Set Suite**: Includes 50 evaluation Q&A pairs spanning different categories and difficulties.

## 2. Tech Stack
| Layer | Technology |
|-------|------------|
| Backend Runtime | Node.js (v18+) |
| Web Framework | Express.js with TypeScript |
| Database | MongoDB & Mongoose |
| AI Client | Gemini API (`gemini-2.5-flash`, `gemini-embedding-001`) |
| Parsing Libraries | `pdf-parse`, `mammoth`, `officeparser` |
| Frontend | React 18+, Vite, TypeScript, Axios, Vanilla CSS |

## 3. Prerequisites
- Node.js 18+ LTS
- Docker (for running MongoDB locally)
- Gemini API Key

## 4. Quick Start

### 1. Launch MongoDB Container
```bash
docker-compose up -d
```

### 2. Configure & Start Backend
```bash
cd backend
cp .env.example .env
# Edit .env and supply your GEMINI_API_KEY
npm install
npm run dev
```

### 3. Start Frontend (New Terminal)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

## 5. Directory Structure
```
se1939-rag-chatbot/
├── backend/
│   ├── src/
│   │   ├── config/          # DB & env validation
│   │   ├── models/          # Document, Chunk, ChatSession models
│   │   ├── services/        # Parsers, embedding, similarity search, chat pipeline
│   │   └── index.ts         # Express entry
├── frontend/
│   ├── src/
│   │   ├── components/      # layout, chat, documents, shared, testset components
│   │   ├── pages/           # ChatPage, DocumentsPage, TestSetPage
│   │   └── App.tsx          # Main React router
└── test-set.json            # 50 Q&A pairs for accuracy assessments
```

## 6. REST API Documentation
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents/upload` | POST | Upload file (multipart/form-data) |
| `/api/documents` | GET | Retrieve all documents |
| `/api/documents/:id` | GET | Get single document |
| `/api/documents/:id` | DELETE | Delete document & all associated chunks |
| `/api/chat/sessions` | POST | Create new chat session |
| `/api/chat/sessions` | GET | Retrieve all sessions |
| `/api/chat/sessions/:id` | GET | Get session with messages |
| `/api/chat/sessions/:id/messages` | POST | Send message to session |
| `/api/chat/sessions/:id` | DELETE | Delete session |
| `/api/test-set` | GET | Get 50 course evaluation questions |

## 7. Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | None | Your Gemini API Key (Required) |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | Gemini embedding model |
| `GEMINI_CHAT_MODEL` | `gemini-2.5-flash` | Gemini chat model |
| `MONGODB_URI` | `mongodb://localhost:27017/se1939-rag-chatbot` | Mongo database connection string |
| `PORT` | `3001` | Backend port |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend Origin |
| `CHUNK_SIZE` | `800` | Target chunk size (tokens) |
| `CHUNK_OVERLAP` | `200` | Overlap between chunks |
| `SIMILARITY_THRESHOLD` | `0.6` | Cosine similarity cutoff (0 - 1) |
| `ALLOW_GENERAL_QUESTIONS` | `true` | Answer outside uploaded materials when retrieval has no matching context |

## 8. Troubleshooting
- **Gemini Errors**: Verify your API key is enabled for Gemini API and is correctly set in `backend/.env`.
- **MongoDB Connection Failed**: Ensure Docker is running and `docker-compose up` is healthy.
- **Large Files**: Adjust `MAX_FILE_SIZE` in the `.env` if uploading files larger than 50MB.

## 9. License
Distributed under the MIT License.

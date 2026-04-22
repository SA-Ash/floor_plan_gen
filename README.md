<p align="center">
  <img src="https://img.shields.io/badge/AI-BIM%20Platform-blue?style=for-the-badge&logo=homeassistant&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
</p>

# 🏠 Build My Home — AI Construction Platform

> **An AI‑powered Building Information Modeling (BIM) platform** that takes a plain‑English description of your dream building and generates floor plans, structural grids, MEP routing, construction schedules, cost estimates, and step‑by‑step worker guidance — all in seconds.

---

## 📑 Table of Contents

- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Running Each Service](#-running-each-service)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [AI / ML Pipeline](#-ai--ml-pipeline)
- [Frontend Pages](#-frontend-pages)
- [Environment Variables](#-environment-variables)
- [Troubleshooting](#-troubleshooting)

---

## 🏗️ Architecture

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────────────┐
│   React Frontend    │────▶│  Node.js Backend    │────▶│  Python BIM AI Engine       │
│   (Vite · :5173)    │◀────│  (Express · :8000)  │◀────│  (FastAPI · :8001)          │
│                     │     │                     │     │                             │
│ • Dashboard         │ API │ • REST API          │proxy│ • PPO Floor Plan Generator  │
│ • Project Wizard    │─────│ • WebSocket         │─────│ • BERT NLP Parser           │
│ • Floor Plan Viewer │     │ • In-Memory Store   │     │ • Structural Grid (IS 456)  │
│ • Cost Estimator    │     │ • Auth Mock         │     │ • MEP Routing (Dijkstra/A*) │
│ • Scheduler (Gantt) │     │ • Notification Svc  │     │ • CPM Scheduler (NetworkX)  │
│ • MEP Visualizer    │     │                     │     │ • RF Cost Estimator         │
│ • Task Graph (DAG)  │     │                     │     │ • Multi-Floor Layout        │
│ • Worker Guidance   │     │                     │     │ • Constraint Validator       │
│ • 3D BIM Viewer     │     │                     │     │                             │
└─────────────────────┘     └─────────────────────┘     └─────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer          | Technology                                                              |
| -------------- | ----------------------------------------------------------------------- |
| **Frontend**   | React 19, Redux Toolkit, React Router 7, Three.js, Vite 7, React Icons |
| **Backend**    | Node.js, Express 4, WebSocket (ws), Axios, UUID                        |
| **AI Engine**  | Python 3.10+, FastAPI, PyTorch, scikit-learn, NetworkX, Gymnasium       |
| **AI Models**  | PPO (floor plans), BERT (NLP), Random Forest (costs), Dijkstra (MEP)   |

---

## 📋 Prerequisites

Make sure you have these installed:

| Tool       | Version  | Check Command        |
| ---------- | -------- | -------------------- |
| **Node.js**| ≥ 18.x   | `node --version`     |
| **npm**    | ≥ 9.x    | `npm --version`      |
| **Python** | ≥ 3.10   | `python --version`   |
| **pip**    | latest   | `pip --version`      |

---

## 🚀 Quick Start

**Clone and start everything in 3 terminals:**

### Terminal 1 — Python AI Engine (optional, backend works without it)

```bash
cd Build_my_Home
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install fastapi uvicorn torch scikit-learn networkx gymnasium numpy matplotlib
cd Other_models_Fastapi
uvicorn fastapi_server:app --reload --port 8001
```

### Terminal 2 — Node.js Backend

```bash
cd backend
npm install
npm run dev
```

> Backend starts on **http://localhost:8000**

### Terminal 3 — React Frontend

```bash
cd frontend
npm install
npm run dev
```

> Frontend starts on **http://localhost:5173**

### 🎉 Open your browser

Navigate to **http://localhost:5173** — you're in!

> **Note:** The Node.js backend works standalone with pre‑seeded data. The Python AI engine is only needed if you want real AI‑generated outputs instead of the seed data.

---

## 🔧 Running Each Service

### Backend Only

```bash
cd backend
npm install
npm start          # Production
npm run dev        # Development (auto-restart on changes)
```

| Setting            | Default                    |
| ------------------ | -------------------------- |
| HTTP port          | `8000`                     |
| WebSocket          | `ws://localhost:8000/ws`   |
| Python AI proxy    | `http://localhost:8001`    |
| CORS origin        | `http://localhost:5173`    |

### Frontend Only

```bash
cd frontend
npm install
npm run dev        # Dev server with HMR
npm run build      # Production build → dist/
npm run preview    # Preview production build
```

The Vite dev server automatically proxies `/api` → `:8000` and `/ws` → `:8000`, so no CORS issues during development.

### Python AI Engine Only

```bash
cd Build_my_Home/Other_models_Fastapi
uvicorn fastapi_server:app --reload --port 8001
```

Endpoints: `/generate`, `/mep`, `/schedule`, `/cost`, `/health`

---

## 📁 Project Structure

```
floor_plan_generation/
│
├── frontend/                    # React SPA (Vite)
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── common/          #   Button, Card, Modal, Toast
│   │   │   └── layout/          #   Header, Sidebar
│   │   ├── pages/               # Route pages
│   │   │   ├── Home/            #   Landing page
│   │   │   ├── Dashboard/       #   Project overview + stats
│   │   │   ├── ProjectNew/      #   4-step creation wizard + NLP
│   │   │   ├── ProjectDetail/   #   Full project view + tabs
│   │   │   ├── FloorPlanViewer/ #   Canvas-based 2D floor plan
│   │   │   ├── CostEstimator/   #   Cost charts + calculator
│   │   │   ├── MEPRouting/      #   Plumbing & electrical visualizer
│   │   │   ├── TaskGraph/       #   DAG dependency graph
│   │   │   ├── Scheduler/       #   Gantt chart (CPM)
│   │   │   ├── WorkerGuidance/  #   Step-by-step instructions
│   │   │   └── Viewer3D/        #   Three.js BIM viewer
│   │   ├── services/            # API client + WebSocket
│   │   ├── store/               # Redux slices (auth, project, ui)
│   │   └── styles/              # CSS variables + globals
│   ├── vite.config.js           # Dev proxy configuration
│   └── package.json
│
├── backend/                     # Node.js API server
│   ├── server.js                # Express entry point
│   ├── config.js                # Environment configuration
│   ├── store.js                 # In-memory data store
│   ├── ws.js                    # WebSocket handler
│   ├── routes/
│   │   ├── auth.js              # Mock authentication
│   │   ├── projects.js          # CRUD + pipeline triggers
│   │   ├── ai.js                # NLP, cost prediction, worker tasks
│   │   └── dashboard.js         # Stats, activity, notifications
│   ├── data/
│   │   └── seedData.js          # Pre-populated demo data
│   └── package.json
│
└── Build_my_Home/               # Python AI/ML Engine
    ├── bert/                    # BERT NLP requirement parser
    ├── ppo/                     # PPO-based floor plan agent
    │   ├── floor_plan_env.py    #   Gymnasium environment
    │   ├── ppo_agent.py         #   PPO policy network
    │   └── train.py             #   Training script
    ├── plan_generator/          # Multi-floor layout engine
    ├── Multi_floor_layout/      # Multi-floor env + training
    ├── columns_beams/           # Structural grid (IS 456)
    │   ├── structural_grid.py   #   Column/beam placement
    │   ├── load_estimator.py    #   Dead + live load calc
    │   └── column_predictor.py  #   ML column size predictor
    ├── constraints/             # Building code validator
    │   └── constraint_validator.py
    └── Other_models_Fastapi/    # FastAPI integration server
        ├── fastapi_server.py    #   REST API (port 8001)
        ├── pipeline.py          #   Full BIM pipeline
        ├── mep_routing.py       #   Dijkstra/A* MEP routing
        ├── scheduler.py         #   CPM/PERT scheduler
        ├── task_engine.py       #   Task DAG generator
        └── cost_estimator.py    #   Random Forest cost model
```

---

## 🌐 API Endpoints

### Authentication
| Method | Endpoint                | Description          |
| ------ | ----------------------- | -------------------- |
| POST   | `/api/v1/auth/login`    | Mock login           |
| POST   | `/api/v1/auth/register` | Mock register        |
| GET    | `/api/v1/auth/profile`  | Get user profile     |

### Projects
| Method | Endpoint                                  | Description                    |
| ------ | ----------------------------------------- | ------------------------------ |
| GET    | `/api/v1/projects`                        | List all projects              |
| POST   | `/api/v1/projects`                        | Create new project             |
| GET    | `/api/v1/projects/:id`                    | Get project details            |
| PUT    | `/api/v1/projects/:id`                    | Update project                 |
| DELETE | `/api/v1/projects/:id`                    | Delete project                 |
| POST   | `/api/v1/projects/:id/generate`           | Run full AI pipeline           |
| POST   | `/api/v1/projects/:id/generate-structural`| Generate structural grid only  |
| POST   | `/api/v1/projects/:id/generate-mep`       | Generate MEP routing only      |
| POST   | `/api/v1/projects/:id/generate-schedule`  | Generate schedule only         |
| GET    | `/api/v1/projects/:id/cost-estimate`      | Get cost breakdown             |

### AI
| Method | Endpoint                                      | Description                 |
| ------ | --------------------------------------------- | --------------------------- |
| POST   | `/api/v1/ai/parse-requirements`               | NLP text → structured data  |
| POST   | `/api/v1/ai/predict-cost/:id`                 | Predict cost with RF model  |
| GET    | `/api/v1/ai/worker-tasks/:id`                 | Get worker guidance steps   |
| PUT    | `/api/v1/ai/worker-tasks/:id/step/:stepId`    | Mark step done/undone       |

### Dashboard
| Method | Endpoint                                       | Description                |
| ------ | ---------------------------------------------- | -------------------------- |
| GET    | `/api/v1/dashboard/stats`                      | Project statistics         |
| GET    | `/api/v1/dashboard/activity`                   | Recent activity feed       |
| GET    | `/api/v1/dashboard/notifications`              | Notification list          |
| PUT    | `/api/v1/dashboard/notifications/:id/read`     | Mark notification read     |
| PUT    | `/api/v1/dashboard/notifications/read-all`     | Mark all read              |

### WebSocket
| Endpoint | Event Type           | Description                |
| -------- | -------------------- | -------------------------- |
| `/ws`    | `pipeline_progress`  | Real-time pipeline updates |
|          | `notification`       | Push notifications         |

---

## 🧠 AI / ML Pipeline

The full BIM pipeline runs in sequence:

```
User Input (plain English)
    │
    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  BERT NLP    │───▶│  Constraint  │───▶│  PPO Floor   │
│  Parser      │    │  Validator   │    │  Plan Agent  │
└──────────────┘    └──────────────┘    └──────────────┘
                                             │
    ┌────────────────────────────────────────┘
    │
    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Structural  │───▶│  MEP Routing │───▶│  Task DAG    │
│  Grid (IS456)│    │  (Dijkstra)  │    │  (NetworkX)  │
└──────────────┘    └──────────────┘    └──────────────┘
                                             │
    ┌────────────────────────────────────────┘
    │
    ▼
┌──────────────┐    ┌──────────────┐
│  CPM/PERT    │───▶│  RF Cost     │
│  Scheduler   │    │  Estimator   │
└──────────────┘    └──────────────┘
```

| Stage                | Model/Algorithm           | Library                          |
| -------------------- | ------------------------- | -------------------------------- |
| NLP Parsing          | BERT fine-tuned           | PyTorch, Transformers            |
| Floor Plan           | PPO (Reinforcement Learning) | Gymnasium, PyTorch            |
| Constraint Check     | Rule-based (IS 456/NBC)   | Custom Python                    |
| Structural Design    | ML column predictor       | scikit-learn, IS 456 tables      |
| MEP Routing          | Dijkstra / A*             | NetworkX, custom graph           |
| Task Dependencies    | DAG generation            | NetworkX                         |
| Scheduling           | CPM + PERT simulation     | NetworkX, NumPy                  |
| Cost Estimation      | Random Forest Regressor   | scikit-learn                     |

---

## 🖥️ Frontend Pages

| Page               | Route                | Features                                                  |
| ------------------ | -------------------- | --------------------------------------------------------- |
| Landing            | `/`                  | Hero section, features, CTA                               |
| Dashboard          | `/dashboard`         | Stats cards, project list, activity feed, quick actions    |
| New Project        | `/projects/new`      | 4-step wizard, NLP mode, room/feature config, AI generate |
| Project Detail     | `/projects/:id`      | Overview, tabs, pipeline progress, export BIM              |
| Floor Plan Viewer  | `/floor-plans`       | Canvas 2D render, zoom, grid, structural overlay           |
| Cost Estimator     | `/cost-estimator`    | Phase breakdown chart, radar, calculator                   |
| MEP Routing        | `/mep-routing`       | Plumbing + electrical SVG visualization                    |
| Task Graph         | `/task-graph`        | DAG with critical path highlighting                        |
| Scheduler          | `/scheduler`         | Gantt chart, phase filters, CPM stats                      |
| Worker Guidance    | `/worker-guidance`   | Step-by-step checklist, safety reminders                   |
| 3D Viewer          | `/3d-viewer`         | Three.js interactive BIM model                             |

---

## ⚙️ Environment Variables

Create a `.env` file in `backend/` (optional — defaults work out of the box):

```env
PORT=8000
PYTHON_BIM_URL=http://localhost:8001
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:5173
```

Create a `.env` in `frontend/` (optional):

```env
VITE_API_URL=/api/v1
```

---

## 🐛 Troubleshooting

| Problem                           | Fix                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| **Port 5173 already in use**      | Kill the existing process: `npx kill-port 5173` or change port in `vite.config.js`  |
| **Port 8000 already in use**      | `npx kill-port 8000` or set `PORT=8080` in `backend/.env`                           |
| **CORS errors in browser**        | Make sure backend is running on :8000 and frontend uses the Vite proxy               |
| **API returns 404**               | Check the URL starts with `/api/v1/` — all routes are prefixed                       |
| **Python AI engine not connected**| Backend works without Python (uses seed data). Start Python on :8001 for real AI     |
| **WebSocket not connecting**      | Make sure backend is running — WS is on the same port as HTTP (:8000)                |
| **npm install fails**             | Try `npm cache clean --force` then `npm install` again                               |
| **Python venv issues**            | Delete `venv/` folder and recreate: `python -m venv venv`                            |

---

## 📜 License

This project is for educational and demonstration purposes.

---

<p align="center">
  <b>Built with 🧠 AI + ❤️ by the Build My Home team</b>
</p>

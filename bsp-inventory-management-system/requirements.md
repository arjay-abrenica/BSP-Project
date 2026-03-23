# BSP Inventory Management System - Setup Requirements

## Prerequisites

Before setting up the project, ensure you have the following installed on your machine:
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **PostgreSQL** (for the backend database)

## Environment Setup

### 1. Backend Setup

Navigate to the `backend` directory:
```bash
cd backend
```

Install the backend dependencies:
```bash
npm install
```

**Environment Variables:**
Create a `.env` file in the `backend` root and configure your PostgreSQL connection and server port (e.g., `PORT=5000`).

Start the backend server:
```bash
node server.js
```
*Note: The API should now be running on `http://localhost:5000` (or your configured port).*

---

### 2. Frontend Setup (Angular)

Navigate to the `frontend` directory:
```bash
cd frontend
```

**Important Dependency Note:**
Because of a peer dependency conflict between the current version of Angular (v20) and `ng2-charts@10.0.0` (which expects Angular v21+), you **must** use the `--legacy-peer-deps` flag when installing frontend packages to bypass the strict version checking.

Install the frontend dependencies:
```bash
npm install --legacy-peer-deps
```

Start the Angular development server:
```bash
npm start
```
*Note: The frontend will be hosted on `http://localhost:4200`.*

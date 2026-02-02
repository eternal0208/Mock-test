# Vercel Deployment Guide for Mock Test Platform

Since `.env` files are hidden from GitHub for security, you must manually add these "Secrets" (API Keys) to Vercel.

You will deploy **Two Separate Projects** on Vercel:
1. **Backend** (The API/Server)
2. **Frontend** (The Website)

---

## Part 1: Deploying the Backend
**Goal:** Get your API online so the frontend can talk to it.

1.  **Go to Vercel Dashboard** and click **"Add New..."** -> **"Project"**.
2.  **Import Git Repository:** Select `Mock-test`.
3.  **Configure Project:**
    *   **Project Name:** `mock-test-backend` (or similar).
    *   **Framework Preset:** Leave as `Other`.
    *   **Root Directory:** Click **Edit** and select `backend`. **(Important!)**
4.  **Environment Variables:**
    Expand the **"Environment Variables"** section. You need to copy these values from your local `backend/.env` file:

    | Key (Name) | Value (Copy from `backend/.env`) |
    | :--- | :--- |
    | `MONGODB_URI` | `mongodb+srv://...` (Make sure you use the Atlas URL, NOT `localhost`) |
    | `FIREBASE_PROJECT_ID` | `mock-test-website-7a18d` |
    | `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@...` |
    | `FIREBASE_PRIVATE_KEY` | Copy the entire value inside the quotes, including `-----BEGIN...`. |

    > **Note on Private Key:** If you encounter errors, you might need to replace `\n` with actual newlines or handle it in code. Vercel automatically handles newlines in the dashboard mostly fine.

5.  Click **Deploy**.
6.  **Wait for completion.** Once configured, you will get a domain like:
    `https://mock-test-backend.vercel.app`
    **COPY THIS URL.** You will need it for Part 2.

---

## Part 2: Deploying the Frontend
**Goal:** connect the website to your new live backend.

1.  **Go to Dashboard** -> **Add New...** -> **Project**.
2.  **Import Git Repository:** Select `Mock-test` (Yes, the same repo again).
3.  **Configure Project:**
    *   **Project Name:** `mock-test-frontend`.
    *   **Framework Preset:** `Next.js` (It should auto-detect).
    *   **Root Directory:** Click **Edit** and select `frontend`. **(Important!)**
4.  **Environment Variables:**
    Expand **"Environment Variables"**. Copy these from `frontend/.env.local`, and add the API URL.

    | Key (Name) | Value |
    | :--- | :--- |
    | `NEXT_PUBLIC_API_URL` | **PASTE THE BACKEND URL HERE** (e.g., `https://mock-test-backend.vercel.app`) |
    | `NEXT_PUBLIC_FIREBASE_API_KEY` | Copy from `frontend/.env.local` |
    | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Copy from `frontend/.env.local` |
    | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Copy from `frontend/.env.local` |
    | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Copy from `frontend/.env.local` |
    | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Copy from `frontend/.env.local` |
    | `NEXT_PUBLIC_FIREBASE_APP_ID` | Copy from `frontend/.env.local` |

5.  Click **Deploy**.

---

## Troubleshooting "Load Failed"
If your frontend says "Load Failed" when trying to login or fetch tests:
1.  Go to **Backend Project** in Vercel.
2.  Go to **Settings** -> **Environment Variables**.
3.  Add a new variable:
    *   **Key:** `FRONTEND_URL`
    *   **Value:** `https://mock-test-frontend.vercel.app` (Your actual frontend domain)
4.  **Redeploy** the Backend (Go to Deployments -> Redeploy) so it picks up the new CORS allowance.

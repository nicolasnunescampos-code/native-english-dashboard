# Native English Portal

A comprehensive, role-based web application and Progressive Web App (PWA) designed to manage English classes, students, teachers, academic performance, and school finances. Built with React, TypeScript, Tailwind CSS, Shadcn UI, and powered by Supabase—featuring an **Apple Liquid Glass UI/UX** design system.

---

## ✨ Apple Liquid Glass UI/UX Design System

Inspired by Apple's spatial glass language (iOS 26, macOS Tahoe, and visionOS):
- **Ambient Aurora Mesh Backdrop**: Fixed, multi-layered soft light orbs behind the viewport that dynamically refract through translucent surfaces as users scroll.
- **Frosted Glass Surfaces (`.liquid-glass-card`, `.liquid-glass-sidebar`, `.liquid-glass-modal`, `.liquid-glass-pill`)**: High-saturation frosted blur (`backdrop-filter: blur(28px) saturate(195%)`), 1px inner specular rim highlights, and layered depth shadows in both **Light** and **Dark** modes.
- **Translucent Sky-Blue Glass Accents**: Airy, semi-transparent sky-blue buttons (`.liquid-btn-primary`) and active navigation pills (`.liquid-nav-active`) with inner glass sheen.
- **Floating Spatial Dock & Bento Layouts**: Detached `rounded-[28px]` floating sidebar dock, `rounded-3xl` Bento dashboard cards, segmented glass tab bars, and recessed frosted input wells.

---

## 🚀 Key Modules & Architecture

The platform operates on a secure Role-Based Access Control (RBAC) model managed through Supabase Auth `app_metadata` (`admin`, `teacher`, `student`). Users are automatically routed to their dedicated workspaces upon logging in.

```
                           ┌──────────────────────────┐
                           │      Authentication      │
                           │     (Supabase Auth)      │
                           └─────────────┬────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
      ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
      │   Admin Workspace   │ │   Teacher Studio    │ │   Student Portal    │
      │  - Scheduling & CRM │ │  - Schedule & Meet  │ │   (PWA & Desktop)   │
      │  - Financials       │ │  - 5-Metric Grading │ │  - Speaking Lab     │
      │  - Users & Media    │ │  - 360° Student Hub │ │  - Native Buddy     │
      │  - Tracking Hub     │ │  - Speaking Tracker │ │  - History & Exams  │
      └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

---

### 1. Student Portal (PWA)
Optimized for mobile, tablet, and desktop with offline caching, push notifications, and native-like installation.

- **Interactive Speaking Lab**:
  - Structured pronunciation and grammar practice across curriculum books (**Beginner**, **Intermediate**, and **Advanced**).
  - Native Text-to-Speech (TTS) audio with **Normal** and **Slow (0.7x)** playback speeds.
  - Browser speech recognition and accuracy scoring with star ratings and progress tracking.
- **Academic Bento Dashboard**:
  - Weekly compact glass calendar and full schedule view.
  - **Dynamic Announcement Alerts**: Announcements card illuminates in emerald green for 3 days when fresh news is published.
  - Real-time unread message counter and billing status indicator.
- **Academic History & Progress Analytics**:
  - **CEFR Course Progress Stepper** (`A1/A2 → B1 → B2 → C1/C2`) and overall course completion percentage (`completed / 160` classes).
  - Skill average bars and grade evolution charts across **Speaking, Listening, Grammar, Reading**, and **Overall Class Grade**.
  - Dedicated tabs for **Progress**, **History**, **Feedbacks**, **Classes**, and **Exams**.
- **Native Buddy**: 24/7 conversational AI practice partner powered by Supabase Edge Functions.
- **Exam Room**: Online examination environment for unlocked unit tests and level assessments with instant auto-grading.
- **Materials Library**: Direct access to books, worksheets, audios, videos, and school rules.
- **Tuition & Payments**: Monthly billing status, due date reminders, and payment slips.

---

### 2. Teacher Studio
Dedicated tools for lesson delivery, assessment, and 360° student tracking.

- **Schedule & Class Launch**: Real-time calendar of upcoming lessons with class details and Google Meet links.
- **5-Metric Grading System**:
  - Input grades for **Speaking, Listening, Grammar, Reading**, and **Class Grade**.
  - **Decimal Precision**: Supports fractional grades (e.g., `8.5`, `9.5`) using dot or comma input.
  - **Auto-Saving Drafts**: Grade notes persist to `localStorage` to prevent accidental data loss.
  - **AI Feedback Polish**: Powered by the `improve-feedback` Edge Function to enhance phrasing, tone, and grammar of teacher remarks.
- **360° Student Profile (`/teacher/students`)**:
  - Searchable active student directory.
  - Clicking any student opens their complete academic profile:
    - **Course Progress (%) & CEFR Stage Stepper**: Tracks completion out of 160 total course classes across `A1/A2`, `B1`, `B2`, and `C1/C2`.
    - **Next Chapters & Recommended Class Type**: Displays the student's upcoming chapter for each skill (`Grammar`, `Reading`, `Listening`, etc.) and whether an `Exam` is due.
    - **Unlock Exam Action**: Unlock or manage online exams directly from the student's profile.
    - **Class History Tab**: Complete log of graded/past lessons, 5-metric scores, and teacher notes.
    - **Past Exams Tab**: Lists both online portal exam submissions (with an **Inspect Student Answers** modal comparing student responses vs. correct answers) and graded live exam classes.
    - **Speaking Lab Tab**: Summarizes chapters practiced, high-score ratio (`80%+`), and every recorded spoken sentence with target vs. spoken transcript, accuracy score, and native audio playback.
- **Teacher Speaking Tracker**: Platform-wide view of student Speaking Lab attempts with filters by student, book, chapter, and score.
- **Weekly Class Confirmations**: Built-in weekly class count verification workflow for accurate teacher payroll.

---

### 3. Administrator Workspace
The central school operations, financial, and academic management hub.

- **Platform Overview Dashboard**:
  - Real-time KPIs for Active Students, Stopped Students, Total New Clients, and New Referrals filterable by Month, Year, or All Time.
  - Interactive client acquisition source breakdown (Referrals, Instagram, Website, Ads) and retention/growth charts.
- **Academic Scheduling & Classes**:
  - Interactive multi-view calendar, all-classes directory, grade logs, recuperations, and exam builder.
- **Financial Control & Multi-Currency**:
  - Student tuition tracking (`Payments`) and operational `Expenses` ledger.
- **Consolidated Tracking Hub**:
  - Grouped under the **Tracking** sidebar menu:
    - **Speaking Activity**: Monitor student pronunciation attempts across all books.
    - **Progress**: Track student chapter progression by level and class type.
    - **Feedback Responses**: Review student satisfaction survey submissions.
    - **Teacher Payments**: Calculate teacher payroll and push directly to expenses.
    - **Confirmations**: Audit teacher weekly class confirmations.
- **Users, Leads & Media Management**:
  - Provision and manage **Students**, **Teachers**, and **Admins**.
  - **Leads (CRM)**: Track prospective students from initial contact to enrollment.
  - **Media Library**: Manage books/materials, AI-assisted worksheets, videos, and audio tracks.

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18, TypeScript, Vite |
| **Styling & Design System** | Tailwind CSS, Apple Liquid Glass CSS, Shadcn UI, Radix UI Primitives, Lucide Icons |
| **State & Data Fetching** | React Query (`@tanstack/react-query`), React Hook Form, Zod |
| **Charts & Visualization** | Recharts |
| **Calendar Engine** | React Big Calendar, Date-fns, Date-fns-tz |
| **PWA & Push Notifications** | `vite-plugin-pwa`, Workbox Service Workers, Web Push API |
| **Backend & Database** | Supabase (PostgreSQL, Realtime, Row Level Security, Auth, Storage) |
| **Serverless Compute** | Supabase Edge Functions (Deno / TypeScript) |

---

## 🌩 Supabase Edge Functions

Server-side functions handle privileged administrative tasks, notifications, and AI integrations:

| Function | Path | Description |
| :--- | :--- | :--- |
| **`create-user`** | `supabase/functions/create-user` | Provisions Teachers and Admins with appropriate role metadata. |
| **`create-student`** | `supabase/functions/create-student` | Onboards new students and sets up initial billing records. |
| **`update-user-password`** | `supabase/functions/update-user-password` | Allows administrators to reset or change any user's password. |
| **`delete-student`** | `supabase/functions/delete-student` | Safely cascades deletion across Auth and relational DB records. |
| **`chat-buddy`** | `supabase/functions/chat-buddy` | AI conversational endpoint powering the student's *Native Buddy*. |
| **`generate-quiz`** | `supabase/functions/generate-quiz` | AI generation of questions and choices for exams and worksheets. |
| **`improve-feedback`** | `supabase/functions/improve-feedback` | Refines teacher feedback for clarity, encouragement, and grammar. |

---

## 🗄 Database Schema Highlights

The database runs on PostgreSQL in Supabase. Key tables include:

- **`classes`**: Lesson records with dates, teacher/student associations, chapter topics, and numerical grades (`class_grade`, `speaking_grade`, `listening_grade`, `grammar_grade`, `reading_grade`).
- **`students` / `teachers` / `admins`**: Extended profile tables tied to Supabase `auth.users`.
- **`exam_submissions` / `exams` / `questions`**: Online exams, question banks, and student submissions (`score`, `answers_json`, `completed_at`).
- **`student_speaking_attempts`**: Speaking Lab pronunciation attempts, spoken transcripts, accuracy scores, and star ratings.
- **`teacher_weekly_confirmations`**: Weekly class count confirmations submitted by teachers.
- **`payments` / `expenses`**: Student tuition records and school operating/payroll expenses.
- **`leads`**: CRM funnel entries with conversion statuses and referral tracking.
- **`messages` / `announcements`**: Real-time direct messaging and school-wide broadcasts.

---

## 📦 Installation & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **bun**
- A **Supabase** project instance
- **Supabase CLI** (optional, for Edge Functions)

### 2. Clone & Install
```bash
git clone <repository-url>
cd class-react-antigravity
npm install
```

### 3. Environment Configuration
Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173/login/` in your browser.

---

## 🚀 Production Build & Deployment

### 1. Build the Web Application
```bash
npm run build
```
The compiled production bundle and PWA service worker assets are generated inside the `dist/` directory.

### 2. Hosting Options

- **Hostinger / Apache**:
  Upload the contents of `dist/` to your server's `public_html` directory. Ensure an `.htaccess` file exists to handle client-side routing:
  ```apache
  <IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
  </IfModule>
  ```

- **Vercel**:
  The project includes a production-ready `vercel.json` with route rewriting to `/index.html` and cache-control headers for service workers:
  ```bash
  vercel deploy --prod
  ```

- **Netlify**:
  Configure publish directory to `dist` and redirect rule `/* /index.html 200`.

---

## 📄 License & Credits

Built with ❤️ for **Native English**.  
All rights reserved.

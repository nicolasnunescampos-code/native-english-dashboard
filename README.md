# Native English Portal

A comprehensive web application for managing English classes, students, and educational content. This platform serves three distinct user roles: Administrators, Teachers, and Students, providing tailored dashboards and tools for each.

## 🚀 Key Features

### 📱 Progressive Web App (PWA)
- **Installable**: Functions as a native app on Android and iOS.
- **Mobile First**: Fully responsive design optimized for mobile devices.
- **Smart Prompt**: Intelligent installation prompts (mobile-only, persistent dismissal).

### 👑 Admin Dashboard
**Student Management**
- **CRUD Operations**: Create, Read, Update, and Delete student records.
- **Financial Details**: Manage payment amounts, **multi-currency support** (BRL, USD, EUR, CAD), and CPF data.
- **Progress Tracking**: Visual timeline of student progress grouped by Level (Beginner -> Advanced 2) and Chapters.

**Class Management**
- **Advanced Calendar**: Schedule classes with a visual weekly calendar.
- **Recurring Series**: Create and edit repeating weekly classes (up to 2 years).
- **Group by Day**: Clear daily breakdown of scheduled classes.

**Financials**
- **Revenue Overview**: Global total revenue calculated in BRL with real-time currency conversion rates.
- **Payment Tracking**: Mark payments as Paid/Pending.
- **Currency Support**: Handles BRL, USD (5.20), EUR (6.20), and CAD (3.80).

**Content Management**
- **Multimedia**: Upload and manage YouTube Videos and Audio/Podcasts.
- **Materials**: Organize content by Category (Business, Kids, Club) and Level.
- **Announcements**: Broadcast messages to student dashboards.

### 👨‍🏫 Teacher Dashboard
- **Schedule**: View upcoming assigned classes.
- **Grading**: Grade student performance (Grammar, Speaking, Reading, etc.) after each class.
- **Student List**: Access assigned students' details.

### 🎓 Student Dashboard
- **Profile**: View personal details, registered classes/week, and rules agreement status.
- **Class History**: View past classes and grades.
- **Next Class**: Countdown and details for the upcoming session.
- **Financial Status**: Track tuition payments and due dates.
- **Materials Library**: Access assigned Videos, Audios, and Text materials filtered by level.

## 🛠 Tech Stack

- **Frontend**: React (Vite), TypeScript
- **UI Framework**: Tailwind CSS, Shadcn UI
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **State Management**: React Query
- **PWA**: vite-plugin-pwa

## 📦 Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository_url>
    cd class-react-antigravity
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file with your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_project_url
    VITE_SUPABASE_ANON_KEY=your_anon_key
    ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

5.  **Build for Production**:
    ```bash
    npm run build
    ```

## 📱 Supported Platforms
- **Web**: Chrome, Safari, Firefox, Edge
- **Mobile**: Android (Chrome PWA), iOS (Safari PWA)

---
*Built for Native English.*

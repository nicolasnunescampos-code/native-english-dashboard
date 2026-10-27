import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

import Auth from "./pages/Auth";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentClasses from "./pages/student/StudentClasses";
import StudentHistory from "./pages/student/StudentHistory";
import StudentPayments from "./pages/student/StudentPayments";
import StudentMaterials from "./pages/student/StudentMaterials";
import StudentAnnouncements from "./pages/student/StudentAnnouncements";
import StudentVideos from "./pages/student/StudentVideos";
import StudentVideoCourse from "./pages/student/StudentVideoCourse";
import StudentAudios from "./pages/student/StudentAudios";
import StudentRules from "./pages/student/StudentRules";
import StudentProfile from "./pages/student/StudentProfile";
import StudentRecuperations from "./pages/student/StudentRecuperations";
import StudentExams from "./pages/student/StudentExams";
import ExamRoom from "./pages/student/ExamRoom";
import StudentBuddy from "./pages/student/StudentBuddy";
import StudentSpeakingLab from "./pages/student/StudentSpeakingLab";
import StudentGrammarRush from "./pages/student/StudentGrammarRush";
import TeacherSpeakingTracker from "./pages/teacher/TeacherSpeakingTracker";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherSchedule from "./pages/teacher/TeacherSchedule";
import TeacherGrade from "./pages/teacher/TeacherGrade";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherMaterials from "./pages/teacher/TeacherMaterials";
import TeacherRules from "./pages/teacher/TeacherRules";
import TeacherProfile from "./pages/teacher/TeacherProfile";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminTeachers from "./pages/admin/AdminTeachers";
import AdminAdmins from "./pages/admin/AdminAdmins";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminGrades from "./pages/admin/AdminGrades";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminClasses from "./pages/admin/AdminClasses";
import AdminRecuperations from "./pages/admin/AdminRecuperations";
import AdminVideos from "./pages/admin/AdminVideos";
import AdminVideoCourse from "./pages/admin/AdminVideoCourse";
import AdminRules from "./pages/admin/AdminRules";
import AdminAudios from "./pages/admin/AdminAudios";
import AdminProgress from "./pages/admin/AdminProgress";
import AdminMainDashboard from "./pages/admin/AdminMainDashboard";
import AdminTeacherPayments from "./pages/admin/AdminTeacherPayments";
import AdminMaterials from "./pages/admin/AdminMaterials";
import AdminExams from "./pages/admin/AdminExams";
import AdminWorksheets from "./pages/admin/AdminWorksheets";
import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminProfile from '@/pages/admin/AdminProfile';
import AdminConfirmations from '@/pages/admin/AdminConfirmations';
import AdminFeedback from "./pages/admin/AdminFeedback";
import AdminExpenses from "./pages/admin/AdminExpenses";
import GrammarRushQuestionBank from "./pages/admin/GrammarRushQuestionBank";
import AdminPracticeTracker from "./pages/admin/AdminPracticeTracker";
import NotFound from "./pages/NotFound";
import Messages from "./pages/Messages";

import TeacherCalendar from "./pages/teacher/TeacherCalendar";
import StudentCalendar from "./pages/student/StudentCalendar";

const queryClient = new QueryClient();

const dashboardPathForRole = (role: string | null | undefined) => {
  const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : null;

  if (normalizedRole === 'admin') {
    return '/admin';
  } else if (normalizedRole === 'teacher') {
    return '/teacher';
  } else if (normalizedRole === 'student') {
    return '/student';
  }

  return '/login';
};

const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Invalid/missing role: block access (never default to admin/teacher/student)
  if (!role) {
    return <Navigate to="/login" replace />;
  }

  // Role mismatch: redirect to the user's correct dashboard (never render the wrong dashboard)
  if (!allowedRoles.includes(role)) {
    return <Navigate to={dashboardPathForRole(role)} replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  }

  const dashboardPath = dashboardPathForRole(role);

  return (
    <Routes>
      <Route
        path="/login"
        element={user && role ? <Navigate to={dashboardPath} replace /> : <Auth />}
      />
      {/* Backwards compatible alias */}
      <Route path="/auth" element={<Navigate to="/login" replace />} />

      <Route
        path="/"
        element={user && role ? <Navigate to={dashboardPath} replace /> : <Navigate to="/login" replace />}
      />

      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/classes" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentClasses /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/calendar" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentCalendar /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/history" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentHistory /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/payments" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentPayments /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/materials" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentMaterials /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/announcements" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentAnnouncements /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/videos" element={<Navigate to="/student/video-course" replace />} />
      <Route path="/student/video-course" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout hideHeader={true} hideSidebar={true}><StudentVideoCourse /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/audios" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout hideHeader={true}><StudentAudios /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/messages" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout hideHeader={true}><Messages /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/rules" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentRules /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentProfile /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/recuperations" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentRecuperations /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/exams" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentExams /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/exams/:id" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout hideHeader={true}><ExamRoom /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/buddy" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentBuddy /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/speaking" element={<Navigate to="/student/grammar-rush" replace />} />
      <Route path="/student/grammar-rush" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentGrammarRush /></DashboardLayout></ProtectedRoute>} />

      {/* Teacher Routes */}
      <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/schedule" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherSchedule /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/grade" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherGrade /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherStudents /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/speaking" element={<Navigate to="/teacher/grammar-rush-tracking" replace />} />
      <Route path="/teacher/grammar-rush-tracking" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><AdminPracticeTracker /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/materials" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherMaterials /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/videos" element={<Navigate to="/teacher/video-course" replace />} />
      <Route path="/teacher/video-course" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout hideHeader={true} hideSidebar={true}><StudentVideoCourse /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/audios" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout hideHeader={true}><StudentAudios /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/messages" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout hideHeader={true}><Messages /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/rules" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherRules /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/profile" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherProfile /></DashboardLayout></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminMainDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/confirmations" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminConfirmations /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/payments" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminPayments /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/teacher-payments" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminTeacherPayments /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/classes" element={<Navigate to="/admin/calendar" replace />} />
      <Route path="/admin/recuperations" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminRecuperations /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminStudents /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/student-history" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><TeacherStudents /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminTeachers /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/admins" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminAdmins /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/leads" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminLeads /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/grades" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminGrades /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminAnnouncements /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/materials" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminMaterials /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/worksheets" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminWorksheets /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/exams" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminExams /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/grammar-rush-questions" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><GrammarRushQuestionBank /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/videos" element={<Navigate to="/admin/video-course" replace />} />
      <Route path="/admin/video-course" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminVideoCourse /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/messages" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout hideHeader={true}><Messages /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/rules" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminRules /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/calendar" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminCalendar /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/audios" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminAudios /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/speaking" element={<Navigate to="/admin/grammar-rush-tracking" replace />} />
      <Route path="/admin/grammar-rush-tracking" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminPracticeTracker /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/progress" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminProgress /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/feedback" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFeedback /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/expenses" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminExpenses /></DashboardLayout></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

import PWAInstallPrompt from "./components/pwa/PWAInstallPrompt";
import { ThemeProvider } from "./components/theme-provider";

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="native-english-theme" attribute="class">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename="/login/">
            <AuthProvider>
              <PWAInstallPrompt />
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

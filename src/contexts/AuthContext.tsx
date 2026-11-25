import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, UserRole } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  studentName: string | null;
  studentId: string | null;
  teacherName: string | null;
  rulesAgreed: boolean | null;
  updateRulesAgreed: (agreed: boolean) => void;
  avatarUrl: string | null;
  updateAvatarUrl: (url: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [rulesAgreed, setRulesAgreed] = useState<boolean | null>(null);

  const [studentId, setStudentId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const updateAvatarUrl = (url: string | null) => {
    setAvatarUrl(url);
  };

  const deriveRoleFromSession = (session: Session | null): UserRole | null => {
    const rawRole = session?.user?.app_metadata?.role;
    const roleValue = typeof rawRole === 'string' ? rawRole.trim().toLowerCase() : null;

    if (roleValue === 'admin') {
      return 'admin';
    } else if (roleValue === 'teacher') {
      return 'teacher';
    } else if (roleValue === 'student') {
      return 'student';
    }

    return null;
  };

  const fetchStudentNameByEmail = async (email: string): Promise<string | null> => {
    try {
      const { data: studentData, error } = await supabase
        .from('students')
        .select('id, student_name, rules_agreed')
        .ilike('email', email)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const name = studentData?.student_name?.trim() ?? null;
      setStudentName(name);
      setStudentId(studentData?.id ?? null);
      setRulesAgreed(studentData?.rules_agreed ?? false);

      // Record student's last login in the platform
      if (studentData?.id) {
        supabase
          .from('students')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', studentData.id)
          .then(({ error: updateErr }) => {
            if (updateErr) {
              // Silently ignore if column doesn't exist yet
              console.debug('last_login_at sync:', updateErr.message);
            }
          });
      }

      return name;
    } catch (error) {
      console.error('Error fetching student params:', error);
      setStudentName(null);
      setStudentId(null);
      setRulesAgreed(null);
      return null;
    }
  };

  useEffect(() => {
    const applySession = (nextSession: Session | null) => {
      setLoading(true);

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      const nextRole = deriveRoleFromSession(nextSession);
      setRole(nextRole);

      const metaAvatar = nextSession?.user?.user_metadata?.avatar_url;
      setAvatarUrl(typeof metaAvatar === 'string' && metaAvatar.trim() ? metaAvatar : null);

      // Names are NOT used for authorization; reset whenever the auth user changes
      setStudentName(null);
      setStudentId(null);
      setTeacherName(null);
      setRulesAgreed(null);

      if (!nextSession?.user) {
        setLoading(false);
        return;
      }

      // Admin role - no extra lookup needed
      if (nextRole === 'admin') {
        setLoading(false);
        return;
      }

      // Teacher role - get name from metadata
      if (nextRole === 'teacher') {
        const name = nextSession.user.app_metadata?.name ?? nextSession.user.user_metadata?.name;
        setTeacherName(typeof name === 'string' ? name : null);
        setLoading(false);
        return;
      }

      const email = nextSession.user.email;

      // Student role - fetch student name
      if (nextRole === 'student') {
        if (email) {
          setTimeout(() => {
            fetchStudentNameByEmail(email).finally(() => setLoading(false));
          }, 0);
        } else {
          setLoading(false);
        }
        return;
      }

      // No role in app_metadata - try to infer from students table
      if (email) {
        setTimeout(() => {
          fetchStudentNameByEmail(email)
            .then((name) => {
              if (name) {
                setRole('student');
              }
            })
            .finally(() => setLoading(false));
        }, 0);
      } else {
        setLoading(false);
      }
    };

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    // THEN check for existing session
    supabase.auth
      .getSession()
      .then(({ data: { session: existingSession } }) => {
        applySession(existingSession);
      })
      .catch(() => {
        applySession(null);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // Clear old session data
    localStorage.removeItem('supabase.auth.token');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const updateRulesAgreed = (agreed: boolean) => {
    setRulesAgreed(agreed);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setStudentName(null);
    setStudentId(null);
    setTeacherName(null);
    setRulesAgreed(null);
    setAvatarUrl(null);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      role,
      loading,
      signIn,
      signOut,
      studentName,
      studentId,
      teacherName,
      rulesAgreed,
      updateRulesAgreed,
      avatarUrl,
      updateAvatarUrl
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

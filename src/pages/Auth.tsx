import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';
import { ArrowRight, Lock, Mail } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect immediately based ONLY on app_metadata.role
  useEffect(() => {
    if (!authLoading && user) {
      const rawRole = user.app_metadata?.role;
      const role = typeof rawRole === 'string' ? rawRole.trim().toLowerCase() : undefined;

      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (role === 'teacher') {
        navigate('/teacher', { replace: true });
      } else if (role === 'student') {
        navigate('/student', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      loginSchema.parse({ email, password });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      // MANDATORY: redirect immediately after login resolves (do not rely on onAuthStateChange)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please try again.');
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success('Login successful!');

      const rawRole = data.session?.user?.app_metadata?.role;
      let role = typeof rawRole === 'string' ? rawRole.trim().toLowerCase() : undefined;

      // Students may not have app_metadata.role set; infer via the students table.
      if (!role) {
        try {
          const { data: studentData } = await supabase
            .from('students')
            .select('student_name')
            .eq('email', email)
            .maybeSingle();

          if (studentData?.student_name) {
            role = 'student';
          }
        } catch {
          // Ignore and fall back to /login
        }
      }

      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (role === 'teacher') {
        navigate('/teacher', { replace: true });
      } else if (role === 'student') {
        navigate('/student', { replace: true });
      } else {
        // invalid or missing role
        navigate('/login', { replace: true });
      }
    } catch (_err) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="liquid-glass-pill px-6 py-3 rounded-full animate-pulse text-sm font-medium text-muted-foreground">
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating Ambient Liquid Glass Orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-sky-400/20 dark:bg-sky-500/15 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 w-[28rem] h-[28rem] rounded-full bg-indigo-400/15 dark:bg-indigo-500/15 blur-3xl animate-float-slow" />

      <Card className="w-full max-w-md animate-fade-in p-2 sm:p-3 relative z-10">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-[22px] bg-gradient-to-br from-sky-400/25 via-sky-500/20 to-blue-500/25 backdrop-blur-xl border border-sky-300/65 dark:border-sky-400/35 flex items-center justify-center mb-4 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.9),0_10px_24px_-6px_rgba(14,165,233,0.25)]">
            <span className="text-sky-600 dark:text-sky-300 font-extrabold text-2xl tracking-tight">NE</span>
          </div>
          <div className="inline-flex items-center justify-center mx-auto mb-1 px-3.5 py-1 rounded-full liquid-glass-pill text-[11px] font-semibold text-sky-600 dark:text-sky-300">
            <span>Native English Portal</span>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-sm">
            Sign in to access your classes, materials, and schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-11 h-12"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                Password
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-11 h-12"
                />
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full mt-2 font-bold"
              disabled={loading}
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

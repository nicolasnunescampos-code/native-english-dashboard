'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // If already authenticated, redirect immediately based ONLY on app_metadata.role
  useEffect(() => {
    if (!authLoading && user) {
      const rawRole = user.app_metadata?.role;
      const role = typeof rawRole === 'string' ? rawRole.trim().toLowerCase() : undefined;

      if (role === 'admin') {
        router.replace('/admin');
      } else if (role === 'teacher') {
        router.replace('/teacher');
      } else if (role === 'student') {
        router.replace('/student');
      } else {
        router.replace('/login');
      }
    }
  }, [user, authLoading, router]);

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
        router.replace('/admin');
      } else if (role === 'teacher') {
        router.replace('/teacher');
      } else if (role === 'student') {
        router.replace('/student');
      } else {
        // invalid or missing role
        router.replace('/login');
      }
    } catch (_err) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-2xl">NE</span>
          </div>
          <CardTitle className="text-2xl">Welcome to Native English</CardTitle>
          <CardDescription>Sign in to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, Rule } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const StudentRules: React.FC = () => {
  const { user, rulesAgreed, updateRulesAgreed } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['dashboard_rules', 'student'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_rules')
        .select('*')
        .eq('role', 'student')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as Rule[];
    },
  });

  const handleAgreeToRules = async () => {
    if (!user?.email) return;

    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('students')
        .update({ rules_agreed: true })
        .ilike('email', user.email);

      if (error) throw error;

      updateRulesAgreed(true);
      toast.success('Thank you for agreeing to the rules.');
    } catch (error) {
      console.error('Error updating rules agreement:', error);
      toast.error('Failed to update your agreement. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        📋 Class Rules
      </h2>

      {/* Rules Agreement Box */}
      {rulesAgreed === false && rules.length > 0 && !isLoading && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="agree"
                className="mt-1"
                onCheckedChange={handleAgreeToRules}
                disabled={isUpdating}
              />
              <div className="space-y-1 leading-none">
                <label
                  htmlFor="agree"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I have read and agree to all the rules listed below.
                </label>
                <p className="text-sm text-muted-foreground">
                  You must agree to continue using the platform without warnings.
                </p>
              </div>
            </div>
            {isUpdating && <span className="text-sm text-muted-foreground animate-pulse">Updating...</span>}
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {rulesAgreed === true && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6 flex items-center space-x-3">
            <Checkbox id="agreed" checked disabled className="data-[state=checked]:bg-green-600 border-green-600" />
            <label
              htmlFor="agreed"
              className="text-sm font-medium leading-none opacity-80"
            >
              You have already agreed to the class rules. Thank you!
            </label>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>General Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-muted-foreground text-center py-4">Loading rules...</div>
          ) : rules.length === 0 ? (
            <div className="text-muted-foreground text-center py-4">No rules found.</div>
          ) : (
            rules.map((rule, index) => (
              <div key={rule.id}>
                <h4 className="font-medium mb-2">{index + 1}. {rule.title}</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {rule.content}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentRules;
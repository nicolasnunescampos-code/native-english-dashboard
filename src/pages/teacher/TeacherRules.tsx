import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, Rule } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TeacherRules: React.FC = () => {
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['dashboard_rules', 'teacher'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_rules')
        .select('*')
        .eq('role', 'teacher')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as Rule[];
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        📋 Teacher Guidelines
      </h2>

      <Card>
        <CardHeader>
          <CardTitle>Internal Rules & Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-muted-foreground text-center py-4">Loading guidelines...</div>
          ) : rules.length === 0 ? (
            <div className="text-muted-foreground text-center py-4">No guidelines found.</div>
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

export default TeacherRules;

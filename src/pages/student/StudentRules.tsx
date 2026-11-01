import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, Rule } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Languages } from 'lucide-react';
import { getPortugueseRuleTitle, getPortugueseRuleContent } from '@/data/rulesTranslations';

const StudentRules: React.FC = () => {
  const { user, rulesAgreed, updateRulesAgreed } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  // Default to English as requested, with an option to toggle to Portuguese
  const [language, setLanguage] = useState<'en' | 'pt'>('en');

  const isPt = language === 'pt';

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
      toast.success(
        isPt
          ? 'Obrigado por concordar com as regras da escola.'
          : 'Thank you for agreeing to the rules.'
      );
    } catch (error) {
      console.error('Error updating rules agreement:', error);
      toast.error(
        isPt
          ? 'Falha ao atualizar seu consentimento. Por favor, tente novamente.'
          : 'Failed to update your agreement. Please try again.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header with Title and Language Toggle Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground">
            {isPt ? '📋 Regras da Escola' : '📋 Class Rules'}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {isPt
              ? 'Diretrizes oficiais, políticas de cancelamento e compromisso de aulas'
              : 'Official guidelines, cancellation policies, and class commitments'}
          </p>
        </div>

        {/* Language Toggle: English (Default) / Português */}
        <div className="inline-flex items-center gap-1 p-1 bg-muted/80 rounded-xl border border-border/60 self-start sm:self-auto shadow-xs">
          <div className="flex items-center gap-1 pl-2 pr-1 text-muted-foreground hidden xs:flex">
            <Languages className="w-3.5 h-3.5" />
          </div>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            aria-pressed={language === 'en'}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              language === 'en'
                ? 'bg-background text-foreground shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
            }`}
          >
            <span role="img" aria-label="English">🇺🇸</span>
            <span>English</span>
          </button>
          <button
            type="button"
            onClick={() => setLanguage('pt')}
            aria-pressed={language === 'pt'}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              language === 'pt'
                ? 'bg-background text-foreground shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
            }`}
          >
            <span role="img" aria-label="Português">🇧🇷</span>
            <span>Português</span>
          </button>
        </div>
      </div>

      {/* Rules Agreement Box */}
      {rulesAgreed === false && rules.length > 0 && !isLoading && (
        <Card className="border-red-200 bg-red-50/60 dark:bg-red-950/20 dark:border-red-900/40">
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
                  className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground cursor-pointer"
                >
                  {isPt
                    ? 'Li e concordo com todas as regras listadas abaixo.'
                    : 'I have read and agree to all the rules listed below.'}
                </label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {isPt
                    ? 'Você deve concordar para continuar usando a plataforma sem avisos.'
                    : 'You must agree to continue using the platform without warnings.'}
                </p>
              </div>
            </div>
            {isUpdating && (
              <span className="text-xs sm:text-sm text-muted-foreground animate-pulse font-medium">
                {isPt ? 'Atualizando...' : 'Updating...'}
              </span>
            )}
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {rulesAgreed === true && (
        <Card className="border-green-200 bg-green-50/60 dark:bg-green-950/20 dark:border-green-900/40">
          <CardContent className="pt-6 flex items-center space-x-3">
            <Checkbox
              id="agreed"
              checked
              disabled
              className="data-[state=checked]:bg-green-600 border-green-600"
            />
            <label
              htmlFor="agreed"
              className="text-sm font-medium leading-none text-foreground opacity-90"
            >
              {isPt
                ? 'Você já concordou com as regras das aulas. Obrigado!'
                : 'You have already agreed to the class rules. Thank you!'}
            </label>
          </CardContent>
        </Card>
      )}

      {/* Rules Content Card */}
      <Card className="shadow-xs border-border/70">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold">
            {isPt ? 'Diretrizes Gerais' : 'General Guidelines'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="text-muted-foreground text-center py-8">
              {isPt ? 'Carregando regras...' : 'Loading rules...'}
            </div>
          ) : rules.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">
              {isPt ? 'Nenhuma regra encontrada.' : 'No rules found.'}
            </div>
          ) : (
            rules.map((rule, index) => {
              const displayTitle = isPt ? getPortugueseRuleTitle(rule) : rule.title;
              const displayContent = isPt ? getPortugueseRuleContent(rule) : rule.content;

              return (
                <div
                  key={rule.id}
                  className="pt-4 first:pt-0 border-t first:border-t-0 border-border/40 space-y-1.5"
                >
                  <h4 className="font-bold text-foreground text-base flex items-baseline gap-1.5">
                    <span className="text-primary font-black text-sm">
                      {index + 1}.
                    </span>
                    <span>{displayTitle}</span>
                  </h4>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm pl-4 border-l-2 border-primary/20">
                    {displayContent}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentRules;

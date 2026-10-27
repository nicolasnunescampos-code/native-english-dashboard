import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { BellRing, CheckCircle2, Volume2, X, Smartphone, MessageSquare, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { playMessageSound, playClassSound } from '@/utils/notificationSounds';
import {
  checkNotificationSupport,
  requestNotificationPermission,
  syncPushSubscription,
} from '@/utils/pushSubscription';

interface NotificationIncentiveBannerProps {
  compact?: boolean;
}

export const NotificationIncentiveBanner: React.FC<NotificationIncentiveBannerProps> = ({ compact = false }) => {
  const { user, role } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default';
  });
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
    const dismissedUntil = localStorage.getItem(`${role}-notif-banner-dismissed-until`);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      setIsDismissed(true);
    }
  }, [role]);

  if (!checkNotificationSupport() || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(`${role}-notif-banner-dismissed-until`, String(Date.now() + 5 * 24 * 60 * 60 * 1000));
  };

  const handleEnable = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      playMessageSound();
      if (user?.id) {
        syncPushSubscription(user.id);
      }
      toast.success('🎉 Notificações ativadas!', {
        description: 'Você receberá avisos no seu aparelho sempre que novas aulas ou mensagens forem enviadas.',
      });
    } else if (res === 'denied') {
      toast.error('Notificações bloqueadas', {
        description: 'As notificações foram bloqueadas no seu navegador. Você pode reativá-las nas configurações do site.',
      });
    }
  };

  const handleTestSound = () => {
    if (role === 'student') {
      playClassSound();
      toast('🔔 Som de Nova Aula', {
        description: 'Este é o alerta que você ouvirá quando uma nova aula for agendada!',
      });
    } else {
      playMessageSound();
      toast('💬 Som de Nova Mensagem', {
        description: 'Este é o alerta que você ouvirá quando receber uma mensagem!',
      });
    }
  };

  // Once notifications are approved/granted, hide the banner completely
  if (permission === 'granted') {
    return null;
  }

  const isStudent = role === 'student';

  return (
    <div className="liquid-glass-card rounded-3xl p-5 md:p-6 relative overflow-hidden">
      {/* Decorative liquid ambient glow */}
      <div className="absolute -right-12 -top-12 w-44 h-44 bg-gradient-to-br from-sky-400/20 via-blue-500/15 to-purple-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl liquid-btn-primary text-white flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                Dica Importante
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                Experiência App Store
              </span>
            </div>
            <h3 className="font-bold text-sm md:text-base text-foreground leading-snug">
              {isStudent
                ? 'Ative as notificações para nunca mais perder uma aula ou mensagem!'
                : 'Fique por dentro de novas aulas na sua grade e mensagens de alunos!'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isStudent
                ? 'Receba alertas instantâneos com som no seu celular e desktop com o link do Google Meet e avisos do seu professor, mesmo com a tela bloqueada.'
                : 'Receba avisos instantâneos sempre que uma aula for adicionada à sua agenda ou quando um aluno enviar dúvidas.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => handleDismiss()}
          className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-3.5 border-t border-white/40 dark:border-white/10 text-xs text-muted-foreground relative z-10">
        <div className="flex items-center gap-2.5 liquid-glass-pill px-3 py-2 rounded-2xl">
          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate font-medium text-foreground/80">{isStudent ? 'Avisos de novas aulas' : 'Avisos de nova grade'}</span>
        </div>
        <div className="flex items-center gap-2.5 liquid-glass-pill px-3 py-2 rounded-2xl">
          <MessageSquare className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span className="truncate font-medium text-foreground/80">{isStudent ? 'Mensagens do professor' : 'Mensagens de alunos'}</span>
        </div>
        <div className="flex items-center gap-2.5 liquid-glass-pill px-3 py-2 rounded-2xl">
          <Smartphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="truncate font-medium text-foreground/80">Sons e tela bloqueada</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2.5 mt-4 flex-wrap relative z-10">
        <Button
          onClick={handleEnable}
          className="font-semibold text-xs h-9 px-4 gap-2"
        >
          <BellRing className="w-3.5 h-3.5" />
          Ativar Notificações no Celular
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleTestSound}
          className="text-xs h-9 gap-1.5"
        >
          <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
          Testar Som de Alerta
        </Button>
      </div>
    </div>
  );
};

export default NotificationIncentiveBanner;

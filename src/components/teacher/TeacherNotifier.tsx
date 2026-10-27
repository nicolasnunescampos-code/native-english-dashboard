import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MessageSquare, Calendar, BellRing, X, Sparkles, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { playMessageSound, playClassSound } from '@/utils/notificationSounds';
import {
  triggerDeviceNotification,
  requestNotificationPermission,
  checkNotificationSupport,
  syncPushSubscription,
} from '@/utils/pushSubscription';

export const TeacherNotifier: React.FC = () => {
  const { user, teacherName, role } = useAuth();
  const navigate = useNavigate();
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const audioUnlockedRef = useRef(false);

  // Check if notification permission prompt should be shown
  useEffect(() => {
    if (role !== 'teacher' || !checkNotificationSupport()) return;

    if (Notification.permission === 'default') {
      const dismissedUntil = localStorage.getItem('teacher-notif-prompt-dismissed-until');
      if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
        // Show after a gentle 2.5s delay
        const timer = setTimeout(() => setShowPermissionPrompt(true), 2500);
        return () => clearTimeout(timer);
      }
    } else if (Notification.permission === 'granted' && user?.id) {
      syncPushSubscription(user.id);
    }
  }, [role, user?.id]);

  // Unlock Web Audio context on user interaction
  useEffect(() => {
    const unlockAudio = () => {
      audioUnlockedRef.current = true;
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      setShowPermissionPrompt(false);
      playMessageSound();
      if (user?.id) {
        syncPushSubscription(user.id);
      }
      toast.success('🔔 Notificações ativadas com sucesso!', {
        description: 'Você receberá avisos no seu celular sempre que um aluno mandar mensagem ou uma aula for adicionada.',
      });
    } else {
      setShowPermissionPrompt(false);
    }
  };

  const handleDismissPrompt = () => {
    setShowPermissionPrompt(false);
    localStorage.setItem('teacher-notif-prompt-dismissed-until', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  // Helper to fetch sender name (Student or Admin)
  const getSenderName = useCallback(async (senderId: string): Promise<string> => {
    try {
      const { data: student } = await supabase
        .from('students')
        .select('student_name')
        .eq('id', senderId)
        .maybeSingle();
      if (student?.student_name) return student.student_name;

      return 'Aluno / Admin';
    } catch {
      return 'Aluno';
    }
  }, []);

  // Handle incoming message for teacher
  const handleNewMessage = useCallback(async (msg: any) => {
    if (!user?.id || msg.receiver_id !== user.id || msg.sender_id === user.id) return;

    playMessageSound();

    const senderName = await getSenderName(msg.sender_id);
    const messagePreview = msg.message || 'Nova mensagem recebida';

    // 1. Native Mobile / OS System Notification
    await triggerDeviceNotification({
      title: `💬 Mensagem de ${senderName}`,
      body: messagePreview.length > 90 ? `${messagePreview.slice(0, 87)}...` : messagePreview,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `msg-${msg.id}`,
      url: '/teacher/messages',
      vibrate: [150, 80, 150],
    });

    // 2. In-App Rich Toast
    toast.custom((t) => (
      <div className="bg-card text-card-foreground border border-blue-400/40 dark:border-blue-500/50 shadow-2xl rounded-xl p-3.5 flex flex-col gap-2 max-w-sm w-full animate-in slide-in-from-top-4 duration-300 ring-2 ring-blue-500/20">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Nova Mensagem do Aluno
              </p>
              <h4 className="font-semibold text-sm leading-tight text-foreground">
                {senderName}
              </h4>
            </div>
          </div>
          <button
            onClick={() => toast.dismiss(t)}
            className="text-muted-foreground hover:text-foreground p-1 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded-md">
          {messagePreview}
        </p>

        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            className="h-7 text-xs px-3 font-medium bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              navigate('/teacher/messages');
              toast.dismiss(t);
            }}
          >
            Responder Mensagem
          </Button>
        </div>
      </div>
    ), {
      duration: 10000,
      position: 'top-right',
    });
  }, [user?.id, getSenderName, navigate]);

  // Handle new class scheduled for teacher
  const handleNewClass = useCallback(async (classInfo: any) => {
    playClassSound();

    const title = classInfo.title || 'Aula Agendada';
    const dateStr = classInfo.date ? new Date(classInfo.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
    const timeStr = classInfo.start_time || classInfo.time || '';
    const dateTimeDesc = dateStr && timeStr ? `${dateStr} às ${timeStr}` : dateStr || timeStr || 'Em breve';
    const student = classInfo.student_name || 'Aluno';

    // 1. Native Mobile / OS System Notification
    await triggerDeviceNotification({
      title: '📅 Nova Aula na sua Grade!',
      body: `${student} - ${dateTimeDesc}\nToque para ver sua agenda.`,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `class-${classInfo.id || Date.now()}`,
      url: '/teacher/schedule',
      vibrate: [200, 100, 200],
    });

    // 2. In-App Rich Toast
    toast.custom((t) => (
      <div className="bg-card text-card-foreground border border-purple-400/40 dark:border-purple-500/50 shadow-2xl rounded-xl p-3.5 flex flex-col gap-2 max-w-sm w-full animate-in slide-in-from-top-4 duration-300 ring-2 ring-purple-500/20">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Nova Aula na sua Agenda
              </p>
              <h4 className="font-semibold text-sm leading-tight text-foreground">
                {title}
              </h4>
            </div>
          </div>
          <button
            onClick={() => toast.dismiss(t)}
            className="text-muted-foreground hover:text-foreground p-1 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-muted/50 p-2 rounded-md text-xs space-y-0.5">
          <p className="font-medium text-foreground">
            Aluno: <span className="font-bold">{student}</span>
          </p>
          <p className="text-muted-foreground">
            Horário: <span className="text-primary font-semibold">{dateTimeDesc}</span>
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            className="h-7 text-xs px-3 font-medium bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => {
              navigate('/teacher/schedule');
              toast.dismiss(t);
            }}
          >
            Ver Grade de Aulas
          </Button>
        </div>
      </div>
    ), {
      duration: 15000,
      position: 'top-right',
    });
  }, [navigate]);

  // Set up Supabase Realtime listeners for teacher
  useEffect(() => {
    if (role !== 'teacher' || !user?.id) return;

    // 1. Incoming messages for teacher
    const messageChannel = supabase
      .channel(`teacher_incoming_messages_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          handleNewMessage(payload.new);
        }
      )
      .subscribe();

    // 2. Incoming classes assigned to teacher
    let classesChannel: any = null;
    const channelName = `teacher_classes_${user.id}`;

    classesChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'classes',
        },
        async (payload) => {
          const newClass = payload.new as any;
          // Check if class belongs to this teacher by teacher_id or teacherName in title
          if (
            newClass?.teacher_id === user.id ||
            (teacherName && newClass?.title && newClass.title.toLowerCase().includes(teacherName.toLowerCase()))
          ) {
            handleNewClass(newClass);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      if (classesChannel) supabase.removeChannel(classesChannel);
    };
  }, [role, user?.id, teacherName, handleNewMessage, handleNewClass]);

  // Periodic ticker: Check upcoming classes today and trigger 30-minute reminder for teacher
  useEffect(() => {
    if (role !== 'teacher' || (!user?.id && !teacherName)) return;

    const checkTeacherUpcomingClasses = async () => {
      try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        // Fetch classes for today
        const { data: classesData } = await supabase
          .from('classes')
          .select('*, teachers(meet_link)')
          .eq('date', todayStr)
          .or(`teacher_id.eq.${user?.id},title.eq.${teacherName},title.ilike.%- ${teacherName}%`);

        if (!classesData || classesData.length === 0) return;

        const now = new Date();

        for (const cls of classesData) {
          const timeStr = cls.start_time || cls.time;
          if (!timeStr) continue;

          let cleanTime = timeStr.includes('T')
            ? timeStr.split('T')[1].substring(0, 5)
            : timeStr.trim().substring(0, 5);

          const [h, m] = cleanTime.split(':').map(Number);
          if (isNaN(h) || isNaN(m)) continue;

          const classDate = new Date();
          classDate.setHours(h, m, 0, 0);

          const diffMinutes = Math.round((classDate.getTime() - now.getTime()) / (1000 * 60));

          // Trigger reminder if class starts within 1 to 30 minutes
          if (diffMinutes > 0 && diffMinutes <= 30) {
            const reminderKey = `teacher_class_reminder_30m_${cls.id}_${todayStr}`;
            if (!localStorage.getItem(reminderKey)) {
              localStorage.setItem(reminderKey, 'true');

              playClassSound();

              const student = cls.student_name || 'Aluno';
              const meetLink = cls.link_url || cls.teachers?.meet_link || '';

              // 1. Native Mobile / OS System Notification
              await triggerDeviceNotification({
                title: '⏰ Sua aula começa em 30 minutos!',
                body: `Aluno: ${student} às ${cleanTime}.\nToque para abrir o link da aula.`,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: `teacher-class-reminder-30m-${cls.id}`,
                url: meetLink || '/teacher/schedule',
                vibrate: [250, 100, 250, 100, 250],
              });

              // 2. In-App Rich Toast
              toast.custom(
                (t) => (
                  <div className="bg-card text-card-foreground border-2 border-purple-500/50 shadow-2xl rounded-2xl p-4 flex flex-col gap-2.5 max-w-sm w-full animate-in slide-in-from-top-4 duration-300 ring-4 ring-purple-500/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                            ⏰ Começa em {diffMinutes} min
                          </span>
                          <h4 className="font-extrabold text-sm leading-tight text-foreground">
                            {cls.title || 'Aula Agendada'}
                          </h4>
                        </div>
                      </div>
                      <button
                        onClick={() => toast.dismiss(t)}
                        className="text-muted-foreground hover:text-foreground p-1 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="bg-muted/60 p-2.5 rounded-xl text-xs space-y-1">
                      <p className="font-semibold text-foreground">
                        Aluno: <strong className="text-foreground">{student}</strong>
                      </p>
                      <p className="text-muted-foreground font-medium">
                        Horário: <span className="font-bold text-primary">{cleanTime}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {meetLink && (
                        <Button
                          size="sm"
                          className="h-8 text-xs px-3 font-bold bg-purple-600 hover:bg-purple-700 text-white flex-1 gap-1.5 shadow-sm cursor-pointer"
                          onClick={() => {
                            window.open(meetLink, '_blank');
                            toast.dismiss(t);
                          }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir Google Meet</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs px-3 font-semibold cursor-pointer"
                        onClick={() => {
                          navigate('/teacher/schedule');
                          toast.dismiss(t);
                        }}
                      >
                        Ver Agenda
                      </Button>
                    </div>
                  </div>
                ),
                {
                  duration: 25000,
                  position: 'top-right',
                }
              );
            }
          }
        }
      } catch (err) {
        console.warn('Error checking teacher class reminders:', err);
      }
    };

    checkTeacherUpcomingClasses();
    const interval = setInterval(checkTeacherUpcomingClasses, 40000);
    return () => clearInterval(interval);
  }, [role, user?.id, teacherName, navigate]);

  // Permission prompt banner for teachers
  if (!showPermissionPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-card text-card-foreground border-2 border-purple-500/30 shadow-2xl rounded-2xl p-4 max-w-md w-full mx-auto flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300">
                  Avisos para Professores
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <h3 className="font-bold text-sm text-foreground mt-0.5">
                Ativar alertas no seu celular / desktop
              </h3>
            </div>
          </div>
          <button
            onClick={handleDismissPrompt}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Receba notificações com som assim como um app nativo sempre que um aluno mandar mensagem ou uma nova aula for adicionada à sua agenda!
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismissPrompt}
            className="text-xs h-8 text-muted-foreground hover:text-foreground flex-1"
          >
            Agora não
          </Button>
          <Button
            size="sm"
            onClick={handleEnableNotifications}
            className="text-xs h-8 font-semibold flex-1 gap-1.5 shadow-sm bg-purple-600 hover:bg-purple-700 text-white"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ativar Notificações
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeacherNotifier;

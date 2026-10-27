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

export const StudentNotifier: React.FC = () => {
  const { user, studentId, studentName, role } = useAuth();
  const navigate = useNavigate();
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const audioUnlockedRef = useRef(false);

  // Check if notification permission prompt should be shown
  useEffect(() => {
    if (role !== 'student' || !checkNotificationSupport()) return;

    if (Notification.permission === 'default') {
      const dismissedUntil = localStorage.getItem('student-notif-prompt-dismissed-until');
      if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
        // Show after a gentle 2.5s delay so page finishes loading
        const timer = setTimeout(() => setShowPermissionPrompt(true), 2500);
        return () => clearTimeout(timer);
      }
    } else if (Notification.permission === 'granted' && user?.id) {
      // Sync push subscription if already granted
      syncPushSubscription(user.id);
    }
  }, [role, user?.id]);

  // Unlock Web Audio context on first user interaction
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
      // Play a quick chime to confirm audio and notifications are active
      playMessageSound();
      if (user?.id) {
        syncPushSubscription(user.id);
      }
      toast.success('🔔 Notificações ativadas!', {
        description: 'Você receberá avisos no seu celular sempre que uma nova aula ou mensagem for enviada.',
      });
    } else {
      setShowPermissionPrompt(false);
    }
  };

  const handleDismissPrompt = () => {
    setShowPermissionPrompt(false);
    // Remember for 7 days
    localStorage.setItem('student-notif-prompt-dismissed-until', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  // Helper to fetch sender name
  const getSenderName = useCallback(async (senderId: string): Promise<string> => {
    try {
      // 1. Check teachers
      const { data: teacher } = await supabase
        .from('teachers')
        .select('name')
        .eq('id', senderId)
        .maybeSingle();
      if (teacher?.name) return teacher.name;

      // 2. Check auth metadata / users
      const { data: authData } = await supabase
        .from('students')
        .select('student_name')
        .eq('id', senderId)
        .maybeSingle();
      if (authData?.student_name) return authData.student_name;

      return 'Professor / Admin';
    } catch {
      return 'Professor';
    }
  }, []);

  // Handle new incoming message
  const handleNewMessage = useCallback(async (msg: any) => {
    // Only notify if message was sent to this student and NOT sent by this student
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
      url: '/student/messages',
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
                Nova Mensagem
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
              navigate('/student/messages');
              toast.dismiss(t);
            }}
          >
            Abrir Mensagem
          </Button>
        </div>
      </div>
    ), {
      duration: 10000,
      position: 'top-right',
    });
  }, [user?.id, getSenderName, navigate]);

  // Handle new scheduled class
  const handleNewClass = useCallback(async (classInfo: any) => {
    playClassSound();

    const title = classInfo.title || 'Aula de Inglês';
    const dateStr = classInfo.date ? new Date(classInfo.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
    const timeStr = classInfo.start_time || classInfo.time || '';
    const dateTimeDesc = dateStr && timeStr ? `${dateStr} às ${timeStr}` : dateStr || timeStr || 'Em breve';

    // 1. Native Mobile / OS System Notification
    await triggerDeviceNotification({
      title: '📅 Nova Aula Agendada!',
      body: `${title} - ${dateTimeDesc}\nToque para ver no seu calendário.`,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `class-${classInfo.id || Date.now()}`,
      url: '/student',
      vibrate: [200, 100, 200],
    });

    // 2. In-App Rich Toast
    toast.custom((t) => (
      <div className="bg-card text-card-foreground border border-emerald-400/40 dark:border-emerald-500/50 shadow-2xl rounded-xl p-3.5 flex flex-col gap-2 max-w-sm w-full animate-in slide-in-from-top-4 duration-300 ring-2 ring-emerald-500/20">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Nova Aula Adicionada
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
            Horário: <span className="text-primary font-bold">{dateTimeDesc}</span>
          </p>
          {classInfo.link_url && (
            <p className="text-[11px] text-muted-foreground truncate">
              Link de aula configurado ✨
            </p>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            className="h-7 text-xs px-3 font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => {
              navigate('/student');
              toast.dismiss(t);
            }}
          >
            Ver Calendário
          </Button>
        </div>
      </div>
    ), {
      duration: 15000,
      position: 'top-right',
    });
  }, [navigate]);

  // Set up Supabase Realtime listeners for this student
  useEffect(() => {
    if (role !== 'student' || !user?.id) return;

    // 1. Realtime listener for incoming messages
    const messageChannel = supabase
      .channel(`student_incoming_messages_${user.id}`)
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

    // 2. Realtime listener for new class assignments
    let assignmentChannel: any = null;
    const targetStudentId = studentId || user.id;

    if (targetStudentId) {
      assignmentChannel = supabase
        .channel(`student_class_assignments_${targetStudentId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'class_assignments',
            filter: `student_id=eq.${targetStudentId}`,
          },
          async (payload) => {
            const classId = (payload.new as any)?.class_id;
            if (classId) {
              const { data: cls } = await supabase
                .from('classes')
                .select('*')
                .eq('id', classId)
                .maybeSingle();
              if (cls) {
                handleNewClass(cls);
              }
            }
          }
        )
        .subscribe();
    }

    // 3. Realtime listener for legacy classes table matching student name
    let classesChannel: any = null;
    if (studentName) {
      classesChannel = supabase
        .channel(`student_classes_direct_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'classes',
          },
          (payload) => {
            const newClass = payload.new as any;
            if (newClass?.student_name && newClass.student_name.toLowerCase().includes(studentName.toLowerCase())) {
              handleNewClass(newClass);
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(messageChannel);
      if (assignmentChannel) supabase.removeChannel(assignmentChannel);
      if (classesChannel) supabase.removeChannel(classesChannel);
    };
  }, [role, user?.id, studentId, studentName, handleNewMessage, handleNewClass]);

  // Periodic ticker: Check upcoming classes today and trigger 30-minute reminder
  useEffect(() => {
    if (role !== 'student' || (!user?.id && !studentId && !studentName)) return;

    const checkUpcomingClasses = async () => {
      try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const targetStudentId = studentId || user?.id;

        // Fetch classes for today
        let todayClasses: any[] = [];

        if (targetStudentId) {
          const { data: relational } = await supabase
            .from('classes')
            .select(`
              *,
              class_assignments!inner(student_id),
              teachers(name, meet_link)
            `)
            .eq('class_assignments.student_id', targetStudentId)
            .eq('date', todayStr);
          if (relational) todayClasses.push(...relational);
        }

        if (studentName) {
          const { data: legacy } = await supabase
            .from('classes')
            .select('*, teachers(name, meet_link)')
            .ilike('student_name', `%${studentName}%`)
            .eq('date', todayStr);
          if (legacy) todayClasses.push(...legacy);
        }

        // Deduplicate classes
        const uniqueClasses = Array.from(
          new Map(todayClasses.map((c) => [c.id, c])).values()
        );

        const now = new Date();

        for (const cls of uniqueClasses) {
          const timeStr = cls.start_time || cls.time;
          if (!timeStr) continue;

          // Parse time (e.g. "14:30" or "2026-10-27T14:30:00")
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
            const reminderKey = `class_reminder_30m_${cls.id}_${todayStr}`;
            if (!localStorage.getItem(reminderKey)) {
              localStorage.setItem(reminderKey, 'true');

              // Play alert chime
              playClassSound();

              const meetLink = cls.link_url || cls.teachers?.meet_link || '';
              const teacher = cls.teachers?.name || cls.title || 'Seu professor';

              // 1. Native Mobile / OS System Notification
              await triggerDeviceNotification({
                title: '⏰ Sua aula começa em 30 minutos!',
                body: `Aula com ${teacher} às ${cleanTime}.\nToque para abrir a sala no Google Meet!`,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: `class-reminder-30m-${cls.id}`,
                url: meetLink || '/student',
                vibrate: [250, 100, 250, 100, 250],
              });

              // 2. In-App Rich Toast
              toast.custom(
                (t) => (
                  <div className="bg-card text-card-foreground border-2 border-primary/50 shadow-2xl rounded-2xl p-4 flex flex-col gap-2.5 max-w-sm w-full animate-in slide-in-from-top-4 duration-300 ring-4 ring-primary/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                            ⏰ Começa em {diffMinutes} min
                          </span>
                          <h4 className="font-extrabold text-sm leading-tight text-foreground">
                            {cls.title || 'Aula de Inglês'}
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
                        Professor: <span className="font-bold text-primary">{teacher}</span>
                      </p>
                      <p className="text-muted-foreground font-medium">
                        Horário: <strong className="text-foreground">{cleanTime}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {meetLink && (
                        <Button
                          size="sm"
                          className="h-8 text-xs px-3 font-bold bg-[#4FC3E8] hover:bg-[#3db3d8] text-white flex-1 gap-1.5 shadow-sm cursor-pointer"
                          onClick={() => {
                            window.open(meetLink, '_blank');
                            toast.dismiss(t);
                          }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Google Meet</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs px-3 font-semibold cursor-pointer"
                        onClick={() => {
                          navigate('/student');
                          toast.dismiss(t);
                        }}
                      >
                        Ver Detalhes
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
        console.warn('Error checking student class reminders:', err);
      }
    };

    // Check immediately, then check every 40 seconds
    checkUpcomingClasses();
    const interval = setInterval(checkUpcomingClasses, 40000);
    return () => clearInterval(interval);
  }, [role, user?.id, studentId, studentName, navigate]);

  // PWA Notification Permission Banner
  if (!showPermissionPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-card text-card-foreground border-2 border-primary/30 shadow-2xl rounded-2xl p-4 max-w-md w-full mx-auto flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                  Notificações do App
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <h3 className="font-bold text-sm text-foreground mt-0.5">
                Ativar alertas no seu celular
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
          Receba notificações com som assim como um aplicativo da App Store sempre que uma nova aula for adicionada ou seu professor enviar uma mensagem!
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
            className="text-xs h-8 font-semibold flex-1 gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ativar Notificações
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StudentNotifier;

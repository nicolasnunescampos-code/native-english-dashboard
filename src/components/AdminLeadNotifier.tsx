import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MessageSquare, ArrowRight, Volume2, BellRing, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LeadPayload {
  id: string;
  name: string;
  source?: string | null;
  status?: string | null;
  comments?: string | null;
  phone?: string | null;
  email?: string | null;
  english_level?: string | null;
  course_interest?: string | null;
  weekly_frequency?: string | null;
  created_at?: string;
}

// Synthesize a pleasant, crisp 4-note ascending chime using Web Audio API
export const playLeadNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // Musical arpeggio: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
    const notes = [
      { freq: 523.25, time: 0 },
      { freq: 659.25, time: 0.11 },
      { freq: 783.99, time: 0.22 },
      { freq: 1046.50, time: 0.33 }
    ];

    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle'; // Gentle bell-like chime
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.35, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + 0.5);
    });
  } catch (err) {
    console.warn('Could not play notification sound:', err);
  }
};

export const extractLeadInfo = (lead: LeadPayload) => {
  let phone = lead.phone || null;
  let email = lead.email || null;
  let level = lead.english_level || null;
  let course = lead.course_interest || null;
  let frequency = lead.weekly_frequency || null;

  if (lead.comments) {
    if (!phone) {
      const phoneMatch = lead.comments.match(/(?:WhatsApp|Telefone|Phone):\s*([^\n\r]+)/i);
      if (phoneMatch) phone = phoneMatch[1].trim();
    }
    if (!email) {
      const emailMatch = lead.comments.match(/(?:Email|E-mail):\s*([^\s\n\r]+@[^\s\n\r]+)/i);
      if (emailMatch) email = emailMatch[1].trim();
    }
    if (!level) {
      const levelMatch = lead.comments.match(/(?:Nível|Level):\s*([^\n\r]+)/i);
      if (levelMatch) level = levelMatch[1].trim();
    }
    if (!course) {
      const courseMatch = lead.comments.match(/(?:Curso|Course):\s*([^\n\r]+)/i);
      if (courseMatch) course = courseMatch[1].trim();
    }
    if (!frequency) {
      const freqMatch = lead.comments.match(/(?:Frequência|Frequency):\s*([^\n\r]+)/i);
      if (freqMatch) frequency = freqMatch[1].trim();
    }
  }

  return { phone, email, level, course, frequency };
};

export const buildWhatsAppLink = (rawPhone: string, leadName: string) => {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return null;
  const formattedNumber = (digits.length === 10 || digits.length === 11) ? `55${digits}` : digits;
  const text = encodeURIComponent(
    `Olá ${leadName}, tudo bem? Aqui é da Native English! Vi seu contato no nosso site para agendar uma conversa experimental.`
  );
  return `https://wa.me/${formattedNumber}?text=${text}`;
};

export const requestDesktopNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.warn('Error requesting notification permission', err);
    return Notification.permission;
  }
};

export const AdminLeadNotifier: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default';
  });

  // Prompt or auto-request permission if browser allows
  useEffect(() => {
    if (role !== 'admin') return;
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(setPermission).catch(() => {});
      } else {
        setPermission(Notification.permission);
      }
    }
  }, [role]);

  const notifyAdmin = useCallback((lead: LeadPayload) => {
    // 1. Play high-priority audio chime
    playLeadNotificationSound();

    const info = extractLeadInfo(lead);
    const leadName = lead.name || 'Novo Visitante';
    const waLink = info.phone ? buildWhatsAppLink(info.phone, leadName) : null;

    // 2. Trigger OS Desktop Push Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const bodyParts = [];
        if (info.phone) bodyParts.push(`WhatsApp: ${info.phone}`);
        if (info.course) bodyParts.push(`Curso: ${info.course}`);
        if (info.level) bodyParts.push(`Nível: ${info.level}`);
        const bodyText = bodyParts.length > 0 ? bodyParts.join(' • ') : 'Novo lead cadastrado no site!';

        const notif = new Notification(`🎉 Novo Lead: ${leadName}`, {
          body: `${bodyText}\nClique para ver no painel!`,
          icon: '/favicon.ico',
          tag: `lead-${lead.id || Date.now()}`,
          requireInteraction: true,
        });

        notif.onclick = () => {
          window.focus();
          navigate('/admin/leads');
          notif.close();
        };
      } catch (e) {
        console.warn('Failed to display native desktop notification', e);
      }
    }

    // 3. Show prominent in-portal interactive toast banner
    toast.custom((t) => (
      <div className="bg-card text-card-foreground border border-amber-300 dark:border-amber-500/40 shadow-2xl rounded-xl p-4 flex flex-col gap-3 max-w-md w-full animate-in slide-in-from-top-4 duration-300 ring-2 ring-amber-400/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  Novo Lead no Site
                </span>
              </div>
              <h4 className="font-bold text-base text-foreground mt-0.5 leading-tight">
                {leadName}
              </h4>
            </div>
          </div>
          <button
            onClick={() => toast.dismiss(t)}
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lead details summary */}
        <div className="bg-muted/50 rounded-lg p-2.5 text-xs space-y-1 border border-border/50">
          {info.phone && (
            <div className="flex items-center gap-2 text-foreground font-medium">
              <span className="text-muted-foreground">📱 WhatsApp:</span>
              <span>{info.phone}</span>
            </div>
          )}
          {info.email && (
            <div className="flex items-center gap-2 text-foreground">
              <span className="text-muted-foreground">✉️ Email:</span>
              <span className="truncate">{info.email}</span>
            </div>
          )}
          {info.course && (
            <div className="flex items-center gap-2 text-foreground">
              <span className="text-muted-foreground">📚 Curso:</span>
              <span>{info.course}</span>
            </div>
          )}
          {info.level && (
            <div className="flex items-center gap-2 text-foreground">
              <span className="text-muted-foreground">🎯 Nível:</span>
              <span>{info.level}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          {waLink && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 font-semibold text-xs h-9 gap-1.5 shadow-sm"
              onClick={() => {
                window.open(waLink, '_blank', 'noopener,noreferrer');
                toast.dismiss(t);
              }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chamar no WhatsApp
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="flex-1 font-semibold text-xs h-9 gap-1.5"
            onClick={() => {
              navigate('/admin/leads');
              toast.dismiss(t);
            }}
          >
            Ver no Pipeline
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    ), {
      duration: 20000, // Stays visible for 20 seconds
      position: 'top-right',
    });
  }, [navigate]);

  useEffect(() => {
    if (role !== 'admin') return;

    // Subscribe to public.leads table for any new incoming lead
    const channel = supabase
      .channel('admin_global_leads_notifier')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          console.log('[AdminLeadNotifier] Novo lead detectado:', payload.new);
          notifyAdmin(payload.new as LeadPayload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, notifyAdmin]);

  // Invisible listener component
  return null;
};

export default AdminLeadNotifier;

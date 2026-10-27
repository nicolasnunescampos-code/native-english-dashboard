import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  OPENAI_VOICES,
  OpenAiVoice,
  getOpenAiApiKey,
  setOpenAiApiKey,
  hasOpenAiKey,
  getPreferredVoice,
  setPreferredVoice,
  isHumanVoiceEnabled,
  setHumanVoiceEnabled,
  getCachedAudioCount,
  clearCachedAudio,
  playOpenAiSpeech,
  stopCurrentSpeech,
  saveOpenAiConfigToDb,
  syncOpenAiConfigFromDb,
} from '@/services/openAiTtsService';
import { toast } from 'sonner';
import {
  Sparkles,
  Volume2,
  Key,
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  RotateCcw,
  Bot,
  Zap,
  Mic,
  Loader2,
  Trash2,
  Globe2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NativeVoiceSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TEST_SENTENCE = "Hello! I am your Native English voice tutor. Let's practice your natural speaking pronunciation!";

export const NativeVoiceSettingsModal: React.FC<NativeVoiceSettingsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<OpenAiVoice>('nova');
  const [enabled, setEnabled] = useState(true);
  const [cachedCount, setCachedCount] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (open) {
      // First populate with whatever is in localStorage
      setApiKeyInput(getOpenAiApiKey());
      setSelectedVoice(getPreferredVoice());
      setEnabled(isHumanVoiceEnabled());
      getCachedAudioCount().then(setCachedCount);

      // Then sync fresh from Supabase database
      syncOpenAiConfigFromDb().then((synced) => {
        if (synced?.apiKey) setApiKeyInput(synced.apiKey);
        if (synced?.voice) setSelectedVoice(synced.voice);
        if (synced?.enabled !== undefined) setEnabled(synced.enabled);
      });
    } else {
      stopCurrentSpeech();
      setIsTesting(false);
    }
  }, [open]);

  const handleSaveAll = async () => {
    setIsSaving(true);
    const trimmed = apiKeyInput.trim();
    try {
      await saveOpenAiConfigToDb({
        apiKey: trimmed,
        voice: selectedVoice,
        enabled,
      });
      setIsSaved(true);
      toast.success('AI Voice Settings saved & synced for all students!');
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err: any) {
      toast.error(`Failed to save settings: ${err?.message || 'Check database connection'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoiceSelect = async (voiceId: OpenAiVoice) => {
    setSelectedVoice(voiceId);
    setPreferredVoice(voiceId);
    if (apiKeyInput.trim()) {
      await saveOpenAiConfigToDb({
        apiKey: apiKeyInput.trim(),
        voice: voiceId,
        enabled,
      });
    }
  };

  const handleToggleEnabled = async (checked: boolean) => {
    setEnabled(checked);
    setHumanVoiceEnabled(checked);
    if (apiKeyInput.trim()) {
      await saveOpenAiConfigToDb({
        apiKey: apiKeyInput.trim(),
        voice: selectedVoice,
        enabled: checked,
      });
    }
    toast.info(checked ? 'Studio Human Voice enabled for all students!' : 'Fallback browser robotic voice active.');
  };

  const handleTestVoice = () => {
    const keyToUse = apiKeyInput.trim() || getOpenAiApiKey();
    if (!keyToUse) {
      toast.error('Please enter and save your OpenAI API key first!');
      return;
    }

    if (isTesting) {
      stopCurrentSpeech();
      setIsTesting(false);
      return;
    }

    // Auto-save key if user typed it
    if (apiKeyInput.trim() && apiKeyInput.trim() !== getOpenAiApiKey()) {
      saveOpenAiConfigToDb({
        apiKey: apiKeyInput.trim(),
        voice: selectedVoice,
        enabled,
      });
    }

    setIsTesting(true);

    playOpenAiSpeech(TEST_SENTENCE, {
      voice: selectedVoice,
      speed: 1.0,
      onStart: () => setIsTesting(true),
      onEnd: () => {
        setIsTesting(false);
        getCachedAudioCount().then(setCachedCount);
      },
      onError: (err) => {
        setIsTesting(false);
        toast.error(`Voice test failed: ${err?.message || 'Check your API key and connection'}`);
      },
    });
  };

  const handleClearCache = async () => {
    await clearCachedAudio();
    setCachedCount(0);
    toast.success('Audio cache cleared! New audios will be freshly generated.');
  };

  const activeKeyExists = hasOpenAiKey() || apiKeyInput.trim().length > 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-5 sm:p-6 rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 pb-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4FC3E8] to-[#2B2F8F] text-white flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 fill-current" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-foreground">
                  Native Quest — AI Studio Voice
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-semibold">
                  Platform-wide OpenAI Text-to-Speech for student pronunciation
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className={cn(
                'text-[11px] font-black px-2.5 py-0.5 rounded-full',
                activeKeyExists && enabled
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-400/50'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {activeKeyExists && enabled ? '✨ Studio Voice Active' : 'Robotic Browser Voice'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Note regarding student experience */}
          <div className="p-3.5 rounded-2xl bg-[#E6EEFA] dark:bg-[#192448] border border-[#BAC9E2]/60 dark:border-[#202E5A] flex items-start gap-2.5">
            <Globe2 className="w-4 h-4 text-[#2B2F8F] dark:text-[#4FC3E8] shrink-0 mt-0.5" />
            <p className="text-xs text-[#2B2F8F] dark:text-slate-200 leading-relaxed">
              <span className="font-extrabold">Student Seamless Experience:</span> Students will never see this modal or any API key prompts. When they play audio in Native Quest or Speaking Lab, they will hear this natural human tutor voice automatically!
            </p>
          </div>

          {/* 1. API Key Input Box */}
          <div className="p-4 rounded-2xl bg-muted/40 dark:bg-[#141C38] border border-border/70 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black flex items-center gap-1.5 text-foreground">
                <Key className="w-3.5 h-3.5 text-primary" />
                <span>OpenAI API Key</span>
              </Label>

              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>Get / Copy Key from OpenAI</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? 'text' : 'password'}
                  placeholder="sk-proj-... or sk-..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="pr-10 h-10 rounded-xl font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Button
                type="button"
                onClick={handleSaveAll}
                disabled={!apiKeyInput.trim() || isSaving}
                className="h-10 px-4 rounded-xl native-btn-primary font-black text-xs gap-1.5 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Key</span>
                )}
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              💡 <span className="font-semibold text-foreground">Zero Waste:</span> Uses OpenAI <code className="text-sky-600 dark:text-sky-400 font-mono">tts-1</code> ($0.015 / 1k characters). With your OpenAI credits, you have over <span className="font-bold text-foreground">10,000 phrases</span>! All phrases are cached permanently on each device so each phrase is only fetched once.
            </p>
          </div>

          {/* 2. Voice Tutor Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Select Tutor Voice For All Students
              </Label>
              <span className="text-[11px] text-muted-foreground font-semibold">
                6 Native Accents Available
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {OPENAI_VOICES.map((v) => {
                const isSelected = selectedVoice === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => handleVoiceSelect(v.id)}
                    className={cn(
                      'p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left select-none',
                      isSelected
                        ? 'border-[#4FC3E8] bg-sky-500/10 dark:bg-sky-950/30 shadow-xs'
                        : 'border-border/60 hover:border-border dark:hover:border-slate-700 bg-card hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xl">{v.avatar}</span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#4FC3E8]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-foreground">{v.name}</span>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          ({v.gender[0]})
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug mt-0.5">
                        {v.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Test Voice Button */}
          <div className="p-3.5 rounded-2xl bg-[#E6EEFA]/60 dark:bg-[#141C38] border border-[#BAC9E2]/60 dark:border-[#202E5A] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <p className="text-xs font-black text-foreground flex items-center justify-center sm:justify-start gap-1.5">
                <Mic className="w-3.5 h-3.5 text-primary" />
                <span>Test Selected Voice</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Hear {OPENAI_VOICES.find((v) => v.id === selectedVoice)?.name} pronounce an authentic English phrase.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleTestVoice}
              disabled={!activeKeyExists}
              variant="outline"
              size="sm"
              className={cn(
                'rounded-xl font-black text-xs gap-2 h-9 px-4 shrink-0 transition-all cursor-pointer',
                isTesting
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 animate-pulse'
                  : 'native-btn-accent text-white shadow-xs'
              )}
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Speaking...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Test Pronunciation</span>
                </>
              )}
            </Button>
          </div>

          {/* 4. Cache & Storage Statistics */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pt-1">
            <span className="flex items-center gap-1.5">
              <span>Saved locally on device:</span>
              <strong className="text-foreground">{cachedCount}</strong> phrase{cachedCount === 1 ? '' : 's'}
            </span>

            {cachedCount > 0 && (
              <button
                type="button"
                onClick={handleClearCache}
                className="text-[11px] text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Audio Cache</span>
              </button>
            )}
          </div>
        </div>

        <DialogFooter className="pt-3 sm:justify-between flex-row items-center">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enable-human-voice"
              checked={enabled}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
            <Label htmlFor="enable-human-voice" className="text-xs font-semibold cursor-pointer">
              Enable Studio Voice Platform-wide
            </Label>
          </div>

          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="native-btn-primary rounded-xl font-black text-xs px-5 h-9 cursor-pointer"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

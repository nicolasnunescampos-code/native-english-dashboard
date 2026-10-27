// Native-like notification sound synthesizer using Web Audio API

const getAudioContext = (): AudioContext | null => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  } catch (err) {
    console.warn('AudioContext not available:', err);
    return null;
  }
};

/**
 * Message notification tone:
 * A crisp, friendly 2-note chime (similar to iOS / messaging apps)
 */
export const playMessageSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Notes: D5 (587.33 Hz) -> A5 (880.00 Hz)
  const notes = [
    { freq: 587.33, time: 0, duration: 0.18 },
    { freq: 880.00, time: 0.12, duration: 0.35 }
  ];

  notes.forEach(({ freq, time, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + time);

    gain.gain.setValueAtTime(0, now + time);
    gain.gain.linearRampToValueAtTime(0.3, now + time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + duration + 0.05);
  });
};

/**
 * Class scheduled tone:
 * An upbeat 3-tone chord arpeggio (F5 -> A5 -> C6)
 */
export const playClassSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [
    { freq: 698.46, time: 0, duration: 0.2 },      // F5
    { freq: 880.00, time: 0.11, duration: 0.22 },  // A5
    { freq: 1046.50, time: 0.22, duration: 0.45 }  // C6
  ];

  notes.forEach(({ freq, time, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + time);

    gain.gain.setValueAtTime(0, now + time);
    gain.gain.linearRampToValueAtTime(0.35, now + time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + duration + 0.05);
  });
};

/**
 * Lead notification tone:
 * Ascending 4-tone arpeggio
 */
export const playLeadSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [
    { freq: 523.25, time: 0 },
    { freq: 659.25, time: 0.11 },
    { freq: 783.99, time: 0.22 },
    { freq: 1046.50, time: 0.33 }
  ];

  notes.forEach(({ freq, time }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + time);

    gain.gain.setValueAtTime(0, now + time);
    gain.gain.linearRampToValueAtTime(0.35, now + time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + time + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + 0.5);
  });
};

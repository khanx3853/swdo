/**
 * Web Audio API synthesizer utility for immediate, zero-latency feedback sound effects.
 * Requires no external audio files and complies with modern browser security policies.
 */

export function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    // Resume context if suspended by browser autoplay policy
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Gentle, warm, subtle C-Major arpeggio chime (C5, E5, G5, C6)
    const notes = [
      { freq: 523.25, time: 0, duration: 0.15 },    // C5
      { freq: 659.25, time: 0.07, duration: 0.2 },  // E5
      { freq: 783.99, time: 0.14, duration: 0.25 }, // G5
      { freq: 1046.50, time: 0.22, duration: 0.45 }, // C6
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.12, ctx.currentTime); // Soft, non-intrusive volume
    masterGain.connect(ctx.destination);

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine'; // Pure, gentle sine wave tone
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      const startTime = ctx.currentTime + time;
      const stopTime = startTime + duration;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(stopTime);
    });

    // Automatically close AudioContext after chime finishes
    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    }, 1000);
  } catch (err) {
    console.warn('Audio chime playback omitted:', err);
  }
}

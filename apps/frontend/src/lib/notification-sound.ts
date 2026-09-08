/** Real-time bildirishnoma kelganda eshitiladigan qisqa signal (tashqi audio fayl talab qilinmaydi). */
export function playNotificationSound() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.15;

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.18);
    oscillator.onended = () => void ctx.close();
  } catch {
    // Audio mavjud bo'lmasa jim o'tkazib yuboriladi.
  }
}

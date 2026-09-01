let context: AudioContext | null = null;
let master: GainNode | null = null;
let timer: number | null = null;

const notes = [261.63, 329.63, 392, 493.88, 392, 329.63];

function playNote(frequency: number, delay: number) {
  if (!context || !master) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, context.currentTime + delay);
  gain.gain.linearRampToValueAtTime(0.08, context.currentTime + delay + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + delay + 2.8);
  oscillator.connect(gain).connect(master);
  oscillator.start(context.currentTime + delay);
  oscillator.stop(context.currentTime + delay + 3);
}

function playPhrase() {
  notes.forEach((note, index) => playNote(note, index * 0.72));
}

export async function startAmbientSound() {
  if (context) return;
  context = new AudioContext();
  master = context.createGain();
  master.gain.value = 0.14;
  master.connect(context.destination);
  await context.resume();
  playPhrase();
  timer = window.setInterval(playPhrase, 7200);
}

export function stopAmbientSound() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  const closingContext = context;
  if (master && closingContext) {
    master.gain.exponentialRampToValueAtTime(0.001, closingContext.currentTime + 0.4);
    window.setTimeout(() => void closingContext.close(), 500);
  }
  context = null;
  master = null;
}

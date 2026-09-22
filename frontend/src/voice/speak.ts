// speechSynthesis wrapper. Best-effort: if the requested language's voice is
// missing we report it so the UI can show a notice instead of failing silently.

// Chrome/Android populates voices asynchronously — getVoices() returns [] on
// first call. Warm the cache at module load and refresh on voiceschanged so
// hasVoiceFor("hi") doesn't false-negative on Hindi devices.
let cachedVoices: SpeechSynthesisVoice[] = [];
function refreshVoices(): void {
  if (typeof speechSynthesis === "undefined") return;
  const list = speechSynthesis.getVoices();
  if (list.length > 0) cachedVoices = list;
}
if (typeof speechSynthesis !== "undefined") {
  refreshVoices();
  speechSynthesis.onvoiceschanged = refreshVoices;
}

function allVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === "undefined") return [];
  const live = speechSynthesis.getVoices();
  return live.length > 0 ? live : cachedVoices;
}

export function voiceFor(lang: "hi" | "en"): SpeechSynthesisVoice | undefined {
  if (typeof speechSynthesis === "undefined") return undefined;
  const target = lang === "hi" ? "hi-IN" : "en-IN";
  const voices = allVoices();
  return (
    voices.find((v) => v.lang === target) ??
    voices.find((v) => v.lang.toLowerCase().replace("_", "-") === target.toLowerCase())
  );
}

export function hasVoiceFor(lang: "hi" | "en"): boolean {
  return voiceFor(lang) !== undefined;
}

export function speak(text: string, lang: "hi" | "en"): boolean {
  if (typeof speechSynthesis === "undefined") return false;
  const voice = voiceFor(lang);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

// Web Speech API recognition — only advertised when the browser supports it.
type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: {
    results: { length: number; [index: number]: { length: number; [index: number]: { transcript: string } } };
  }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  start: () => void;
  stop: () => void;
};

export function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionCtor | null;
}
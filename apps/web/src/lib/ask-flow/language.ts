export type AskLanguage = "en" | "ur" | "ar" | "mixed_ur_en";

export type AskScript = "latin" | "arabic" | "devanagari" | "mixed";

export interface AskLanguageDetection {
  readonly language: AskLanguage;
  readonly script: AskScript;
  readonly signals: readonly string[];
}

const ARABIC_LETTER = /[\u0621-\u063A\u0641-\u064A\u0671-\u06D3]/;
const URDU_LETTER = /[\u0679\u0688\u0691\u0686\u067E\u0698\u06A9\u06AF\u06BA\u06BE\u06CC\u06D2]/;
const URDU_FULL_STOP = "\u06D4";
const DEVANAGARI_LETTER = /[\u0900-\u097F]/;
const LATIN_LETTER = /[A-Za-z\u00C0-\u024F]/;

// Roman Urdu function words. Every entry is safe against common English
// tokens ("the", "me", "lie", "mile" are deliberately excluded).
const ROMAN_URDU_MARKERS = new Set([
  "kya", "kyu", "kyun", "kaun", "kaunsa", "kaunse", "kaunsi", "kaise",
  "kahan", "kab", "kitna", "kitne", "kitni", "hai", "hain", "hoon", "hun",
  "hogi", "hoga", "honge", "tha", "thi", "thay", "chahiye", "nahi", "nahin",
  "haan", "achha", "acha", "theek", "karna", "karni", "karo", "karke", "kar",
  "batao", "bata", "dikhao", "dikha", "mujhe", "mera", "meri", "mere",
  "hamara", "hamari", "humara", "humari", "hum", "aap", "aapka", "aapki",
  "aapke", "tum", "tumhara", "tumhari", "yeh", "woh", "magar", "lekin",
  "phir", "abhi", "kal", "aaj", "paisa", "paise", "rupay", "kaam", "wala",
  "wali", "jaldi", "zyada", "thora", "thoda", "saare", "saari", "sab",
  "koi", "lagta", "matlab", "samajh", "kaafi", "bilkul", "warna", "jab",
  "tab", "tak", "liye", "ka", "ki", "ke", "ko", "se", "mein", "hota",
  "hote", "hoti", "hua", "hui", "milta", "milega", "dekh", "suno", "yaad",
  "shukriya", "salam", "salaam", "assalam", "adaab", "nikal", "rakho",
  "dena", "dijiye", "wahan", "yahan", "iski", "uski", "iska", "uska",
]);

// English function words only. Content nouns ("invoice", "client") are loan
// words in Urdu speech and must not trigger mixed classification.
const ENGLISH_FUNCTION_WORDS = new Set([
  "what", "when", "where", "why", "which", "who", "whom", "how",
  "show", "list", "tell", "give", "need", "want", "please", "about",
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "am",
  "do", "does", "did", "can", "could", "will", "would", "should",
  "me", "my", "our", "your", "you", "i", "we", "it", "they", "them",
  "for", "with", "from", "in", "on", "of", "to", "at", "by", "and",
  "or", "but", "not", "this", "that", "these", "those", "there",
  "today", "tomorrow", "yesterday", "any", "all", "some", "get",
]);

function tokenizeWords(message: string): readonly string[] {
  return message
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function hasUrduLetters(message: string): boolean {
  return URDU_LETTER.test(message);
}

function hasArabicLetters(message: string): boolean {
  return ARABIC_LETTER.test(message);
}

function hasDevanagari(message: string): boolean {
  return DEVANAGARI_LETTER.test(message);
}

function latinWordCount(message: string): number {
  return message.match(/[A-Za-z\u00C0-\u024F]+/g)?.length ?? 0;
}

/**
 * Detects the response language for Ask Flow composition. Presentation
 * only: the result never gates authorization, tool selection, or data
 * access. Hindi/Devanagari is never returned so it can never be generated.
 */
export function detectAskLanguage(
  message: string,
  localeHint?: string,
): AskLanguageDetection {
  const signals: string[] = [];
  const urduScript = hasUrduLetters(message);
  const arabicScript = hasArabicLetters(message);
  const devanagari = hasDevanagari(message);
  if (message.includes(URDU_FULL_STOP)) signals.push("urdu-punctuation");
  if (urduScript) signals.push("urdu-script");

  // Devanagari is understood but never mirrored: English is the response
  // language unless the message also carries Urdu/Arabic script.
  if (devanagari) {
    signals.push("devanagari");
    if (urduScript) {
      return { language: "ur", script: "mixed", signals };
    }
    if (arabicScript) {
      return { language: "ar", script: "mixed", signals };
    }
    return { language: "en", script: "devanagari", signals };
  }

  if (urduScript) {
    // Urdu script stays Urdu; embedded Latin words are preserved business
    // terms, not a language switch.
    const latin = latinWordCount(message);
    if (latin >= 2) signals.push(`latin-words:${latin}`);
    return { language: "ur", script: "arabic", signals };
  }

  if (arabicScript) {
    return { language: "ar", script: "arabic", signals };
  }

  const words = tokenizeWords(message);
  const urduMarkers = new Set(
    words.filter((word) => ROMAN_URDU_MARKERS.has(word)),
  );
  const englishFunctions = new Set(
    words.filter((word) => ENGLISH_FUNCTION_WORDS.has(word)),
  );

  if (urduMarkers.size > 0) {
    signals.push(`roman-urdu:${urduMarkers.size}`);
    if (urduMarkers.size >= 2) {
      if (englishFunctions.size >= 2) {
        signals.push(`english-functions:${englishFunctions.size}`);
        return { language: "mixed_ur_en", script: "latin", signals };
      }
      return { language: "ur", script: "latin", signals };
    }
    if (englishFunctions.size === 0) {
      const hint = (localeHint ?? "").toLowerCase();
      if (hint.startsWith("ur") || urduMarkers.has("salam") || urduMarkers.has("salaam")) {
        return { language: "ur", script: "latin", signals };
      }
    }
  }

  return { language: "en", script: "latin", signals };
}

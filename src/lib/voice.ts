/**
 * Telugu Voice Auto Callout Utility for KB Khata
 * Uses browser Web Speech API with fallback transliteration & voice selection
 */

export interface CalloutPayload {
  customerName: string;
  villageName?: string;
  amount?: number;
  paymentType?: "DEBIT" | "CREDIT" | "PARTIAL" | string;
}

export function buildTeluguCalloutSentence({
  customerName,
  villageName,
  amount,
  paymentType,
}: CalloutPayload): string {
  let paymentText = "";
  if (paymentType === "DEBIT") {
    paymentText = "నగదు చెల్లింపు (Nagathu / Debit)";
  } else if (paymentType === "CREDIT") {
    paymentText = "ఉద్ధార బకాయి (Udhaar / Credit)";
  } else if (paymentType === "PARTIAL") {
    paymentText = "పాక్షిక చెల్లింపు మరియు ఉద్ధార (Partial)";
  }

  let sentence = `గౌరవనీయులు ${customerName} గారు.`;
  if (villageName) {
    sentence += ` గ్రామం: ${villageName}.`;
  }
  if (typeof amount === "number") {
    sentence += ` బిల్లు మొత్తం: ${amount} రూపాయలు.`;
  }
  if (paymentText) {
    sentence += ` విధానం: ${paymentText}.`;
  }

  return sentence;
}

export function speakTeluguText(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  try {
    // Cancel any previous speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;

    // Look for Telugu voices
    const voices = window.speechSynthesis.getVoices();
    const teluguVoice =
      voices.find((v) => v.lang.toLowerCase().includes("te")) ||
      voices.find((v) => v.lang.toLowerCase().includes("hi") || v.lang.toLowerCase().includes("in")) ||
      null;

    if (teluguVoice) {
      utterance.voice = teluguVoice;
      utterance.lang = teluguVoice.lang;
    } else {
      utterance.lang = "te-IN";
    }

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
  }
}

export function speakCustomerCallout(payload: CalloutPayload, onEnd?: () => void) {
  const sentence = buildTeluguCalloutSentence(payload);
  speakTeluguText(sentence, onEnd);
}


import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface SentenceSegment {
  text: string;
  paragraphIndex: number;
  sentenceIndex: number;
  globalIndex: number;
}

export function splitParagraphsToSentences(paragraphs: string[]): SentenceSegment[] {
  const segments: SentenceSegment[] = [];
  let globalIndex = 0;

  paragraphs.forEach((paragraph, paragraphIndex) => {
    // Split cleanly on sentence boundaries while keeping quotes & punctuation intact
    const rawSentences = paragraph.match(/[^.!?]+[.!?]+(?:["”’]+)?|[^.!?]+$/g) ?? [paragraph];
    rawSentences.forEach((raw, sentenceIndex) => {
      const cleaned = raw.trim();
      if (cleaned.length > 0) {
        segments.push({
          text: cleaned,
          paragraphIndex,
          sentenceIndex,
          globalIndex,
        });
        globalIndex += 1;
      }
    });
  });

  return segments;
}

export function speakSingleWord(word: string, rate = 0.92, voiceURI?: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    if (voiceURI) {
      const found = window.speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI);
      if (found) utterance.voice = found;
    }
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech synthesis failures gracefully
  }
}

interface UseSpeechReaderOptions {
  paragraphs: string[];
  storyId: string;
  onListenComplete?: () => void;
}

export function useSpeechReader({ paragraphs, storyId, onListenComplete }: UseSpeechReaderOptions) {
  const sentences = useMemo(() => splitParagraphsToSentences(paragraphs), [paragraphs]);

  const [isSupported] = useState<boolean>(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rate, setRate] = useState<number>(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [finishedAudio, setFinishedAudio] = useState(false);

  const isPlayingRef = useRef(false);
  const rateRef = useRef(rate);
  const voiceURIRef = useRef(selectedVoiceURI);
  const onCompleteRef = useRef(onListenComplete);

  rateRef.current = rate;
  voiceURIRef.current = selectedVoiceURI;
  onCompleteRef.current = onListenComplete;

  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      const englishVoices = all.filter((v) => v.lang.toLowerCase().startsWith('en'));
      const list = englishVoices.length > 0 ? englishVoices : all;
      setVoices(list);
      if (list.length > 0 && !voiceURIRef.current) {
        const preferred =
          list.find((v) => /natural|google|samantha|daniel|karen|serena|aria|guy/i.test(v.name)) ||
          list[0];
        setSelectedVoiceURI(preferred.voiceURI);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported]);

  // Reset narration when switching stories
  useEffect(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentIndex(0);
    setFinishedAudio(false);
  }, [storyId, isSupported]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      isPlayingRef.current = false;
    };
  }, []);

  const speakAt = useCallback(
    (index: number) => {
      if (!isSupported || index < 0 || index >= sentences.length) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        return;
      }

      window.speechSynthesis.cancel();
      setCurrentIndex(index);
      setFinishedAudio(false);

      const segment = sentences[index];
      const utterance = new SpeechSynthesisUtterance(segment.text);
      utterance.lang = 'en-US';
      utterance.rate = rateRef.current;

      if (voiceURIRef.current) {
        const match = window.speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURIRef.current);
        if (match) utterance.voice = match;
      }

      utterance.onend = () => {
        if (!isPlayingRef.current) return;
        const next = index + 1;
        if (next < sentences.length) {
          speakAt(next);
        } else {
          isPlayingRef.current = false;
          setIsPlaying(false);
          setFinishedAudio(true);
          onCompleteRef.current?.();
        }
      };

      utterance.onerror = () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, sentences]
  );

  const play = useCallback(
    (startIndex?: number) => {
      if (!isSupported) return;
      const target = typeof startIndex === 'number' ? startIndex : currentIndex >= sentences.length ? 0 : currentIndex;
      isPlayingRef.current = true;
      setIsPlaying(true);
      speakAt(target);
    },
    [currentIndex, isSupported, sentences.length, speakAt]
  );

  const pause = useCallback(() => {
    if (!isSupported) return;
    isPlayingRef.current = false;
    setIsPlaying(false);
    window.speechSynthesis.cancel();
  }, [isSupported]);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      pause();
    } else {
      play();
    }
  }, [pause, play]);

  const nextSentence = useCallback(() => {
    const next = Math.min(currentIndex + 1, sentences.length - 1);
    if (isPlayingRef.current) {
      speakAt(next);
    } else {
      setCurrentIndex(next);
    }
  }, [currentIndex, sentences.length, speakAt]);

  const prevSentence = useCallback(() => {
    const prev = Math.max(currentIndex - 1, 0);
    if (isPlayingRef.current) {
      speakAt(prev);
    } else {
      setCurrentIndex(prev);
    }
  }, [currentIndex, speakAt]);

  const changeRate = useCallback(
    (newRate: number) => {
      setRate(newRate);
      rateRef.current = newRate;
      if (isPlayingRef.current) {
        speakAt(currentIndex);
      }
    },
    [currentIndex, speakAt]
  );

  const changeVoice = useCallback(
    (voiceURI: string) => {
      setSelectedVoiceURI(voiceURI);
      voiceURIRef.current = voiceURI;
      if (isPlayingRef.current) {
        speakAt(currentIndex);
      }
    },
    [currentIndex, speakAt]
  );

  return {
    isSupported,
    sentences,
    isPlaying,
    currentIndex,
    totalSentences: sentences.length,
    rate,
    voices,
    selectedVoiceURI,
    finishedAudio,
    play,
    pause,
    togglePlay,
    nextSentence,
    prevSentence,
    changeRate,
    changeVoice,
  };
}

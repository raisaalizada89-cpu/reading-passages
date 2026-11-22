import { MatchingPair, QuizQuestion, StoryWork, WordDefinition } from '../types/literature';

/**
 * Generates a tailored B1+ vocabulary quiz for the given story, prioritizing
 * words the learner actually clicked and encountered while reading, combined
 * with the story's curated multiple-choice, fill-in-the-blank, and matching tasks.
 */
export function buildTailoredQuiz(
  story: StoryWork,
  encounteredWords: WordDefinition[] = []
): QuizQuestion[] {
  const baseQuiz = [...story.quiz];
  const glossaryList = Object.values(story.glossary);

  // Deduplicate encountered words relevant to B1+ learning (filter out ultra-short function words)
  const meaningfulEncountered = encounteredWords.filter(
    (w) =>
      w.word.length >= 4 &&
      !['that', 'this', 'with', 'from', 'they', 'them', 'were', 'have', 'into', 'when', 'then', 'only'].includes(
        w.lemma.toLowerCase()
      )
  );

  // Deduplicate by lemma
  const uniqueEncounteredMap = new Map<string, WordDefinition>();
  for (const w of meaningfulEncountered) {
    const key = w.lemma.toLowerCase();
    if (!uniqueEncounteredMap.has(key)) {
      uniqueEncounteredMap.set(key, w);
    }
  }
  const uniqueEncountered = Array.from(uniqueEncounteredMap.values());

  // If the user looked up words not already tested in baseQuiz, generate an extra personalized question!
  const testedWords = new Set(baseQuiz.map((q) => q.targetWord.toLowerCase()));
  const extraWord = uniqueEncountered.find((w) => !testedWords.has(w.word.toLowerCase()) && !testedWords.has(w.lemma.toLowerCase()));

  const result: QuizQuestion[] = [];

  if (extraWord) {
    // Build a personalized context-choice question from the encountered word
    const distractors = glossaryList
      .filter((g) => g.lemma.toLowerCase() !== extraWord.lemma.toLowerCase())
      .slice(0, 3)
      .map((g) => g.definition);

    while (distractors.length < 3) {
      distractors.push('To move rapidly across an open landscape without direction.');
      if (distractors.length < 3) {
        distractors.push('An ordinary household tool used for simple repairs.');
      }
      if (distractors.length < 3) {
        distractors.push('A sudden refusal to speak during a formal ceremony.');
      }
    }

    const options = [extraWord.definition, ...distractors.slice(0, 3)];
    // Deterministic shuffle based on word length so order isn't always index 0
    const shift = extraWord.word.length % 4;
    const rotatedOptions = [...options.slice(shift), ...options.slice(0, shift)];
    const correctIndex = rotatedOptions.indexOf(extraWord.definition);

    result.push({
      id: `dynamic-${story.id}-${extraWord.lemma}`,
      type: 'context-choice',
      targetWord: extraWord.word,
      prompt: `From the words you explored in "${story.title}": what is the meaning of "${extraWord.word}"?`,
      passageExcerpt: extraWord.contextualMeaning || extraWord.example,
      options: rotatedOptions,
      correctIndex,
      explanation: `"${extraWord.word}" (${extraWord.partOfSpeech}) means: ${extraWord.definition}`,
    });
  }

  // If the user encountered >= 4 words, build a personalized Matching Challenge using their words!
  if (uniqueEncountered.length >= 4) {
    const chosen = uniqueEncountered.slice(0, 4);
    const dynamicPairs: MatchingPair[] = chosen.map((w, idx) => ({
      id: `dyn-p-${idx}`,
      word: w.word,
      definition: w.definition,
    }));

    result.push({
      id: `dynamic-match-${story.id}`,
      type: 'matching',
      targetWord: 'encountered-matching',
      prompt: `Match the ${chosen.length} words you inspected in "${story.title}" with their English explanations.`,
      pairs: dynamicPairs,
      explanation: 'Reviewing the exact words you clicked while reading locks them into long-term active vocabulary.',
    });
  }

  // Merge base curated questions (ensuring we include multiple-choice, fill-in-the-blank, and matching)
  for (const q of baseQuiz) {
    if (result.length < 6) {
      // Avoid duplicating two matching tasks unless needed
      if (q.type === 'matching' && result.some((r) => r.type === 'matching')) {
        continue;
      }
      result.push(q);
    }
  }

  // Ensure at least one matching exercise exists
  if (!result.some((r) => r.type === 'matching')) {
    const baseMatch = baseQuiz.find((q) => q.type === 'matching');
    if (baseMatch) result.push(baseMatch);
  }

  return result;
}

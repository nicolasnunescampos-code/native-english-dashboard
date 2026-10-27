import { SPEAKING_BOOKS } from '@/data/speakingCurriculum';
import { GrammarBookLevel, GrammarGameQuestion, GrammarQuestionType } from '@/lib/supabase';

export interface GrammarChapterMeta {
  chapter: string; // '1' .. '10'
  chapterNumber: number;
  title: string;
  grammarFocus: string;
}

export interface GrammarBookMeta {
  book: GrammarBookLevel;
  title: string;
  cefr: string;
  description: string;
  chapters: GrammarChapterMeta[];
}

export const GRAMMAR_BOOK_LEVELS: GrammarBookLevel[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
];

export const GRAMMAR_QUESTION_TYPES: {
  value: GrammarQuestionType;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    value: 'true_false_fix',
    label: 'True / False + Fix Error',
    shortLabel: 'True/False Fix',
    description: 'Decide if the sentence is correct (✓) or has an error (✗). If wrong, tap the bad word and pick the fix.',
  },
  {
    value: 'fill_gap',
    label: 'Fill in the Gap',
    shortLabel: 'Fill Gap',
    description: 'Complete the sentence blank (___) by choosing from 3–4 option pills.',
  },
  {
    value: 'word_order',
    label: 'Word Order Builder',
    shortLabel: 'Word Order',
    description: 'Tap shuffled word tiles in order to build a grammatically correct sentence.',
  },
  {
    value: 'speaking',
    label: 'Speak & Pronounce',
    shortLabel: 'Speaking',
    description: 'Listen to the native pronunciation and speak the sentence aloud into your microphone.',
  },
];

// Map from existing SPEAKING_BOOKS so chapter identifiers ('1'..'10') and titles match the rest of the portal
export const GRAMMAR_RUSH_BOOKS: GrammarBookMeta[] = GRAMMAR_BOOK_LEVELS.map((bookLevel) => {
  const match = SPEAKING_BOOKS.find((b) =>
    bookLevel === 'Advanced' ? b.level === 'Advanced' : b.level === bookLevel
  );

  const chapters: GrammarChapterMeta[] = (match?.chapters || []).map((ch) => ({
    chapter: String(ch.chapterNumber),
    chapterNumber: ch.chapterNumber,
    title: ch.title,
    grammarFocus: ch.grammarFocus,
  }));

  return {
    book: bookLevel,
    title: match?.title || `${bookLevel} Grammar`,
    cefr: match?.cefr || (bookLevel === 'Beginner' ? 'A1/A2' : bookLevel === 'Intermediate' ? 'B1/B2' : 'B2/C1'),
    description: match?.description || `${bookLevel} grammar chapters`,
    chapters,
  };
});

export function getGrammarBookMeta(book: GrammarBookLevel): GrammarBookMeta {
  return GRAMMAR_RUSH_BOOKS.find((b) => b.book === book) || GRAMMAR_RUSH_BOOKS[0];
}

export function getGrammarChapterMeta(
  book: GrammarBookLevel,
  chapter: string
): GrammarChapterMeta | undefined {
  const bookMeta = getGrammarBookMeta(book);
  return bookMeta.chapters.find((c) => c.chapter === String(chapter));
}

export function formatChapterLabel(book: GrammarBookLevel, chapter: string): string {
  const meta = getGrammarChapterMeta(book, chapter);
  return meta ? `Ch. ${meta.chapter}: ${meta.title}` : `Chapter ${chapter}`;
}

export function tokenizeSentenceWords(sentence: string): string[] {
  return sentence
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// 18 carefully verified starter questions for Beginner - Chapter 1 (Verb To Be)
// Used by the SQL seed script and available for 1-click seeding in Question Bank Admin
export const BEGINNER_CH1_SEED_QUESTIONS: Omit<
  GrammarGameQuestion,
  'id' | 'created_by' | 'created_at' | 'updated_at'
>[] = [
  // ==========================================
  // TYPE A: true_false_fix (6 questions: 2 correct, 4 with 1 error)
  // ==========================================
  {
    book: 'Beginner',
    chapter: '1',
    type: 'true_false_fix',
    sentence: 'She are my favorite English teacher.',
    correct_sentence: 'She is my favorite English teacher.',
    error_word_index: 1, // "are"
    options: ['is', 'am', 'be', 'were'],
    correct_option: 'is',
    explanation: 'Use "is" with the singular pronoun "she", not "are".',
    status: 'approved',
  },
  {
    book: 'Beginner',
    chapter: '1',
    type: 'true_false_fix',
    sentence: 'We are ready for the English class today.',
    correct_sentence: 'We are ready for the English class today.',
    error_word_index: null,
    options: [],
    correct_option: '',
    explanation: 'This sentence is correct! "We" takes the plural verb "are".',
    status: 'approved',
  },
  {
    book: 'Beginner',
    chapter: '1',
    type: 'true_false_fix',
    sentence: 'I is very happy to meet you.',
    correct_sentence: 'I am very happy to meet you.',
    error_word_index: 1, // "is"
    options: ['am', 'are', 'be', 'being'],
    correct_option: 'am',
    explanation: 'Always use "am" with the pronoun "I" in the present simple.',
    status: 'approved',
  },
  {
    book: 'Beginner',
    chapter: '1',
    type: 'true_false_fix',
    sentence: 'They is from a small town in Canada.',
    correct_sentence: 'They are from a small town in Canada.',
    error_word_index: 1, // "is"
    options: ['are', 'am', 'is', 'be'],
    correct_option: 'are',
    explanation: 'Use "are" with the plural subject "they".',
    status: 'approved',
  },
  {
    book: 'Beginner',
    chapter: '1',
    type: 'true_false_fix',
    sentence: 'Are you at the office right now?',
    correct_sentence: 'Are you at the office right now?',
    error_word_index: null,
    options: [],
    correct_option: '',
    explanation: 'This question is correct! Invert "Are" and "you" for yes/no questions.',
    status: 'approved',
  },
  {
    book: 'Beginner',
    chapter: '1',
    type: 'true_false_fix',
    sentence: 'My brother am twenty years old.',
    correct_sentence: 'My brother is twenty years old.',
    error_word_index: 2, // "am"
    options: ['is', 'are', 'be', 'have'],
    correct_option: 'is',
    explanation: '"My brother" (he) is third-person singular, so use "is".',
    status: 'approved',
  },

  // ==========================================
  // TYPE B: fill_gap (6 questions)
  // ==========================================
  {
    book: 'Beginner',
    chapter: '1',
    type: 'fill_gap',
    sentence: 'Hello! I ___ a new student at this school.',
    correct_sentence: 'Hello! I am a new student at this school.',
    error_word_index: null,
    options: ['am', 'is', 'are', 'be'],
    correct_option: 'am',
    explanation: 'Use "am" after the subject pronoun "I".',
    status: 'approved',
  },
  {
    book: 'Beginner',
    chapter: '1',
    type: 'fill_gap',
    sentence: '___ your parents at home this evening?',
    correct_sentence: 'Are your parents at home this evening?',
    error_word_index: null,
    options: ['Are', 'Is', 'Am', 'Be'],
    correct_option: 'Are',
    explanation: '"Your parents" is plural (they), so the question starts with "Are".',
    status: 'approved',
  },
  {
    book: 'Beginner',
    chapter: '1',
    type: 'fill_gap',
    sentence: 'The weather ___ very warm and sunny today.',
    correct_sentence: 'The weather is very warm and sunny today.',
    error_word_index: null,
    options: ['is', 'are', 'am', 'be'],
    correct_option: 'is',
    explanation: '"The weather" (it) is singular/uncountable, so it takes "is".',
    status: 'approved',
  },
  {
    book: 'Beginner',
    chapter: '1',
    type: 'fill_gap',
    sentence: 'No, we ___ tired yet; we want to study more!',
    correct_sentence: "No, we aren't tired yet; we want to study more!",
    error_word_index: null,
    options: ["aren't", "isn't", 'am not', 'not are'],
    correct_option: "aren't",
    explanation: 'Use "aren\'t" (are not) for negative sentences with "we".',
    status: 'approved',
  },
  {
    book: 'Beginner',
    chapter: '1',
    type: 'fill_gap',
    sentence: 'My coffee ___ cold. Can I have a hot cup, please?',
    correct_sentence: 'My coffee is cold. Can I have a hot cup, please?',
    error_word_index: null,
    options: ['is', 'are', 'am', 'were'],
    correct_option: 'is',
    explanation: '"My coffee" (it) is singular, so use "is".',
    status: 'approved',
  },
  {
    book: 'Beginner',
    chapter: '1',
    type: 'fill_gap',
    sentence: 'He ___ from Brazil; he is from Argentina.',
    correct_sentence: "He isn't from Brazil; he is from Argentina.",
    error_word_index: null,
    options: ["isn't", "aren't", 'am not', 'not is'],
    correct_option: "isn't",
    explanation: 'Use "isn\'t" (is not) for negative statements with "he".',
    status: 'approved',
  },

  // ==========================================
  // TYPE C: word_order (6 questions)
  // ==========================================
  {
    book: 'Beginner',
    chapter: '1',
    type: 'word_order',
    sentence: 'teacher / very / Our / is / kind.',
    correct_sentence: 'Our teacher is very kind.',
    error_word_index: null,
    options: ['teacher', 'very', 'Our', 'is', 'kind.'],
    correct_option: 'Our teacher is very kind.',
    explanation: 'Start with the subject "Our teacher", followed by "is" and "very kind."',
    status: 'approved',
  },
  {
    book: 'Beginner',
    chapter: '1',
    type: 'word_order',
    sentence: 'you / Are / ready / class / for / ?',
    correct_sentence: 'Are you ready for class?',
    error_word_index: null,
    options: ['you', 'Are', 'ready', 'for', 'class?'],
    correct_option: 'Are you ready for class?',
    explanation: 'Yes/No questions with "to be" start with "Are" + subject "you".',
    status: 'approved',
  },
  {
    book: 'Beginner',
    chapter: '1',
    type: 'word_order',
    sentence: 'not / I / late / am / today.',
    correct_sentence: 'I am not late today.',
    error_word_index: null,
    options: ['not', 'I', 'late', 'am', 'today.'],
    correct_option: 'I am not late today.',
    explanation: 'Place "not" directly after the verb "am" in negative sentences.',
    status: 'approved',
  },
  {
    book: 'Beginner',
    chapter: '1',
    type: 'word_order',
    sentence: 'friends / My / in / are / London.',
    correct_sentence: 'My friends are in London.',
    error_word_index: null,
    options: ['friends', 'My', 'in', 'are', 'London.'],
    correct_option: 'My friends are in London.',
    explanation: 'Plural subject "My friends" is followed by "are" + location "in London."',
    status: 'approved',
  },
  {
    book: 'Beginner',
    chapter: '1',
    type: 'word_order',
    sentence: 'she / Is / your / sister / younger / ?',
    correct_sentence: 'Is she your younger sister?',
    error_word_index: null,
    options: ['she', 'Is', 'your', 'younger', 'sister?'],
    correct_option: 'Is she your younger sister?',
    explanation: 'Start the question with "Is" + subject "she" + "your younger sister?".',
    status: 'approved',
  },
  {
    book: 'Beginner',
    chapter: '1',
    type: 'word_order',
    sentence: 'keys / The / on / are / table. / the',
    correct_sentence: 'The keys are on the table.',
    error_word_index: null,
    options: ['keys', 'The', 'on', 'are', 'the', 'table.'],
    correct_option: 'The keys are on the table.',
    explanation: '"The keys" is plural, followed by "are" and the prepositional phrase "on the table."',
    status: 'approved',
  },
];

const GRAMMAR_DISTRACTOR_FAMILIES: string[][] = [
  ['am', 'is', 'are', 'be'],
  ['was', 'were', 'are', 'is'],
  ["isn't", "aren't", "don't", "doesn't"],
  ["don't", "doesn't", "didn't", "aren't"],
  ['this', 'that', 'these', 'those'],
  ['in', 'on', 'at', 'to'],
  ['where', 'what', 'who', 'why', 'when', 'how'],
  ['some', 'any', 'no', 'many'],
  ['much', 'many', 'few', 'little'],
  ['do', 'does', 'did', 'are'],
  ['have', 'has', 'had', 'is'],
  ['can', 'could', 'should', 'must', 'would', 'will', 'might'],
  ['for', 'since', 'from', 'during'],
  ['already', 'yet', 'just', 'ever'],
  ['who', 'which', 'whose', 'where'],
  ['if', 'unless', 'although', 'because'],
  ['my', 'your', 'his', 'her', 'our', 'their'],
];

function matchGrammarWordInTokens(tokens: string[]): {
  index: number;
  rawToken: string;
  cleanWord: string;
  punctuation: string;
  distractors: string[];
} {
  // Look for a token belonging to one of our grammar families first
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    const puncMatch = raw.match(/([.,!?;:]+)$/);
    const punctuation = puncMatch ? puncMatch[1] : '';
    const clean = raw.replace(/[.,!?;:]+$/, '');
    const lower = clean.toLowerCase();

    for (const family of GRAMMAR_DISTRACTOR_FAMILIES) {
      if (family.includes(lower)) {
        const isCapitalized = clean[0] && clean[0] === clean[0].toUpperCase() && clean[0] !== clean[0].toLowerCase();
        const others = family
          .filter((w) => w !== lower)
          .slice(0, 3)
          .map((w) => (isCapitalized ? w.charAt(0).toUpperCase() + w.slice(1) : w));
        return {
          index: i,
          rawToken: raw,
          cleanWord: clean,
          punctuation,
          distractors: others,
        };
      }
    }
  }

  // Fallback: pick index 1 (usually the verb) or 0
  const fallbackIdx = tokens.length > 1 ? 1 : 0;
  const raw = tokens[fallbackIdx];
  const puncMatch = raw.match(/([.,!?;:]+)$/);
  const punctuation = puncMatch ? puncMatch[1] : '';
  const clean = raw.replace(/[.,!?;:]+$/, '');
  const fallbackDistractors = ['is', 'are', 'do', 'have'].filter(
    (w) => w.toLowerCase() !== clean.toLowerCase()
  ).slice(0, 3);

  return {
    index: fallbackIdx,
    rawToken: raw,
    cleanWord: clean,
    punctuation,
    distractors: fallbackDistractors,
  };
}

function deterministicShuffle(words: string[], seed: number): string[] {
  const arr = [...words];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (seed + i * 7) % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  // Ensure not identical to original if length > 1
  if (arr.length > 1 && arr.join(' ') === words.join(' ')) {
    const tmp = arr[0];
    arr[0] = arr[1];
    arr[1] = tmp;
  }
  return arr;
}

// Build 15 ready-to-play questions for every chapter across Beginner, Intermediate, and Advanced
export const ALL_CHAPTERS_BUILT_IN_QUESTIONS: GrammarGameQuestion[] = (() => {
  const result: GrammarGameQuestion[] = [];

  // Add the 18 handcrafted Beginner Chapter 1 questions first
  BEGINNER_CH1_SEED_QUESTIONS.forEach((q, idx) => {
    result.push({
      ...q,
      id: `builtin-Beginner-1-${idx + 1}`,
    });
  });

  for (const bookLevel of GRAMMAR_BOOK_LEVELS) {
    const speakingBook = SPEAKING_BOOKS.find((b) => b.level === bookLevel);
    if (!speakingBook) continue;

    for (const ch of speakingBook.chapters) {
      const chStr = String(ch.chapterNumber);

      // Always add the Speaking & Pronunciation exercises for every chapter (including Beginner Ch 1)
      ch.sentences.forEach((s, sIdx) => {
        const cleanSent = s.sentence.trim();
        const tip = s.grammarTip || `${ch.title}: ${ch.grammarFocus}`;
        result.push({
          id: `builtin-${bookLevel}-${chStr}-spk-${sIdx + 1}`,
          book: bookLevel,
          chapter: chStr,
          type: 'speaking',
          sentence: cleanSent,
          correct_sentence: cleanSent,
          error_word_index: null,
          options: [],
          correct_option: cleanSent,
          explanation: tip,
          phonetic_focus: s.phoneticFocus,
          status: 'approved',
        });
      });

      // Beginner Ch 1 already has 18 handcrafted grammar questions
      if (bookLevel === 'Beginner' && chStr === '1') continue;

      ch.sentences.forEach((s, sIdx) => {
        const cleanSent = s.sentence.trim();
        const tokens = tokenizeSentenceWords(cleanSent);
        const match = matchGrammarWordInTokens(tokens);
        const tip = s.grammarTip || `${ch.title}: ${ch.grammarFocus}`;

        // 1) Fill in the Gap
        const gapTokens = [...tokens];
        gapTokens[match.index] = `___${match.punctuation}`;
        const gapOptions = [match.cleanWord, ...match.distractors].slice(0, 4);

        result.push({
          id: `builtin-${bookLevel}-${chStr}-fg-${sIdx + 1}`,
          book: bookLevel,
          chapter: chStr,
          type: 'fill_gap',
          sentence: gapTokens.join(' '),
          correct_sentence: cleanSent,
          error_word_index: null,
          options: deterministicShuffle(gapOptions, ch.chapterNumber + sIdx),
          correct_option: match.cleanWord,
          explanation: tip,
          status: 'approved',
        });

        // 2) True / False + Fix
        const isCorrectItem = sIdx % 2 === 1;
        if (isCorrectItem) {
          result.push({
            id: `builtin-${bookLevel}-${chStr}-tf-${sIdx + 1}`,
            book: bookLevel,
            chapter: chStr,
            type: 'true_false_fix',
            sentence: cleanSent,
            correct_sentence: cleanSent,
            error_word_index: null,
            options: [],
            correct_option: '',
            explanation: `Correct! ${tip}`,
            status: 'approved',
          });
        } else {
          const wrongWord = match.distractors[0] || 'is';
          const wrongTokens = [...tokens];
          wrongTokens[match.index] = `${wrongWord}${match.punctuation}`;
          result.push({
            id: `builtin-${bookLevel}-${chStr}-tf-${sIdx + 1}`,
            book: bookLevel,
            chapter: chStr,
            type: 'true_false_fix',
            sentence: wrongTokens.join(' '),
            correct_sentence: cleanSent,
            error_word_index: match.index,
            options: deterministicShuffle(gapOptions, ch.chapterNumber + sIdx + 3),
            correct_option: match.cleanWord,
            explanation: tip,
            status: 'approved',
          });
        }

        // 3) Word Order
        const shuffledTiles = deterministicShuffle(tokens, ch.chapterNumber * 11 + sIdx);
        result.push({
          id: `builtin-${bookLevel}-${chStr}-wo-${sIdx + 1}`,
          book: bookLevel,
          chapter: chStr,
          type: 'word_order',
          sentence: shuffledTiles.join(' / '),
          correct_sentence: cleanSent,
          error_word_index: null,
          options: shuffledTiles,
          correct_option: cleanSent,
          explanation: tip,
          status: 'approved',
        });
      });
    }
  }

  return result;
})();

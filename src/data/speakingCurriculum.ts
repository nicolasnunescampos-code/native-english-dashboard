export interface SpeakingSentence {
  id: string;
  sentence: string;
  translationBr?: string;
  grammarTip?: string;
  phoneticFocus?: string;
}

export interface SpeakingChapter {
  chapterNumber: number;
  title: string;
  grammarFocus: string;
  sentences: SpeakingSentence[];
}

export interface SpeakingBook {
  id: string;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Advanced Alumni';
  cefr: 'A1/A2' | 'B1/B2' | 'B2/C1' | 'C1/C2';
  color: string;
  badgeBg: string;
  description: string;
  chapters: SpeakingChapter[];
}

export const SPEAKING_BOOKS: SpeakingBook[] = [
  // ==========================================
  // 1. Beginner Grammar (A1/A2)
  // ==========================================
  {
    id: 'beginner-grammar',
    title: 'Beginner Grammar',
    level: 'Beginner',
    cefr: 'A1/A2',
    color: 'emerald',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    description: 'Master core foundations: To Be, prepositions, questions, and simple present.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Verb To Be',
        grammarFocus: 'Am, is, are & simple contractions (I’m, she’s, they’re).',
        sentences: [
          {
            id: 'b-ch1-1',
            sentence: "Hello, I am a new student.",
            grammarTip: "Use 'am' with 'I' ('I am' or 'I'm').",
            phoneticFocus: "Connect 'I am a' smoothly: /aɪ æm ə/."
          },
          {
            id: 'b-ch1-2',
            sentence: "She is my English teacher.",
            grammarTip: "Use 'is' with he, she, it.",
            phoneticFocus: "'She is' often contracts to /ʃiːz/."
          },
          {
            id: 'b-ch1-3',
            sentence: "He is very happy today.",
            grammarTip: "Simple adjective following the verb To Be.",
            phoneticFocus: "Stress on 'very' and 'happy'."
          },
          {
            id: 'b-ch1-4',
            sentence: "We are ready for the class.",
            grammarTip: "Use 'are' with plural subject 'we'.",
            phoneticFocus: "'We are' links as /wiː ɑːr/."
          },
          {
            id: 'b-ch1-5',
            sentence: "Are you at home right now?",
            grammarTip: "Invert 'Are' and 'you' to ask a question.",
            phoneticFocus: "Rising tone at the end of yes/no questions."
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'Demonstrative Pronouns',
        grammarFocus: 'This, that, these, and those for near and far objects.',
        sentences: [
          {
            id: 'b-ch2-1',
            sentence: "This is my new phone.",
            grammarTip: "'This' is for one thing close to you.",
            phoneticFocus: "Soft 'th' sound: /ðɪs/."
          },
          {
            id: 'b-ch2-2',
            sentence: "That is a very nice car.",
            grammarTip: "'That' is for one thing far from you.",
            phoneticFocus: "Link 'That is a': /ðæt ɪz ə/."
          },
          {
            id: 'b-ch2-3',
            sentence: "These are my English books.",
            grammarTip: "'These' is for multiple things close to you.",
            phoneticFocus: "Long vowel /iː/ and /z/ sound in 'These'."
          },
          {
            id: 'b-ch2-4',
            sentence: "Those people are my friends.",
            grammarTip: "'Those' is for multiple people or things far away.",
            phoneticFocus: "'Those' has a rounded /oʊ/ sound: /ðoʊz/."
          },
          {
            id: 'b-ch2-5',
            sentence: "Is that your coffee on the table?",
            grammarTip: "Question formation with 'that'.",
            phoneticFocus: "Smooth link: 'Is that' -> /ɪz ðæt/."
          }
        ]
      },
      {
        chapterNumber: 3,
        title: 'Prepositions',
        grammarFocus: 'In, on, at for simple places and times.',
        sentences: [
          {
            id: 'b-ch3-1',
            sentence: "I live in a big city.",
            grammarTip: "Use 'in' for cities, countries, and rooms.",
            phoneticFocus: "Link 'in a' -> /ɪn ə/."
          },
          {
            id: 'b-ch3-2',
            sentence: "The book is on the table.",
            grammarTip: "Use 'on' for surfaces.",
            phoneticFocus: "'on the' flows together quickly."
          },
          {
            id: 'b-ch3-3',
            sentence: "See you at the school tomorrow.",
            grammarTip: "Use 'at' for specific locations.",
            phoneticFocus: "Soft /t/ in 'at'."
          },
          {
            id: 'b-ch3-4',
            sentence: "My birthday is in September.",
            grammarTip: "Use 'in' for months and years.",
            phoneticFocus: "Stress on the second syllable of 'September'."
          },
          {
            id: 'b-ch3-5',
            sentence: "Our class starts at eight o'clock.",
            grammarTip: "Use 'at' for precise clock times.",
            phoneticFocus: "Connect 'starts at' -> /stɑːrts æt/."
          }
        ]
      },
      {
        chapterNumber: 4,
        title: 'There is vs. There are',
        grammarFocus: 'There is (singular) and There are (plural).',
        sentences: [
          {
            id: 'b-ch4-1',
            sentence: "There is a cat in the garden.",
            grammarTip: "Use 'There is' with one item.",
            phoneticFocus: "'There is a' sounds like /ðɛər ɪz ə/."
          },
          {
            id: 'b-ch4-2',
            sentence: "There are three books on my desk.",
            grammarTip: "Use 'There are' with plural items.",
            phoneticFocus: "'There are' quickly blends into /ðərər/."
          },
          {
            id: 'b-ch4-3',
            sentence: "Is there any water in the bottle?",
            grammarTip: "Question: 'Is there...?' for singular or uncountable nouns.",
            phoneticFocus: "Rising tone at the end."
          },
          {
            id: 'b-ch4-4',
            sentence: "There are many students in the room.",
            grammarTip: "'There are' with plural noun 'students'.",
            phoneticFocus: "Stress 'students' and 'room'."
          },
          {
            id: 'b-ch4-5',
            sentence: "There isn't a problem with your order.",
            grammarTip: "Negative singular: 'There isn't'.",
            phoneticFocus: "Contraction 'isn't' -> /ˈɪz.ənt/."
          }
        ]
      },
      {
        chapterNumber: 5,
        title: 'Question Words & Relative Pronouns',
        grammarFocus: 'Where, what, who, why, when, how.',
        sentences: [
          {
            id: 'b-ch5-1',
            sentence: "Where do you live?",
            grammarTip: "'Where' asks for location.",
            phoneticFocus: "Connect 'Where do you' -> /wɛər də juː/."
          },
          {
            id: 'b-ch5-2',
            sentence: "What is your favorite food?",
            grammarTip: "'What' asks for specific information.",
            phoneticFocus: "'What is' contracts to 'What's' /wɒts/."
          },
          {
            id: 'b-ch5-3',
            sentence: "Who is that person over there?",
            grammarTip: "'Who' asks about a person.",
            phoneticFocus: "'over there' blends smoothly."
          },
          {
            id: 'b-ch5-4',
            sentence: "Why are you late today?",
            grammarTip: "'Why' asks for reasons.",
            phoneticFocus: "Falling tone at the end of information questions."
          },
          {
            id: 'b-ch5-5',
            sentence: "How do you spell your name?",
            grammarTip: "'How' asks for method or manner.",
            phoneticFocus: "Clear stress on 'spell' and 'name'."
          }
        ]
      },
      {
        chapterNumber: 6,
        title: 'Simple Present',
        grammarFocus: 'Routines and third person -s (he/she/it).',
        sentences: [
          {
            id: 'b-ch6-1',
            sentence: "I wake up early every day.",
            grammarTip: "Simple present for daily routine.",
            phoneticFocus: "Link 'wake up' -> /weɪ.kʌp/."
          },
          {
            id: 'b-ch6-2',
            sentence: "She drinks coffee in the morning.",
            grammarTip: "Add '-s' for she: 'drinks'.",
            phoneticFocus: "Clear final /s/ on 'drinks'."
          },
          {
            id: 'b-ch6-3',
            sentence: "They play soccer on weekends.",
            grammarTip: "Plural subject takes base verb 'play'.",
            phoneticFocus: "Natural rhythm on 'on weekends'."
          },
          {
            id: 'b-ch6-4',
            sentence: "He works at a bank downtown.",
            grammarTip: "Third person '-s': 'works'.",
            phoneticFocus: "Link 'works at a' -> /wɜːrks æt ə/."
          },
          {
            id: 'b-ch6-5',
            sentence: "Do you speak English every day?",
            grammarTip: "Auxiliary 'Do' for questions with 'you'.",
            phoneticFocus: "Rising tone at question end."
          }
        ]
      },
      {
        chapterNumber: 7,
        title: 'Some, Any & No',
        grammarFocus: 'Quantifiers: Some (yes), Any (questions/negative), No (none).',
        sentences: [
          {
            id: 'b-ch7-1',
            sentence: "I want some water, please.",
            grammarTip: "'Some' in polite positive requests.",
            phoneticFocus: "Soft, polite tone."
          },
          {
            id: 'b-ch7-2',
            sentence: "Do you have any questions for me?",
            grammarTip: "Use 'any' in general questions.",
            phoneticFocus: "'questions for' links naturally."
          },
          {
            id: 'b-ch7-3',
            sentence: "I don't have any money today.",
            grammarTip: "'Any' used with negative 'don't have'.",
            phoneticFocus: "Stress on 'don't' and 'money'."
          },
          {
            id: 'b-ch7-4',
            sentence: "There is no milk in the fridge.",
            grammarTip: "'No' expresses zero quantity.",
            phoneticFocus: "'fridge' rhymes with 'bridge'."
          },
          {
            id: 'b-ch7-5',
            sentence: "We have some good news for you.",
            grammarTip: "'News' is uncountable, use 'some'.",
            phoneticFocus: "Stress on 'good news'."
          }
        ]
      },
      {
        chapterNumber: 8,
        title: 'Much vs. Many',
        grammarFocus: 'Much (uncountable) vs Many (countable).',
        sentences: [
          {
            id: 'b-ch8-1',
            sentence: "How much water do you drink?",
            grammarTip: "'Much' for liquids and uncountable nouns.",
            phoneticFocus: "Flow smoothly through 'How much'."
          },
          {
            id: 'b-ch8-2',
            sentence: "How many brothers do you have?",
            grammarTip: "'Many' for countable items (brothers).",
            phoneticFocus: "Clear 'th' in 'brothers'."
          },
          {
            id: 'b-ch8-3',
            sentence: "I don't have much time today.",
            grammarTip: "'Time' is uncountable, use 'much'.",
            phoneticFocus: "Stress 'much time'."
          },
          {
            id: 'b-ch8-4',
            sentence: "There are many cars on the street.",
            grammarTip: "'Cars' is countable, use 'many'.",
            phoneticFocus: "Stress 'many cars'."
          },
          {
            id: 'b-ch8-5',
            sentence: "How much is this blue shirt?",
            grammarTip: "'How much is...?' asks for price.",
            phoneticFocus: "Natural shopping question rhythm."
          }
        ]
      },
      {
        chapterNumber: 9,
        title: 'Present Continuous',
        grammarFocus: 'Actions happening right now (am/is/are + -ing).',
        sentences: [
          {
            id: 'b-ch9-1',
            sentence: "I am studying English right now.",
            grammarTip: "'am studying' describes action in progress.",
            phoneticFocus: "Contract 'I am' to 'I'm'."
          },
          {
            id: 'b-ch9-2',
            sentence: "She is cooking dinner in the kitchen.",
            grammarTip: "'is cooking' for current activity.",
            phoneticFocus: "Soft '-ing' ending: /ˈkʊk.ɪŋ/."
          },
          {
            id: 'b-ch9-3',
            sentence: "They are watching a movie together.",
            grammarTip: "'are watching' with plural subject.",
            phoneticFocus: "'watching a' links: /ˈwɒtʃ.ɪŋ ə/."
          },
          {
            id: 'b-ch9-4',
            sentence: "What are you doing today?",
            grammarTip: "Common everyday greeting question.",
            phoneticFocus: "'What are you' sounds like /wɒtər juː/."
          },
          {
            id: 'b-ch9-5',
            sentence: "He is listening to his favorite music.",
            grammarTip: "Silent 't' in 'listening' /ˈlɪs.ən.ɪŋ/.",
            phoneticFocus: "Remember preposition 'listening to'."
          }
        ]
      },
      {
        chapterNumber: 10,
        title: 'Frequency Expressions',
        grammarFocus: 'Always, usually, sometimes, never.',
        sentences: [
          {
            id: 'b-ch10-1',
            sentence: "I always eat breakfast at seven.",
            grammarTip: "'Always' (100% of the time) before the verb.",
            phoneticFocus: "'breakfast' pronunciation: /ˈbrek.fəst/."
          },
          {
            id: 'b-ch10-2',
            sentence: "She usually walks to work.",
            grammarTip: "'Usually' (around 80% frequency).",
            phoneticFocus: "'usually' sound: /ˈjuː.ʒu.ə.li/."
          },
          {
            id: 'b-ch10-3',
            sentence: "We sometimes watch TV at night.",
            grammarTip: "'Sometimes' (around 50% frequency).",
            phoneticFocus: "Natural cadence on 'at night'."
          },
          {
            id: 'b-ch10-4',
            sentence: "He never drinks cold water.",
            grammarTip: "'Never' (0% frequency).",
            phoneticFocus: "Stress on 'never' and 'cold'."
          },
          {
            id: 'b-ch10-5',
            sentence: "I practice English every single day.",
            grammarTip: "'Every day' placed at the end of the sentence.",
            phoneticFocus: "Enthusiastic rising rhythm on 'every single day'."
          }
        ]
      }
    ]
  },

  // ==========================================
  // 2. Intermediate Grammar (B1/B2)
  // ==========================================
  {
    id: 'intermediate-grammar',
    title: 'Intermediate Grammar',
    level: 'Intermediate',
    cefr: 'B1/B2',
    color: 'blue',
    badgeBg: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    description: 'Master future tenses, past tenses, modal verbs, and present/past perfect.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Future Tense',
        grammarFocus: 'Will, be going to, and present continuous for future arrangements.',
        sentences: [
          {
            id: 'i-ch1-1',
            sentence: "I think it will rain later, so take an umbrella with you.",
            grammarTip: "'Will' for spontaneous predictions based on belief.",
            phoneticFocus: "'it will' often contracts to /ɪt.əl/."
          },
          {
            id: 'i-ch1-2',
            sentence: "We are going to launch our new product line next month.",
            grammarTip: "'Be going to' for planned intentions.",
            phoneticFocus: "'going to' frequently sounds like 'gonna' /ɡənə/ in conversational rhythm."
          },
          {
            id: 'i-ch1-3',
            sentence: "I'm flying to New York on Friday morning for a conference.",
            grammarTip: "Present continuous for fixed arrangements with a calendar date.",
            phoneticFocus: "Strong stress on 'flying' and 'Friday'."
          },
          {
            id: 'i-ch1-4',
            sentence: "Don't worry about the bill, I'll take care of it tonight.",
            grammarTip: "Instant offer made with 'I'll'.",
            phoneticFocus: "'I'll' is one clean syllable: /aɪl/."
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'Comparative & Superlative',
        grammarFocus: '-er / more than & the -est / the most + irregular adjectives.',
        sentences: [
          {
            id: 'i-ch2-1',
            sentence: "This laptop is much faster and more reliable than my old one.",
            grammarTip: "Short adjective '-er' and long adjective 'more'.",
            phoneticFocus: "Link 'faster and' -> /ˈfɑː.stə rənd/."
          },
          {
            id: 'i-ch2-2',
            sentence: "That was the most interesting presentation I have ever seen.",
            grammarTip: "Superlative with 'the most'.",
            phoneticFocus: "'interesting' is 3 syllables: /ˈɪn.trɪ.stɪŋ/."
          },
          {
            id: 'i-ch2-3',
            sentence: "The weather today is even worse than it was yesterday.",
            grammarTip: "Irregular comparative: bad -> worse.",
            phoneticFocus: "Crisp ending /s/ on 'worse'."
          },
          {
            id: 'i-ch2-4',
            sentence: "She is by far the best candidate for this leadership role.",
            grammarTip: "'By far the best' intensifies the superlative.",
            phoneticFocus: "Stress on 'best' and 'leadership'."
          }
        ]
      },
      {
        chapterNumber: 3,
        title: 'Possessive Pronouns & Possessive Adjectives',
        grammarFocus: 'My, your, his, her, its, our, their vs mine, yours, his, hers, ours, theirs.',
        sentences: [
          {
            id: 'i-ch3-1',
            sentence: "This isn't my notebook; I think it belongs to yours or hers.",
            grammarTip: "Possessive adjectives (my) vs pronouns (yours, hers).",
            phoneticFocus: "Differentiate /z/ ending in 'yours' and 'hers'."
          },
          {
            id: 'i-ch3-2',
            sentence: "Our team finished our report, but they haven't submitted theirs.",
            grammarTip: "'Ours' vs 'Theirs'.",
            phoneticFocus: "Voiced /ð/ in 'theirs' /ðeəz/."
          },
          {
            id: 'i-ch3-3',
            sentence: "Whose car is parked directly in front of their driveway?",
            grammarTip: "'Whose' indicates possession question.",
            phoneticFocus: "'Whose' sounds like 'who's' /huːz/."
          },
          {
            id: 'i-ch3-4',
            sentence: "Each company must protect its customers and their privacy.",
            grammarTip: "'Its' (possessive, no apostrophe) vs 'It's' (it is).",
            phoneticFocus: "Clean /ts/ cluster in 'its'."
          }
        ]
      },
      {
        chapterNumber: 4,
        title: 'Simple Past',
        grammarFocus: 'Regular -ed endings (/t/, /d/, /ɪd/) and key irregular verbs.',
        sentences: [
          {
            id: 'i-ch4-1',
            sentence: "I watched the documentary, and it opened my eyes completely.",
            grammarTip: "Pronunciation of -ed: 'watched' (/t/) and 'opened' (/d/).",
            phoneticFocus: "Do not say 'watch-ed' with an extra syllable!"
          },
          {
            id: 'i-ch4-2',
            sentence: "They decided to postpone the event until next Saturday.",
            grammarTip: "-ed pronounced as /ɪd/ after /d/ sound: 'decided'.",
            phoneticFocus: "'decided' has 3 syllables: /dɪˈsaɪ.dɪd/."
          },
          {
            id: 'i-ch4-3',
            sentence: "She bought a new car and drove it straight across the country.",
            grammarTip: "Irregular past verbs: buy -> bought, drive -> drove.",
            phoneticFocus: "'bought' has open /ɔː/ sound, silent 'gh'."
          },
          {
            id: 'i-ch4-4',
            sentence: "Did you speak to your manager about the contract extension?",
            grammarTip: "Auxiliary 'Did' takes base verb 'speak'.",
            phoneticFocus: "Rising-falling tone on question."
          }
        ]
      },
      {
        chapterNumber: 5,
        title: 'Past Continuous',
        grammarFocus: 'Ongoing past actions interrupted by simple past (was/were + -ing).',
        sentences: [
          {
            id: 'i-ch5-1',
            sentence: "I was having dinner when my phone suddenly started ringing.",
            grammarTip: "Longer action in past continuous, interruption in simple past.",
            phoneticFocus: "Link 'was having' smoothly without stopping."
          },
          {
            id: 'i-ch5-2',
            sentence: "What were you doing at eight o'clock yesterday evening?",
            grammarTip: "Specific time in the past requires past continuous.",
            phoneticFocus: "'What were you' connects as /wɒt wər juː/."
          },
          {
            id: 'i-ch5-3',
            sentence: "While we were discussing the budget, the lights went out.",
            grammarTip: "Use 'While' with past continuous.",
            phoneticFocus: "'discussing' stress on second syllable."
          },
          {
            id: 'i-ch5-4',
            sentence: "They weren't paying attention when the teacher gave the instructions.",
            grammarTip: "Negative past continuous 'weren't paying'.",
            phoneticFocus: "Contraction 'weren't' as one syllable /wɜːnt/."
          }
        ]
      },
      {
        chapterNumber: 6,
        title: 'Modal Verbs',
        grammarFocus: 'Can, could, should, must, might, have to for advice & obligation.',
        sentences: [
          {
            id: 'i-ch6-1',
            sentence: "You should definitely review the notes before the final exam.",
            grammarTip: "'Should' expresses strong advice; silent 'l'.",
            phoneticFocus: "Silent 'l' in 'should': /ʃʊd/."
          },
          {
            id: 'i-ch6-2',
            sentence: "We must finish this report by Friday afternoon without fail.",
            grammarTip: "'Must' indicates strict obligation.",
            phoneticFocus: "Drop the final /t/ slightly when linking 'must finish'."
          },
          {
            id: 'i-ch6-3',
            sentence: "Could you please pass me the salt and pepper, if you don't mind?",
            grammarTip: "Polite request with 'Could'.",
            phoneticFocus: "Polite intonation curve."
          },
          {
            id: 'i-ch6-4',
            sentence: "She might join us for dinner if she finishes her work on time.",
            grammarTip: "'Might' expresses possibility.",
            phoneticFocus: "'might' rhymes with 'right' and 'light'."
          }
        ]
      },
      {
        chapterNumber: 7,
        title: 'Agreement Words',
        grammarFocus: 'So do I, neither do I, too, either for conversational agreement.',
        sentences: [
          {
            id: 'i-ch7-1',
            sentence: "I really love traveling to Europe, and so does my wife.",
            grammarTip: "Positive agreement: 'so + auxiliary + subject'.",
            phoneticFocus: "Accentuate 'so' and the subject."
          },
          {
            id: 'i-ch7-2',
            sentence: "I haven't seen that movie yet, and neither has my brother.",
            grammarTip: "Negative agreement: 'neither + auxiliary + subject'.",
            phoneticFocus: "'Neither' can be pronounced /ˈnaɪ.ðər/ or /ˈniː.ðər/."
          },
          {
            id: 'i-ch7-3',
            sentence: "She doesn't like spicy food, and I don't either.",
            grammarTip: "Negative statement + 'either' at the end.",
            phoneticFocus: "Stress on 'either' at the end of the clause."
          },
          {
            id: 'i-ch7-4',
            sentence: "We are ready for the presentation, and they are too.",
            grammarTip: "Positive statement + 'too' at the end.",
            phoneticFocus: "Clear pause before 'and they are too'."
          }
        ]
      },
      {
        chapterNumber: 8,
        title: 'Present Perfect',
        grammarFocus: 'Have/has + past participle for life experience, already, yet, just.',
        sentences: [
          {
            id: 'i-ch8-1',
            sentence: "I have already booked our flight tickets for next weekend.",
            grammarTip: "'Already' between auxiliary 'have' and participle 'booked'.",
            phoneticFocus: "Fast contraction 'I've already' -> /aɪv ɔːlˈred.i/."
          },
          {
            id: 'i-ch8-2',
            sentence: "Have you ever traveled to an English-speaking country before?",
            grammarTip: "Use 'ever' in questions about life experiences.",
            phoneticFocus: "Connect 'Have you ever' into one fluent wave."
          },
          {
            id: 'i-ch8-3',
            sentence: "She hasn't received the confirmation email from the bank yet.",
            grammarTip: "'Yet' placed at the end of negative sentences.",
            phoneticFocus: "Crisp final /t/ on 'yet'."
          },
          {
            id: 'i-ch8-4',
            sentence: "We have lived in this neighborhood for more than five years.",
            grammarTip: "'For' with duration vs 'since' with starting point.",
            phoneticFocus: "Soft /v/ in 'lived in': /lɪvd ɪn/."
          }
        ]
      },
      {
        chapterNumber: 9,
        title: 'Past Perfect',
        grammarFocus: 'Had + past participle for the earlier of two past actions.',
        sentences: [
          {
            id: 'i-ch9-1',
            sentence: "When we arrived at the station, the train had already left.",
            grammarTip: "Past perfect shows the train left BEFORE we arrived.",
            phoneticFocus: "Contract 'had already' smoothly: /hæd ɔːlˈred.i/."
          },
          {
            id: 'i-ch9-2',
            sentence: "She had never eaten sushi before she moved to Tokyo.",
            grammarTip: "Experience prior to a past reference point.",
            phoneticFocus: "Emphasize 'never' for dramatic clarity."
          },
          {
            id: 'i-ch9-3',
            sentence: "I realized I had forgotten my keys as soon as I closed the door.",
            grammarTip: "Two past actions: forgetting happened first.",
            phoneticFocus: "'realized' stress on first syllable."
          },
          {
            id: 'i-ch9-4',
            sentence: "Had you studied English before you started taking these lessons?",
            grammarTip: "Question inversion with 'Had'.",
            phoneticFocus: "Rising intonation on yes/no question."
          }
        ]
      },
      {
        chapterNumber: 10,
        title: 'Condition & Consequence',
        grammarFocus: 'Zero, First, and Second Conditionals (if + present/past, will/would).',
        sentences: [
          {
            id: 'i-ch10-1',
            sentence: "If it rains tomorrow, we will probably stay home and watch a movie.",
            grammarTip: "First conditional: real future possibility (if + present, will).",
            phoneticFocus: "Slight pause after the 'if' clause comma."
          },
          {
            id: 'i-ch10-2',
            sentence: "If I won the lottery, I would travel around the world for a year.",
            grammarTip: "Second conditional: hypothetical situation (if + past, would).",
            phoneticFocus: "'I would' reduces to /aɪd/ in native speech."
          },
          {
            id: 'i-ch10-3',
            sentence: "If you heat ice, it melts into water automatically.",
            grammarTip: "Zero conditional: universal scientific truth.",
            phoneticFocus: "Clear third-person /s/ on 'melts'."
          },
          {
            id: 'i-ch10-4',
            sentence: "What would you do if your flight was suddenly cancelled?",
            grammarTip: "Question format for hypothetical second conditional.",
            phoneticFocus: "Natural linking: 'was suddenly' -> /wɒz ˈsʌd.ən.li/."
          }
        ]
      }
    ]
  },

  // ==========================================
  // 3. Advanced - Native English (Vol. 3) (B2/C1)
  // ==========================================
  {
    id: 'advanced-vol3',
    title: 'Advanced - Native English (Vol. 3)',
    level: 'Advanced',
    cefr: 'B2/C1',
    color: 'purple',
    badgeBg: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    description: 'Idiomatic spoken English: phrasal verbs, reported speech, passive voice, and idioms.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Phrasal Verbs (Look)',
        grammarFocus: 'Look after, look forward to, look into, look up to, look down on.',
        sentences: [
          {
            id: 'a3-ch1-1',
            sentence: "I am really looking forward to seeing you at the conference.",
            grammarTip: "'Look forward to' must be followed by a gerund (-ing verb).",
            phoneticFocus: "Connect 'looking forward to' as one rhythm unit."
          },
          {
            id: 'a3-ch1-2',
            sentence: "The police promised to look into the matter immediately.",
            grammarTip: "'Look into' means to investigate thoroughly.",
            phoneticFocus: "Link 'look into' -> /ˈlʊk.ɪn.tuː/."
          },
          {
            id: 'a3-ch1-3',
            sentence: "She has always looked up to her older sister as a role model.",
            grammarTip: "'Look up to' means to admire and respect.",
            phoneticFocus: "Three-part phrasal verb rhythm: 'looked_up_to'."
          },
          {
            id: 'a3-ch1-4',
            sentence: "Could you please look after my dog while I am out of town?",
            grammarTip: "'Look after' means to take care of.",
            phoneticFocus: "'while I am' links as /waɪl aɪ æm/."
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'Reported Speech',
        grammarFocus: 'Backshifting tenses, reporting verbs (said, told, explained, claimed).',
        sentences: [
          {
            id: 'a3-ch2-1',
            sentence: "He told me that he would call back as soon as he landed.",
            grammarTip: "'will' backshifts to 'would' in reported speech.",
            phoneticFocus: "Stress on 'call back' and 'landed'."
          },
          {
            id: 'a3-ch2-2',
            sentence: "She claimed that she had never received the original email.",
            grammarTip: "Past simple backshifts to past perfect.",
            phoneticFocus: "'claimed that' has a soft /d/ release."
          },
          {
            id: 'a3-ch2-3',
            sentence: "They asked us whether we were planning to attend the gala.",
            grammarTip: "Reported yes/no questions use 'if' or 'whether'.",
            phoneticFocus: "'whether' pronounced /ˈweð.ər/."
          },
          {
            id: 'a3-ch2-4',
            sentence: "The doctor advised him to take a few days off to recover.",
            grammarTip: "Reporting verb + object + infinitive: 'advised him to take'.",
            phoneticFocus: "Soft /z/ in verb 'advised' vs /s/ in noun 'advice'."
          }
        ]
      },
      {
        chapterNumber: 3,
        title: 'Tag Questions',
        grammarFocus: 'Intonation rules (falling for confirmation, rising for doubt).',
        sentences: [
          {
            id: 'a3-ch3-1',
            sentence: "You haven't seen my car keys anywhere, have you?",
            grammarTip: "Negative statement takes positive tag ('have you?').",
            phoneticFocus: "Rising intonation indicates genuine question/uncertainty."
          },
          {
            id: 'a3-ch3-2',
            sentence: "It's a beautiful afternoon outside today, isn't it?",
            grammarTip: "Positive statement takes negative tag ('isn't it?').",
            phoneticFocus: "Falling intonation invites polite agreement."
          },
          {
            id: 'a3-ch3-3',
            sentence: "She won't forget to send the signed contract, will she?",
            grammarTip: "'Won't' pairs with 'will she'.",
            phoneticFocus: "Contract 'won't' with rounded /oʊ/ sound."
          },
          {
            id: 'a3-ch3-4',
            sentence: "We should probably leave now before traffic gets worse, shouldn't we?",
            grammarTip: "Modal 'should' pairs with 'shouldn't we'.",
            phoneticFocus: "Silent 'l' in 'shouldn't'."
          }
        ]
      },
      {
        chapterNumber: 4,
        title: 'The Passive Voice',
        grammarFocus: 'Focus on the receiver of the action (be + past participle).',
        sentences: [
          {
            id: 'a3-ch4-1',
            sentence: "The brand new hospital was built in less than eighteen months.",
            grammarTip: "Past passive: 'was + built'.",
            phoneticFocus: "Stress 'hospital' and 'eighteen months'."
          },
          {
            id: 'a3-ch4-2',
            sentence: "English is spoken by millions of people across all five continents.",
            grammarTip: "Present passive for global facts.",
            phoneticFocus: "Link 'is spoken by': /ɪz ˈspəʊ.kən baɪ/."
          },
          {
            id: 'a3-ch4-3',
            sentence: "Our confidential data will be stored securely in the cloud.",
            grammarTip: "Future passive: 'will be + stored'.",
            phoneticFocus: "'securely' stress on second syllable /sɪˈkjʊə.li/."
          },
          {
            id: 'a3-ch4-4',
            sentence: "The meeting has been rescheduled for next Tuesday morning.",
            grammarTip: "Present perfect passive: 'has been rescheduled'.",
            phoneticFocus: "'rescheduled' has standard US /riːˈskedʒ.uːld/."
          }
        ]
      },
      {
        chapterNumber: 5,
        title: 'Phrasal Verbs (Get)',
        grammarFocus: 'Get over, get by, get along with, get away with, get through.',
        sentences: [
          {
            id: 'a3-ch5-1',
            sentence: "It took him several months to finally get over the breakup.",
            grammarTip: "'Get over' means to recover emotionally or physically.",
            phoneticFocus: "Link 'get over' -> /ɡet ˈəʊ.vər/."
          },
          {
            id: 'a3-ch5-2',
            sentence: "Do you get along with your new colleagues at the tech startup?",
            grammarTip: "'Get along with' means to have a good relationship.",
            phoneticFocus: "Smooth rhythm: 'get along with' /ɡet əˈlɒŋ wɪð/."
          },
          {
            id: 'a3-ch5-3',
            sentence: "He thinks he can get away with submitting his project late.",
            grammarTip: "'Get away with' means escaping punishment.",
            phoneticFocus: "Stress on 'away' in the phrasal verb."
          },
          {
            id: 'a3-ch5-4',
            sentence: "I couldn't get through to customer support on the telephone.",
            grammarTip: "'Get through to' means to connect via phone.",
            phoneticFocus: "Silent 'gh' in 'through' /θruː/."
          }
        ]
      },
      {
        chapterNumber: 6,
        title: 'Present Perfect Continuous',
        grammarFocus: 'Have/has been + -ing for actions started in past and still happening.',
        sentences: [
          {
            id: 'a3-ch6-1',
            sentence: "I have been working on this design project since early morning.",
            grammarTip: "'Have been working' emphasizes duration up to now.",
            phoneticFocus: "Contract 'I've been' -> /aɪv bɪn/."
          },
          {
            id: 'a3-ch6-2',
            sentence: "How long have you been studying English at Native English school?",
            grammarTip: "Standard duration question format.",
            phoneticFocus: "'How long have you' links as one flow."
          },
          {
            id: 'a3-ch6-3',
            sentence: "It has been raining all afternoon, and the streets are flooded.",
            grammarTip: "'Has been raining' with visible present consequence.",
            phoneticFocus: "'flooded' rhymes with 'blooded' /ˈflʌd.ɪd/."
          },
          {
            id: 'a3-ch6-4',
            sentence: "She has been feeling under the weather for the past three days.",
            grammarTip: "Idiom 'under the weather' paired with continuous aspect.",
            phoneticFocus: "Gentle rhythm on 'under the weather'."
          }
        ]
      },
      {
        chapterNumber: 7,
        title: 'Past Perfect Continuous',
        grammarFocus: 'Had been + -ing for duration leading up to another past moment.',
        sentences: [
          {
            id: 'a3-ch7-1',
            sentence: "They had been waiting for two hours before their flight finally boarded.",
            grammarTip: "Continuous duration preceding another past event.",
            phoneticFocus: "Stress 'two hours' and 'boarded'."
          },
          {
            id: 'a3-ch7-2',
            sentence: "He was completely exhausted because he had been running a marathon.",
            grammarTip: "Past cause-and-effect relationship.",
            phoneticFocus: "'exhausted' has silent 'h': /ɪɡˈzɔː.stɪd/."
          },
          {
            id: 'a3-ch7-3',
            sentence: "We had been looking for our lost luggage everywhere before finding it.",
            grammarTip: "Emphasis on continuous past effort.",
            phoneticFocus: "'luggage' /ˈlʌɡ.ɪdʒ/."
          },
          {
            id: 'a3-ch7-4',
            sentence: "How long had she been working there before she got promoted?",
            grammarTip: "Question inversion with past perfect continuous.",
            phoneticFocus: "Natural linking: 'got promoted' -> /ɡɒt prəˈməʊ.tɪd/."
          }
        ]
      },
      {
        chapterNumber: 8,
        title: 'Idioms',
        grammarFocus: 'Natural idioms: bite the bullet, cost an arm and a leg, hit the nail.',
        sentences: [
          {
            id: 'a3-ch8-1',
            sentence: "We decided to bite the bullet and invest in new company software.",
            grammarTip: "'Bite the bullet' = face an inevitable tough decision bravely.",
            phoneticFocus: "Crisp consonants in 'bite the bullet' /baɪt ðə ˈbʊl.ɪt/."
          },
          {
            id: 'a3-ch8-2',
            sentence: "Buying that sports car is going to cost an arm and a leg.",
            grammarTip: "'Cost an arm and a leg' = be extremely expensive.",
            phoneticFocus: "Blend 'cost an arm' -> /kɒst ən ɑːm/."
          },
          {
            id: 'a3-ch8-3',
            sentence: "You hit the nail on the head with that brilliant analysis.",
            grammarTip: "'Hit the nail on the head' = be exactly right.",
            phoneticFocus: "Fast conversational idiom cadence."
          },
          {
            id: 'a3-ch8-4',
            sentence: "Don't beat around the bush; just tell me what happened directly.",
            grammarTip: "'Beat around the bush' = avoid speaking directly.",
            phoneticFocus: "Rhythmic stress on 'beat' and 'bush'."
          }
        ]
      },
      {
        chapterNumber: 9,
        title: 'Relative Pronouns',
        grammarFocus: 'Defining vs non-defining clauses (who, which, that, whose, whom).',
        sentences: [
          {
            id: 'a3-ch9-1',
            sentence: "The engineer who designed this bridge won an international award.",
            grammarTip: "Defining relative clause (no commas).",
            phoneticFocus: "Keep 'who designed' unstressed relative to 'engineer'."
          },
          {
            id: 'a3-ch9-2',
            sentence: "My new laptop, which I bought last week, is already having issues.",
            grammarTip: "Non-defining relative clause requires commas and pauses.",
            phoneticFocus: "Distinct pause before 'which' and after 'week'."
          },
          {
            id: 'a3-ch9-3',
            sentence: "That's the woman whose son was accepted into Harvard University.",
            grammarTip: "'Whose' indicates possession for people.",
            phoneticFocus: "Voiced /z/ sound in 'whose'."
          },
          {
            id: 'a3-ch9-4',
            sentence: "The strategy that we implemented last quarter doubled our revenue.",
            grammarTip: "'That' in defining clauses.",
            phoneticFocus: "Weak form of 'that' /ðət/."
          }
        ]
      },
      {
        chapterNumber: 10,
        title: 'Revision',
        grammarFocus: 'Synthesis of phrasal verbs, idioms, and advanced tenses.',
        sentences: [
          {
            id: 'a3-ch10-1',
            sentence: "If you had looked into the problem earlier, we wouldn't be in this mess.",
            grammarTip: "Mixed conditional combining past condition with present result.",
            phoneticFocus: "Fast contraction 'wouldn't be' -> /ˈwʊd.ənt biː/."
          },
          {
            id: 'a3-ch10-2',
            sentence: "She has been getting along with her team better than ever before.",
            grammarTip: "Present perfect continuous + phrasal verb combination.",
            phoneticFocus: "Smooth linking across the sentence."
          },
          {
            id: 'a3-ch10-3',
            sentence: "The decision was made after they had weighed all the pros and cons.",
            grammarTip: "Passive voice combined with past perfect.",
            phoneticFocus: "Silent 'gh' in 'weighed' /weɪd/."
          },
          {
            id: 'a3-ch10-4',
            sentence: "You haven't bitten off more than you can chew, have you?",
            grammarTip: "Idiom 'bite off more than you can chew' inside a tag question.",
            phoneticFocus: "Intonation rises slightly at tag."
          }
        ]
      }
    ]
  },

  // ==========================================
  // 4. Advanced Alumni Grammar (Vol. 2) (C1/C2)
  // ==========================================
  {
    id: 'advanced-alumni',
    title: 'Advanced Alumni Grammar (Vol. 2)',
    level: 'Advanced Alumni',
    cefr: 'C1/C2',
    color: 'rose',
    badgeBg: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    description: 'Mastery & sophistication: Inversion, ellipsis, future perfect, and multi-preposition verbs.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Future Perfect',
        grammarFocus: 'Will have + past participle for milestones completed before a future time.',
        sentences: [
          {
            id: 'al-ch1-1',
            sentence: "By the end of this year, I will have completed my master's degree.",
            grammarTip: "'By + future time' signals future perfect.",
            phoneticFocus: "Fast reduction: 'will have' -> /wɪl əv/."
          },
          {
            id: 'al-ch1-2',
            sentence: "They will have lived in London for twenty years by next October.",
            grammarTip: "Duration completed at a specific future benchmark.",
            phoneticFocus: "Blend 'lived in' -> /lɪvd ɪn/."
          },
          {
            id: 'al-ch1-3',
            sentence: "Will the development team have launched the update before Friday?",
            grammarTip: "Future perfect question formation.",
            phoneticFocus: "Crisp articulation on 'development team'."
          },
          {
            id: 'al-ch1-4',
            sentence: "She won't have finished her report before the board meeting begins.",
            grammarTip: "Negative future perfect 'won't have finished'.",
            phoneticFocus: "Contract 'won't have' -> /woʊnt əv/."
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'Future Past',
        grammarFocus: 'Was/were going to, would, was to for past intentions that may have changed.',
        sentences: [
          {
            id: 'al-ch2-1',
            sentence: "I was going to call you yesterday, but my schedule got out of hand.",
            grammarTip: "Unfulfilled past intention.",
            phoneticFocus: "Idiom 'got out of hand' /ɡɒt aʊt əv hænd/."
          },
          {
            id: 'al-ch2-2',
            sentence: "Little did they know that the merger would transform the entire market.",
            grammarTip: "Future in the past with 'would' + inversion.",
            phoneticFocus: "Dramatic pitch shift on 'Little did they know'."
          },
          {
            id: 'al-ch2-3',
            sentence: "We were to meet at noon, but the flight was delayed by heavy snow.",
            grammarTip: "'Were to meet' expresses formal scheduled arrangement in the past.",
            phoneticFocus: "Clear pause between clauses."
          },
          {
            id: 'al-ch2-4',
            sentence: "She thought the project would be straightforward, but it proved challenging.",
            grammarTip: "Past belief about future outcome.",
            phoneticFocus: "'straightforward' pronunciation: /ˌstreɪtˈfɔː.wəd/."
          }
        ]
      },
      {
        chapterNumber: 3,
        title: 'Future Perfect Continuous',
        grammarFocus: 'Will have been + -ing for continuous duration up to a future point.',
        sentences: [
          {
            id: 'al-ch3-1',
            sentence: "By midnight, the developers will have been coding for fourteen hours straight.",
            grammarTip: "Emphasis on continuous duration leading to future point.",
            phoneticFocus: "Contract 'will have been' into one breath: /wɪl əv bɪn/."
          },
          {
            id: 'al-ch3-2',
            sentence: "Next month, our professor will have been teaching here for three decades.",
            grammarTip: "Celebrate long career milestones with future perfect continuous.",
            phoneticFocus: "'decades' /ˈdek.eɪdz/."
          },
          {
            id: 'al-ch3-3',
            sentence: "How long will you have been driving by the time you reach California?",
            grammarTip: "Question form with time clause 'by the time'.",
            phoneticFocus: "Smooth transition into 'California'."
          },
          {
            id: 'al-ch3-4',
            sentence: "They will have been negotiating for weeks without reaching consensus.",
            grammarTip: "Ongoing effort leading up to future milestone.",
            phoneticFocus: "'consensus' stress on second syllable /kənˈsen.səs/."
          }
        ]
      },
      {
        chapterNumber: 4,
        title: 'Advanced Comparisons',
        grammarFocus: 'The... the..., nowhere near as, nowhere near, all the more, so much as.',
        sentences: [
          {
            id: 'al-ch4-1',
            sentence: "The sooner we finalize the proposal, the greater our competitive edge.",
            grammarTip: "Parallel comparative structure: 'The + comp, the + comp'.",
            phoneticFocus: "Balanced cadence on both halves of the sentence."
          },
          {
            id: 'al-ch4-2',
            sentence: "The second prototype is nowhere near as efficient as we had anticipated.",
            grammarTip: "'Nowhere near as... as' expresses a massive difference.",
            phoneticFocus: "Emphasis on 'nowhere near'."
          },
          {
            id: 'al-ch4-3',
            sentence: "His constructive feedback made the team all the more determined to succeed.",
            grammarTip: "'All the more' emphasizes intensification.",
            phoneticFocus: "Link 'all the more' -> /ɔːl ðə mɔːr/."
          },
          {
            id: 'al-ch4-4',
            sentence: "She didn't so much as glance in my direction during the conference.",
            grammarTip: "'Not so much as' = not even.",
            phoneticFocus: "Deliberate stress on 'glance'."
          }
        ]
      },
      {
        chapterNumber: 5,
        title: 'Ellipsis and Substitution',
        grammarFocus: 'Omitting words to avoid repetition (so, do so, neither, one/ones).',
        sentences: [
          {
            id: 'al-ch5-1',
            sentence: "If anyone wishes to voice an objection, they should do so immediately.",
            grammarTip: "'Do so' substitutes for repeating 'voice an objection'.",
            phoneticFocus: "Formal rhetorical rhythm."
          },
          {
            id: 'al-ch5-2',
            sentence: "I asked whether they would support the initiative, and they promised to.",
            grammarTip: "Infinitive ellipsis: omitting the verb after 'to'.",
            phoneticFocus: "Slight stress on the final 'to'."
          },
          {
            id: 'al-ch5-3',
            sentence: "Some investors preferred the original strategy, while others preferred the new one.",
            grammarTip: "'One' substitutes for the singular noun 'strategy'.",
            phoneticFocus: "Contrast stress on 'original' and 'new'."
          },
          {
            id: 'al-ch5-4',
            sentence: "Would you like another cup of espresso? — I'd love one, thank you.",
            grammarTip: "Natural conversational ellipsis in polite answers.",
            phoneticFocus: "Clean contraction: 'I'd love one'."
          }
        ]
      },
      {
        chapterNumber: 6,
        title: 'Inversion in Sentences',
        grammarFocus: 'Negative adverbial inversion (Never, rarely, seldom, hardly, not only).',
        sentences: [
          {
            id: 'al-ch6-1',
            sentence: "Rarely have I witnessed such dedication from an entire group of students.",
            grammarTip: "Inversion: Negative adverb + auxiliary + subject + verb.",
            phoneticFocus: "High initial pitch on 'Rarely have I' dropping down."
          },
          {
            id: 'al-ch6-2',
            sentence: "Not only did she deliver an outstanding pitch, but she also secured funding.",
            grammarTip: "'Not only did + subject + verb... but also'.",
            phoneticFocus: "Rhythmic momentum between both clauses."
          },
          {
            id: 'al-ch6-3',
            sentence: "Under no circumstances should confidential files be removed from this room.",
            grammarTip: "Prepositional negative inversion.",
            phoneticFocus: "Authoritative, deliberate tone."
          },
          {
            id: 'al-ch6-4',
            sentence: "Hardly had we walked through the door when the torrential rain poured down.",
            grammarTip: "'Hardly had... when...' for immediate succession.",
            phoneticFocus: "'torrential' pronunciation: /təˈren.ʃəl/."
          }
        ]
      },
      {
        chapterNumber: 7,
        title: 'Parallel Structures',
        grammarFocus: 'Balancing grammatical forms across clauses for rhetorical elegance.',
        sentences: [
          {
            id: 'al-ch7-1',
            sentence: "Effective leadership requires listening actively, communicating clearly, and deciding decisively.",
            grammarTip: "Parallel gerund + adverb triplets.",
            phoneticFocus: "Three-part ascending musical cadence."
          },
          {
            id: 'al-ch7-2',
            sentence: "The project was praised not for its speed, but for its exceptional precision.",
            grammarTip: "Correlative 'not for X, but for Y'.",
            phoneticFocus: "Balanced weight on 'speed' and 'exceptional precision'."
          },
          {
            id: 'al-ch7-3',
            sentence: "To understand our past is to navigate our future with greater confidence.",
            grammarTip: "Parallel infinitive clauses ('To understand... is to navigate...').",
            phoneticFocus: "Philosophical, measured pace."
          },
          {
            id: 'al-ch7-4',
            sentence: "She excels at analyzing data, identifying patterns, and formulating strategies.",
            grammarTip: "Consistent series of three parallel verb phrases.",
            phoneticFocus: "Clear pause between list items."
          }
        ]
      },
      {
        chapterNumber: 8,
        title: 'Phrasal Verbs with Multiple Prepositions',
        grammarFocus: 'Come up with, put up with, look down on, face up to, get away with.',
        sentences: [
          {
            id: 'al-ch8-1',
            sentence: "Our engineering department must come up with an innovative solution soon.",
            grammarTip: "'Come up with' = invent or produce an idea.",
            phoneticFocus: "Rapid three-word link: /kʌm ˈʌp wɪð/."
          },
          {
            id: 'al-ch8-2',
            sentence: "I simply refuse to put up with such unprofessional conduct any longer.",
            grammarTip: "'Put up with' = tolerate.",
            phoneticFocus: "'put up with' flows as /pʊt ˈʌp wɪð/."
          },
          {
            id: 'al-ch8-3',
            sentence: "It is time for the executive board to face up to the reality of the market.",
            grammarTip: "'Face up to' = confront an unpleasant truth.",
            phoneticFocus: "Emphasis on 'face up to'."
          },
          {
            id: 'al-ch8-4',
            sentence: "We look forward to catching up on all the news once the deadline passes.",
            grammarTip: "'Catch up on' = get up to date with.",
            phoneticFocus: "Smooth conversational cadence."
          }
        ]
      },
      {
        chapterNumber: 9,
        title: 'Advanced Idiomatic Expressions',
        grammarFocus: 'Sophisticated idioms: blessing in disguise, elephant in the room, touch and go.',
        sentences: [
          {
            id: 'al-ch9-1',
            sentence: "Losing that initial client turned out to be a blessing in disguise for our growth.",
            grammarTip: "'Blessing in disguise' = an apparent misfortune with good outcome.",
            phoneticFocus: "Link 'blessing in disguise' -> /ˈbles.ɪŋ ɪn dɪsˈɡaɪz/."
          },
          {
            id: 'al-ch9-2',
            sentence: "Nobody wanted to mention the elephant in the room during the quarterly review.",
            grammarTip: "'Elephant in the room' = an obvious major issue ignored.",
            phoneticFocus: "Natural spoken English rhythm."
          },
          {
            id: 'al-ch9-3',
            sentence: "The surgeon noted that the patient's recovery was touch and go for several hours.",
            grammarTip: "'Touch and go' = uncertain and precarious.",
            phoneticFocus: "'touch and go' hyphenated rhythm."
          },
          {
            id: 'al-ch9-4',
            sentence: "By taking calculated risks, she managed to kill two birds with one stone.",
            grammarTip: "'Kill two birds with one stone' = achieve two things with one action.",
            phoneticFocus: "Flow easily across the full expression."
          }
        ]
      },
      {
        chapterNumber: 10,
        title: 'Revision',
        grammarFocus: 'Mastery review: Inversion, future perfect, and nuanced fluency.',
        sentences: [
          {
            id: 'al-ch10-1',
            sentence: "Seldom have I encountered a student who mastered complex grammar so effortlessly.",
            grammarTip: "Mastery inversion: 'Seldom have I encountered...'.",
            phoneticFocus: "Expressive native cadence."
          },
          {
            id: 'al-ch10-2',
            sentence: "By this time tomorrow, all our hard work will have culminated in great success.",
            grammarTip: "Future perfect + sophisticated vocabulary ('culminated in').",
            phoneticFocus: "'culminated' /ˈkʌl.mɪ.neɪ.tɪd/."
          },
          {
            id: 'al-ch10-3',
            sentence: "Not only must we come up with fresh ideas, but we must also execute them flawlessly.",
            grammarTip: "Inversion paired with multi-preposition phrasal verb.",
            phoneticFocus: "Powerful rhetorical contrast."
          },
          {
            id: 'al-ch10-4',
            sentence: "The more diligently you practice your pronunciation, the more authentic your accent becomes.",
            grammarTip: "The more... the more... parallel structure.",
            phoneticFocus: "Balanced vocal rise and descent."
          }
        ]
      }
    ]
  }
];

import type { GeneratedSet, GeneratedCard } from './types';

type Subject = string;

const subjectKeywords: Record<string, string[]> = {
  Biology: ['cell', 'organ', 'system', 'genetic', 'dna', 'evolution', 'ecosystem', 'photosynthesis', 'respiration', 'mitosis', 'meiosis', 'enzyme', 'protein', 'membrane', 'organelle', 'tissue', 'species', 'organism', 'bacteria', 'virus'],
  Chemistry: ['atom', 'molecule', 'reaction', 'acid', 'base', 'compound', 'element', 'periodic', 'bond', 'oxidation', 'reduction', 'solution', 'concentration', 'catalyst', 'polymer', 'ion', 'covalent', 'ionic', 'mole', 'ph'],
  Physics: ['force', 'energy', 'motion', 'velocity', 'acceleration', 'mass', 'gravity', 'wave', 'frequency', 'wavelength', 'quantum', 'momentum', 'friction', 'magnetism', 'electricity', 'circuit', 'voltage', 'current', 'thermodynamics', 'nuclear'],
  History: ['war', 'revolution', 'empire', 'dynasty', 'treaty', 'colonial', 'independence', 'constitution', 'president', 'king', 'battle', 'civilization', 'ancient', 'medieval', 'renaissance', 'enlightenment', 'democracy', 'congress', 'parliament', 'dynasty'],
  French: ['french', 'vocab', 'français', 'conjugat', 'le ', 'la ', 'les ', 'un ', 'une ', 'etre', 'avoir', 'aller', 'faire', 'mot', 'grammaire', 'adjectif', 'verbe', 'nom', 'article', 'pronom'],
  Spanish: ['spanish', 'español', 'vocab', 'el ', 'la ', 'los ', 'las ', 'un ', 'una ', 'ser', 'estar', 'tener', 'ir', 'hacer', 'palabra', 'gramática', 'verbo', 'sustantivo', 'conjugu', 'adjetivo'],
  Math: ['equation', 'function', 'derivative', 'integral', 'matrix', 'vector', 'theorem', 'algebra', 'geometry', 'calculus', 'polynomial', 'fraction', 'exponent', 'logarithm', 'trigonometry', 'probability', 'statistics', 'graph', 'slope', 'factor'],
  'Computer Science': ['algorithm', 'variable', 'function', 'loop', 'array', 'string', 'boolean', 'class', 'object', 'method', 'database', 'sql', 'python', 'javascript', 'compiler', 'binary', 'byte', 'recursion', 'pointer', 'hash'],
  English: ['metaphor', 'simile', 'theme', 'character', 'plot', 'narrative', 'poem', 'stanza', 'sonnet', 'alliteration', 'imagery', 'symbolism', 'irony', 'foreshadowing', 'protagonist', 'antagonist', 'climax', 'genre', 'rhetoric', 'thesis'],
  Geography: ['continent', 'ocean', 'climate', 'mountain', 'river', 'desert', 'population', 'urban', 'rural', 'latitude', 'longitude', 'tectonic', 'erosion', 'weather', 'biome', 'hemisphere', 'equator', 'plateau', 'glacier', 'valley'],
};

function detectSubject(input: string): Subject {
  const lower = input.toLowerCase();
  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return subject;
    }
  }
  // Check if subject is explicitly mentioned
  for (const subject of Object.keys(subjectKeywords)) {
    if (lower.includes(subject.toLowerCase())) {
      return subject;
    }
  }
  return 'General';
}

function extractTitle(input: string): string {
  // If input is short (a topic), use it as title
  const trimmed = input.trim();
  if (trimmed.length < 80 && !trimmed.includes('\n')) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  // Try to find a title-like first line
  const firstLine = trimmed.split('\n').find((l) => l.trim().length > 0);
  if (firstLine && firstLine.length < 100) {
    return firstLine.trim().replace(/^#+\s*/, '').replace(/^["']|["']$/g, '');
  }
  return trimmed.slice(0, 60) + (trimmed.length > 60 ? '...' : '');
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
}

function extractKeyTerms(text: string): { term: string; context: string }[] {
  const sentences = splitIntoSentences(text);
  const terms: { term: string; context: string }[] = [];

  // Pattern 1: "Term: definition" or "Term - definition"
  for (const sentence of sentences) {
    const colonMatch = sentence.match(/^([A-Z][^:]{2,40}):\s*(.+)/);
    if (colonMatch) {
      terms.push({ term: colonMatch[1].trim(), context: colonMatch[2].trim() });
      continue;
    }
    const dashMatch = sentence.match(/^([A-Z][^-]{2,40})\s+[–-]\s*(.+)/);
    if (dashMatch) {
      terms.push({ term: dashMatch[1].trim(), context: dashMatch[2].trim() });
      continue;
    }
    // Pattern 2: "Term is/are/refers to definition"
    const isMatch = sentence.match(/^([A-Z][a-z]+(?:\s+[a-z]+)?)\s+(?:is|are|refers to|means|describes|is defined as)\s+(.+)/i);
    if (isMatch) {
      terms.push({ term: isMatch[1].trim(), context: sentence });
      continue;
    }
  }

  // Pattern 3: Important capitalized phrases
  if (terms.length < 5) {
    for (const sentence of sentences) {
      const capMatches = sentence.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
      for (const match of capMatches) {
        const term = match[1];
        if (term.length > 3 && !['The', 'This', 'These', 'That', 'Those', 'When', 'What', 'Where', 'Which', 'How', 'Why', 'An', 'In', 'It', 'They', 'He', 'She'].includes(term)) {
          if (!terms.some((t) => t.term.toLowerCase() === term.toLowerCase())) {
            terms.push({ term, context: sentence });
          }
        }
      }
    }
  }

  return terms;
}

// Topic-based generation with built-in knowledge
const topicKnowledge: Record<string, GeneratedCard[]> = {
  'french unit 3 vocab': [
    { front: "La nourriture", back: "Food. Refers to what is eaten for meals. Example: 'J'aime la nourriture française' (I love French food)." },
    { front: "L'école", back: "School. The place where students go to learn. Example: 'Je vais à l'école à huit heures' (I go to school at eight o'clock)." },
    { front: "Les devoirs", back: "Homework/Assignments. Tasks assigned by teachers to be completed at home. Example: 'Je fais mes devoirs le soir' (I do my homework in the evening)." },
    { front: "Le professeur", back: "Teacher/Professor. The person who teaches at a school or university. Example: 'Mon professeur est très patient' (My teacher is very patient)." },
    { front: "L'étudiant / L'étudiante", back: "Student (masculine/feminine). A person who studies at a school. Example: 'Elle est étudiante en médecine' (She is a medical student)." },
    { front: "La bibliothèque", back: "Library. A place where books are kept for reading and borrowing. Example: 'J'étudie à la bibliothèque' (I study at the library)." },
    { front: "L'examen", back: "Exam/Test. A formal assessment of a student's knowledge. Example: 'J'ai un examen demain' (I have an exam tomorrow)." },
    { front: "Le cahier", back: "Notebook. A bound book used for writing notes. Example: 'J'écris dans mon cahier' (I write in my notebook)." },
    { front: "La classe", back: "Class/Classroom. Can refer to the group of students or the room itself. Example: 'La classe commence à neuf heures' (Class starts at nine o'clock)." },
    { front: "Apprendre", back: "To learn. A regular -re verb. Example: 'J'apprends le français depuis deux ans' (I've been learning French for two years)." },
    { front: "Le stylo", back: "Pen. Writing instrument. Example: 'Prête-moi ton stylo, s'il te plaît' (Lend me your pen, please)." },
    { front: "Le livre", back: "Book. A written or printed work consisting of pages. Example: 'Ce livre est très intéressant' (This book is very interesting)." },
  ],
  'human digestive system': [
    { front: "Mouth (Oral Cavity)", back: "The entry point of the digestive system where mechanical digestion (chewing) and chemical digestion (saliva with amylase) begin breaking down food." },
    { front: "Esophagus", back: "A muscular tube connecting the mouth to the stomach. Uses peristalsis (wave-like muscle contractions) to push food downward." },
    { front: "Stomach", back: "A J-shaped organ that secretes gastric acid (HCl) and pepsin to break down food into chyme. Protein digestion primarily occurs here." },
    { front: "Small Intestine", back: "The longest part of the digestive tract (~6 meters) where most nutrient absorption occurs. Divided into duodenum, jejunum, and ileum." },
    { front: "Large Intestine (Colon)", back: "Absorbs water and electrolytes from remaining food matter. Houses gut bacteria that produce vitamins. Forms and stores feces." },
    { front: "Liver", back: "Produces bile, which emulsifies fats in the small intestine. Also detoxifies blood and processes absorbed nutrients." },
    { front: "Pancreas", back: "Secretes digestive enzymes (amylase, lipase, proteases) into the small intestine. Also produces insulin for blood sugar regulation." },
    { front: "Gallbladder", back: "Stores and concentrates bile produced by the liver, releasing it into the small intestine when fat is present." },
    { front: "Villi", back: "Tiny finger-like projections lining the small intestine that dramatically increase surface area for nutrient absorption into the bloodstream." },
    { front: "Peristalsis", back: "Involuntary wave-like muscle contractions that move food through the digestive tract from esophagus to rectum." },
  ],
  'biology human organs': [
    { front: "Heart", back: "A muscular organ that pumps blood throughout the body via the circulatory system. Has four chambers: left/right atria and left/right ventricles." },
    { front: "Lungs", back: "Paired organs responsible for gas exchange — taking in oxygen and releasing carbon dioxide. Contains millions of alveoli for surface area." },
    { front: "Brain", back: "The central organ of the nervous system. Controls thoughts, memory, movement, and vital functions. Divided into cerebrum, cerebellum, and brainstem." },
    { front: "Liver", back: "The largest internal organ. Performs over 500 functions including detoxification, protein synthesis, and bile production." },
    { front: "Kidneys", back: "Paired organs that filter blood to produce urine, regulate blood pressure, and maintain electrolyte balance. Each contains ~1 million nephrons." },
    { front: "Skin", back: "The body's largest organ. Provides protection, regulates temperature, and contains sensory receptors. Has three layers: epidermis, dermis, hypodermis." },
    { front: "Stomach", back: "A muscular organ that digests food using acid and enzymes. Can hold about 1 liter of food and expands when eating." },
    { front: "Spleen", back: "Part of the lymphatic system. Filters blood, recycles old red blood cells, and supports immune function." },
    { front: "Small Intestine", back: "Where most nutrient absorption occurs. Its inner surface area is ~30 square meters due to villi and microvilli." },
    { front: "Pancreas", back: "Produces digestive enzymes and hormones (insulin, glucagon) that regulate blood sugar." },
  ],
};

function generateFromTopic(topic: string): GeneratedCard[] {
  const key = topic.toLowerCase().trim();
  // Check for exact match
  if (topicKnowledge[key]) {
    return topicKnowledge[key];
  }
  // Check for partial match
  for (const [k, cards] of Object.entries(topicKnowledge)) {
    if (key.includes(k) || k.includes(key)) {
      return cards;
    }
  }

  // Generate generic cards from the topic name
  const subjectCard: GeneratedCard[] = [
    { front: `What is ${topic}?`, back: `${topic.charAt(0).toUpperCase() + topic.slice(1)} is a key topic of study. Understanding its fundamental principles, key components, and real-world applications is essential for mastery.` },
    { front: `Key concept of ${topic}`, back: `The primary concept in ${topic} involves understanding the core principles and how they relate to each other within the broader subject area.` },
    { front: `${topic} — Important terminology`, back: `Studying ${topic} requires familiarity with its specialized vocabulary and terminology, which forms the foundation for deeper understanding.` },
    { front: `Real-world application of ${topic}`, back: `${topic.charAt(0).toUpperCase() + topic.slice(1)} has practical applications in everyday life, industry, and scientific research, making it relevant beyond the classroom.` },
    { front: `Common misconceptions about ${topic}`, back: `When studying ${topic}, students often confuse related concepts. Understanding the distinctions between them is crucial for accurate comprehension.` },
  ];
  return subjectCard;
}

function generateFromText(text: string): GeneratedCard[] {
  const terms = extractKeyTerms(text);
  const cards: GeneratedCard[] = [];

  for (const { term, context } of terms.slice(0, 20)) {
    // Create a question front and an answer back
    const front = term;
    let back = context;

    // If the context starts with the term and a separator, just use the rest
    const afterTerm = context.match(new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:–-]?\\s*(.+)`, 'i'));
    if (afterTerm) {
      back = afterTerm[1];
    } else {
      // Otherwise, frame it as a definition
      back = `${term} — ${context}`;
    }

    cards.push({
      front: front.charAt(0).toUpperCase() + front.slice(1),
      back: back.charAt(0).toUpperCase() + back.slice(1),
    });
  }

  // If we didn't extract enough terms, fall back to sentence-based Q&A
  if (cards.length < 3) {
    const sentences = splitIntoSentences(text);
    for (const sentence of sentences.slice(0, 10)) {
      const words = sentence.split(' ');
      if (words.length < 3) continue;
      // Use key word as front
      const keyWord = words.find((w) => w.length > 5 && /^[A-Z]/.test(w)) || words[0];
      cards.push({
        front: keyWord,
        back: sentence,
      });
    }
  }

  return cards.slice(0, 20);
}

function generateSummary(cards: GeneratedCard[], sourceInput: string): string[] {
  const summary: string[] = [];

  if (cards.length === 0) return summary;

  // Build summary from the front of cards
  summary.push(`This set covers ${cards.length} key concepts from the ${detectSubject(sourceInput)} subject area.`);
  summary.push(`Topics include: ${cards.slice(0, 5).map((c) => c.front).join(', ')}${cards.length > 5 ? ', and more.' : '.'}`);
  summary.push(`Use the flashcards mode for active recall, then test yourself with the quiz for maximum retention.`);

  return summary;
}

export function generateStudySet(input: string, sourceType: 'topic' | 'text' = 'topic'): GeneratedSet {
  const subject = detectSubject(input);
  const title = extractTitle(input);

  let cards: GeneratedCard[];
  if (sourceType === 'text' && input.length > 100) {
    cards = generateFromText(input);
    // If text generation yields too few, supplement with topic-based
    if (cards.length < 3) {
      cards = generateFromTopic(title);
    }
  } else {
    cards = generateFromTopic(input);
  }

  const summary = generateSummary(cards, input);

  return {
    title,
    description: `AI-generated study set covering ${title.toLowerCase()}. Contains ${cards.length} flashcards with key terms and definitions.`,
    subject,
    summary,
    cards,
  };
}

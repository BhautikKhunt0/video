// Script reverse-engineered from the reference narration (timed captions).
// Voice-over is re-synthesised in-browser; nothing from the original audio is reused.

export interface Cue {
  start: number;
  end: number;
  text: string;
}

export const DURATION = 128;

export const CUES: Cue[] = [
  { start: 0.0, end: 3.5, text: "There's one idea in physics that almost everyone gets wrong." },
  { start: 3.6, end: 9.4, text: 'Students get it wrong, teachers sometimes get it wrong, even scientists argued about it for nearly a hundred years.' },
  { start: 9.8, end: 11.3, text: "It's called entropy," },
  { start: 11.4, end: 17.4, text: "and you've probably heard the simple version. Entropy means disorder, messy rooms, broken glass, things falling apart." },
  { start: 17.7, end: 22.3, text: 'But that explanation is so incomplete that it actually hides the most amazing part.' },
  { start: 22.4, end: 27.6, text: "Because entropy isn't really about mess, it's about counting. It's about chance." },
  { start: 27.8, end: 36.3, text: "And once you truly understand it, you'll see why your coffee always cools down, why you can't unscramble an egg, and why time itself seems to move in only one direction." },
  { start: 36.5, end: 42.6, text: "By the end of this video, you'll understand entropy better than most people who studied it in school. Let's start." },
  { start: 43.2, end: 48.4, text: "Here's why this matters. Entropy isn't some small rule tucked away in a textbook." },
  { start: 48.5, end: 52.6, text: "It's one of the few laws in physics that scientists treat as almost unbreakable." },
  { start: 52.7, end: 58.8, text: 'The famous astronomer Arthur Eddington once said that if your theory goes against this law, there is no hope for it.' },
  { start: 59.0, end: 64.2, text: 'This law says that in a closed system, total entropy never goes down. It stays the same, or it goes up.' },
  { start: 64.4, end: 66.6, text: "That's it. One simple sentence." },
  { start: 66.8, end: 71.6, text: 'The word entropy was invented in 1865 by a German physicist named Rudolf Clausius.' },
  { start: 71.8, end: 79.2, text: 'He was studying steam engines and wanted to know why no engine could ever turn all of its heat into motion. Some heat always seemed to slip away.' },
  { start: 79.3, end: 82.6, text: 'That missing heat turned out to be a clue to something much bigger.' },
  { start: 82.8, end: 91.5, text: 'But that one sentence decides why engines can never be perfectly efficient, why your phone gets warm, why stars burn out, and how the entire universe will end.' },
  { start: 91.8, end: 97.4, text: 'So, if we want to understand the universe, we need to understand entropy. And to do that, we first need to get rid of the idea most of us were taught.' },
  { start: 97.6, end: 99.8, text: 'Most of us learned entropy like this.' },
  { start: 99.9, end: 104.2, text: 'Imagine your bedroom. If you clean it and then just live in it for a week, it gets messy again.' },
  { start: 104.3, end: 106.2, text: 'Clothes end up on the floor.' },
  { start: 106.4, end: 110.6, text: 'Books pile up. Nobody has to try to make it messy. It just happens.' },
  { start: 110.8, end: 115.3, text: `And the textbook says, "That's entropy. Things naturally go from order to disorder."` },
  { start: 115.6, end: 119.5, text: "Now, this isn't completely wrong, but it creates a big problem because messy is a human idea." },
  { start: 119.6, end: 121.4, text: 'Is a pile of clothes on a chair messy?' },
  { start: 121.6, end: 124.9, text: 'To you, maybe. To your mom, definitely.' },
  { start: 125.4, end: 127.5, text: 'To the clothes, it means nothing.' },
];

export interface Chunk {
  start: number;
  end: number;
  words: string[];
}

// Break each cue into short subtitle chunks (<= 9 words), timed proportionally to letters.
export const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  for (const c of CUES) {
    const words = c.text.split(/\s+/);
    const groups: string[][] = [];
    let cur: string[] = [];
    for (const w of words) {
      cur.push(w);
      const endsSentence = /[.,?!]$/.test(w);
      if (cur.length >= 9 || (endsSentence && cur.length >= 4)) {
        groups.push(cur);
        cur = [];
      }
    }
    if (cur.length) {
      if (cur.length < 3 && groups.length) groups[groups.length - 1].push(...cur);
      else groups.push(cur);
    }
    const total = groups.reduce((s, g) => s + g.join(' ').length, 0);
    let t = c.start;
    for (const g of groups) {
      const d = ((c.end - c.start) * g.join(' ').length) / total;
      out.push({ start: t, end: t + d, words: g });
      t += d;
    }
  }
  return out;
})();

export interface Chapter {
  start: number;
  title: string;
}
export const CHAPTERS: Chapter[] = [
  { start: 0, title: 'The common misconception' },
  { start: 43, title: 'Defining the second law' },
  { start: 98, title: 'Entropy as probability' },
];

import type { ComponentType } from 'react';
import type { SceneProps } from './kit';
import { SceneCoffee, SceneCounting, SceneDisorder, SceneEgg, SceneParticleWord, SceneTimeArrow, SceneWrong } from './Scenes1';
import { SceneClausius, SceneClosedSystem, SceneEddington, SceneFormula, SceneTextbook, SceneUnbreakable } from './Scenes2';
import { SceneClue, SceneConsequences, SceneEngine, SceneWordmark } from './Scenes3';
import { SceneBedroom, SceneChair, SceneHumanIdea, SceneOrderDisorder } from './Scenes4';

export interface SceneDef {
  id: string;
  name: string;
  start: number;
  end: number;
  Comp: ComponentType<SceneProps>;
  color: string;
}

const mk = (id: string, name: string, start: number, end: number, Comp: ComponentType<SceneProps>, color: string): SceneDef => ({ id, name, start, end, Comp, color });

export const SCENES: SceneDef[] = [
  mk('wrong', 'One idea everyone gets wrong', 0, 9.4, SceneWrong, '#ff4d6d'),
  mk('word', 'ENTROPY (particle reveal)', 9.4, 12.1, SceneParticleWord, '#22e5ff'),
  mk('disorder', 'entropy = disorder?', 11.8, 22.4, SceneDisorder, '#ff8a3d'),
  mk('counting', 'Entropy is counting', 22.4, 27.7, SceneCounting, '#22e5ff'),
  mk('coffee', 'Why coffee cools', 27.7, 31.4, SceneCoffee, '#ff8a3d'),
  mk('egg', "Can't unscramble an egg", 31.4, 33.7, SceneEgg, '#ffe14a'),
  mk('time', 'The arrow of time', 33.7, 36.4, SceneTimeArrow, '#22e5ff'),
  mk('formula', 'S = k log W', 36.4, 43.0, SceneFormula, '#ff3df2'),
  mk('textbook', 'Not a small textbook rule', 43.0, 48.6, SceneTextbook, '#ffe14a'),
  mk('unbreakable', 'Almost unbreakable', 48.6, 52.7, SceneUnbreakable, '#ffe14a'),
  mk('eddington', 'Arthur Eddington', 52.7, 58.9, SceneEddington, '#22e5ff'),
  mk('closed', 'Closed system: ΔS ≥ 0', 58.9, 66.6, SceneClosedSystem, '#5dff9a'),
  mk('clausius', '1865 · Rudolf Clausius', 66.6, 71.7, SceneClausius, '#ffe14a'),
  mk('engine', 'Steam engines & lost heat', 71.7, 79.2, SceneEngine, '#ff8a3d'),
  mk('clue', 'A clue to something bigger', 79.2, 82.7, SceneClue, '#22e5ff'),
  mk('conseq', 'Engines · phones · stars · universe', 82.7, 91.7, SceneConsequences, '#9a7bff'),
  mk('wordmark', 'Unlearn the old idea', 91.7, 97.5, SceneWordmark, '#ff3df2'),
  mk('bedroom', 'The bedroom: Day 1 → Day 7', 97.5, 110.8, SceneBedroom, '#ff3df2'),
  mk('order', 'Order → disorder', 110.8, 115.5, SceneOrderDisorder, '#ff8a3d'),
  mk('human', 'Messy is a human idea', 115.5, 119.6, SceneHumanIdea, '#ff3df2'),
  mk('chair', 'Is a pile of clothes messy?', 119.6, 128, SceneChair, '#9a7bff'),
];

export const sceneIndexAt = (t: number) => {
  for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].start) return i;
  return 0;
};

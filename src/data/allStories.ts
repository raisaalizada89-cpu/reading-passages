import { StoryWork } from '../types/literature';
import { STORIES } from './stories';
import { STORIES_B1 } from './storiesB1';
import { STORIES_B2 } from './storiesB2';
import { STORIES_C1 } from './storiesC1';
import { STORIES_C2 } from './storiesC2';

export const ALL_STORIES: StoryWork[] = [
  ...STORIES.filter((s) => s.level === 'B1'),
  ...STORIES_B1,
  ...STORIES.filter((s) => s.level === 'B2'),
  ...STORIES_B2,
  ...STORIES.filter((s) => s.level === 'C1'),
  ...STORIES_C1,
  ...STORIES.filter((s) => s.level === 'C2'),
  ...STORIES_C2,
];

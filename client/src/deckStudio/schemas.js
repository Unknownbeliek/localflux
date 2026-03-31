import { z } from 'zod';

function isValidImageReference(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return true;

  // Accept absolute URLs, root-relative paths, and simple deck asset names.
  return (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith('/') ||
    !trimmed.includes(' ')
  );
}

export const SlideSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().trim().min(1, 'Prompt is required.'),
  options: z.array(z.string().trim().min(1, 'All 4 answer options are required.')).length(4),
  correctIndex: z.number().int().min(0).max(3),
  imageUrl: z.string().trim().refine(isValidImageReference, {
    message: 'Image reference must be an absolute URL or a local image path.',
  }),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('easy'),
});

export const DeckSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, 'Deck title is required.'),
  version: z.string().trim().min(1),
  slides: z.array(SlideSchema).min(1, 'At least one slide is required.'),
  updatedAt: z.number(),
}).superRefine((deck, ctx) => {
  const ids = new Set();
  deck.slides.forEach((slide, index) => {
    if (ids.has(slide.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['slides', index, 'id'],
        message: 'Slide ID must be unique.',
      });
    }
    ids.add(slide.id);
  });
});

export function toDeckErrors(error) {
  const bySlide = {};
  const global = [];

  error.issues.forEach((issue) => {
    const [root, index, field] = issue.path;
    if (root === 'slides' && typeof index === 'number') {
      bySlide[index] = bySlide[index] || {};
      const key = typeof field === 'string' ? field : 'slide';
      bySlide[index][key] = issue.message;
    } else {
      global.push(issue.message);
    }
  });

  return { bySlide, global };
}

import { z } from 'zod';

export const updateProfile = z.object({
  name: z.string().optional(),
  displayName: z.string().optional(),
});

import { z } from 'zod';

export const updateProfile = z.object({
  name: z.string().optional(),
  displayName: z.string().optional(),
});

export const listAll = z
  .object({
    cursor: z.string().nullish(),
  })
  .optional();

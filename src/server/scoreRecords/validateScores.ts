import { Prisma } from '@prisma/client';
import { z } from 'zod';
import schema from '../../protocol/schema';
import { getNumPlayers } from '../../utils/gameModes';
import { sumTableScores } from '../../utils/scoring';
import { TRPCError } from '@trpc/server';

export type MatchScoreValidationArgs = Prisma.RulesetGetPayload<{
  select: { gameMode: true; startPts: true };
}>;

export default function validateMatchScoreSum(
  { gameMode, startPts }: MatchScoreValidationArgs,
  input: z.infer<typeof schema.match.record>,
): number[] {
  const numPlayers = getNumPlayers(gameMode);

  if (input.players.length !== numPlayers) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Incorrect number of players',
    });
  }

  const scores = input.players.map(({ score }) => score);
  if (sumTableScores(scores, input.leftoverBets) !== startPts * numPlayers) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Total score does not add up',
    });
  }

  return scores;
}

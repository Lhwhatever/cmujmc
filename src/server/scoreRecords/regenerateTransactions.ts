import { Prisma, PrismaClient } from '@prisma/client';
import * as runtime from '@prisma/client/runtime/library';
import { CurrentMatch } from './types';
import { computePlacements, computeTransactions } from '../../utils/scoring';
import { z } from 'zod';
import schema from '../../protocol/schema';

export interface RegenerateTransactionsOpts {
  leagueId: number;
  time: Date;
  input: z.infer<typeof schema.match.editMatch>;
  currMatch: CurrentMatch;
  updatedUserMatches: Prisma.UserMatchGetPayload<Prisma.UserMatchDefaultArgs>[];
  placements: ReturnType<typeof computePlacements>;
}

export default async function regenerateTransactions<
  Prisma extends Omit<PrismaClient, runtime.ITXClientDenyList>,
>(
  tx: Prisma,
  {
    leagueId,
    time,
    input,
    currMatch,
    updatedUserMatches,
    placements,
  }: RegenerateTransactionsOpts,
): Promise<Set<string>> {
  const playersWithNewTxns = new Set<string>();

  // delete all transactions
  await tx.userLeagueTransaction.deleteMany({
    where: {
      userMatchMatchId: input.matchId,
    },
  });

  const { chomboDelta } = currMatch.ruleset;
  const uma = currMatch.ruleset.uma.map(({ value }) => value);

  const txnsToCreate: Prisma.UserLeagueTransactionCreateManyInput[] = [];

  // compute new transactions
  for (const { playerId, playerPosition, rawScore } of updatedUserMatches) {
    const inputPlayer = input.players[playerPosition - 1];

    txnsToCreate.push(
      ...computeTransactions({
        playerId,
        matchId: input.matchId,
        playerPosition,
        leagueId,
        time,
        chombos: inputPlayer.chombos ?? [],
        chomboDelta,
        rawScore: rawScore ?? inputPlayer.score,
        returnPts: currMatch.ruleset.returnPts,
        uma,
        ...placements[playerPosition - 1],
      }),
    );

    if (playerId !== null) playersWithNewTxns.add(playerId);
  }

  await tx.userLeagueTransaction.createMany({ data: txnsToCreate });
  return playersWithNewTxns;
}

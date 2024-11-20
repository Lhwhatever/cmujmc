import { createCache } from 'cache-manager';
import { Keyv } from 'keyv';
import { CacheableMemory } from 'cacheable';
import computeLeaderboard, { Leaderboard } from './computeLeaderboard';

const leaderboardCache = createCache({
  stores: [
    new Keyv({
      store: new CacheableMemory({ lruSize: 1024 }),
    }),
  ],
});

const leaderboardKey = (leagueId: number) => `leaderboard/${leagueId}`;

export const setLeaderboard = async (
  leagueId: number,
  leaderboard: Leaderboard,
) => leaderboardCache.set(leaderboardKey(leagueId), leaderboard);

export const getLeaderboard = async (leagueId: number) =>
  leaderboardCache.wrap(leaderboardKey(leagueId), () =>
    computeLeaderboard(leagueId),
  );

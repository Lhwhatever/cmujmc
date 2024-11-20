import { EventEmitter } from 'node:events';
import computeLeaderboard from './computeLeaderboard';
import { setLeaderboard } from './leaderboard';

export class LeaderboardWorker {
  readonly leagueId: number;
  readonly eventEmitter: EventEmitter;
  lastUpdated: Date;

  constructor(leagueId: number) {
    this.leagueId = leagueId;
    this.eventEmitter = new EventEmitter();
    this.lastUpdated = new Date();

    this.eventEmitter.on('markStale', () => {
      void (async () => {
        const leaderboard = await computeLeaderboard(this.leagueId);
        this.lastUpdated = leaderboard.lastUpdated;
        return setLeaderboard(this.leagueId, leaderboard);
      })();
    });
  }
}

const workers: Record<number, LeaderboardWorker> = {};

const getWorker = (leagueId: number) => {
  if (!(leagueId in workers)) {
    workers[leagueId] = new LeaderboardWorker(leagueId);
  }
  return workers[leagueId];
};

export const markStale = (leagueId: number) => {
  getWorker(leagueId).eventEmitter.emit('markStale');
};

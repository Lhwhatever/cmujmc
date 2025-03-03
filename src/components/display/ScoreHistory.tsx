import React from 'react';
import { RouterOutputs, trpc } from '../../utils/trpc';
import Loading from '../Loading';
import { TransactionType } from '@prisma/client';
import DateTime from '../DateTime';
import { DateTimeFormatOptions, useFormatter } from 'next-intl';
import PlacementRange from './PlacementRange';
import { renderPlayerName } from '../../utils/usernames';
import { useSession } from 'next-auth/react';
import clsx from 'clsx';
import Decimal from 'decimal.js';

type Match = NonNullable<
  RouterOutputs['leagues']['scoreHistory']['txns'][number]['match']
>;

export interface MatchResultProps {
  match: Match;
}

const MatchResult = ({ match }: MatchResultProps) => {
  const userId = useSession().data?.user?.id;
  const { players } = match;
  const formatter = useFormatter();
  return (
    <div className="grid grid-cols-[4rem_1fr_4rem] sm:grid-cols-[repeat(2,_4rem_1fr_4rem)] lg:grid-cols-[repeat(4,_4rem_1fr_4rem)] gap-1 mt-2 text-sm">
      {players.map(
        ({
          playerPosition,
          playerId,
          player,
          unregisteredPlaceholder,
          placementMin,
          placementMax,
          rawScore,
        }) => {
          return (
            <React.Fragment key={playerPosition}>
              <div>
                <PlacementRange min={placementMin} max={placementMax} />
              </div>
              <div className={clsx(userId === playerId && 'font-bold')}>
                {renderPlayerName({ player, unregisteredPlaceholder })}
              </div>
              <div className={clsx(userId === playerId && 'font-bold')}>
                {rawScore !== null ? formatter.number(rawScore) : '???'}
              </div>
            </React.Fragment>
          );
        },
      )}
    </div>
  );
};

const timeFormat: DateTimeFormatOptions = {
  dateStyle: 'short',
  timeStyle: 'short',
};

export interface ScoreHistoryProps {
  leagueId: number;
}

export default function ScoreHistory({ leagueId }: ScoreHistoryProps) {
  const query = trpc.leagues.scoreHistory.useQuery(leagueId);
  if (query.isLoading || query.data === undefined) {
    return <Loading />;
  }

  const { txns } = query.data;

  return (
    <div className="flex flex-col gap-2">
      {txns.map(({ id, delta, time, description, type, match }) => {
        return (
          <div key={id} className="flex flex-col rounded-xl shadow p-4 gap-1">
            <div className="flex flex-row justify-between gap-1">
              <div className="flex flex-col">
                <div className="text-sm">
                  {type === TransactionType.INITIAL && 'Joined Scoreboard'}
                  {type === TransactionType.OTHER_MOD &&
                    (description ?? 'Modification')}
                  {type === TransactionType.CHOMBO && `Chombo: ${description}`}
                  {type === TransactionType.MATCH_RESULT && 'Played Match'}
                </div>
                <div className="text-xs text-black/50">
                  <DateTime date={time} format={timeFormat} />
                </div>
              </div>
              <div className="text-2xl">{new Decimal(delta).toFixed(1)} PT</div>
            </div>
            {type === TransactionType.MATCH_RESULT && (
              <MatchResult match={match} />
            )}
          </div>
        );
      })}
    </div>
  );
}

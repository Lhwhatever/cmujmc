import { trpc } from '../../utils/trpc';
import Table, { TableCell, TableHeading, TableRow } from '../Table';
import { Placement } from './PlacementRange';
import Decimal from 'decimal.js';
import DateTime from '../DateTime';
import { useFormatter } from 'next-intl';
import { renderAliases } from '../../utils/usernames';
import { useSession } from 'next-auth/react';
import clsx from 'clsx';
import { Suspense, useEffect } from 'react';

export interface LeaderboardProps {
  leagueId: number;
}

const LeaderboardContents = ({ leagueId }: LeaderboardProps) => {
  const userId = useSession().data?.user?.id;
  const [{ lastUpdated, users }, query] =
    trpc.leagues.leaderboard.useSuspenseQuery({
      leagueId,
    });

  const isStaleQuery = trpc.leagues.isLeaderboardStale.useQuery(
    { leagueId, lastUpdated },
    {
      refetchInterval: 60000,
    },
  );

  useEffect(() => {
    if (isStaleQuery.data) {
      void query.refetch();
    }
  }, [isStaleQuery.data, query]);

  const formatter = useFormatter();

  return (
    <Table
      head={
        <TableRow>
          <TableHeading scope="col" className="w-16">
            Rank
          </TableHeading>
          <TableHeading scope="col">Name</TableHeading>
          <TableHeading scope="col" className="w-16 sm:w-auto">
            PT
          </TableHeading>
          <TableHeading scope="col" className="w-20 sm:w-auto">
            Matches
          </TableHeading>
          <TableHeading scope="col" className="hidden sm:table-cell">
            Firsts
          </TableHeading>
          <TableHeading scope="col" className="hidden sm:table-cell">
            High Score
          </TableHeading>
        </TableRow>
      }
      className="mb-4"
      caption={
        <div>
          Last updated <DateTime date={new Date(lastUpdated)} relative />
        </div>
      }
    >
      {users.map(({ user, rank, agg }) => (
        <TableRow
          key={user.id}
          className={clsx(user.id === userId && 'font-bold')}
        >
          <TableCell>
            {rank === undefined ? '\u2014' : <Placement placement={rank} />}
          </TableCell>
          <TableCell className="flex flex-col">
            <div>{renderAliases(user.name, user)}</div>
            <div className="font-normal italic text-xs">
              <DateTime date={new Date(agg.lastActivityDate)} relative />
            </div>
          </TableCell>
          <TableCell>{new Decimal(agg.score).toFixed(1)}</TableCell>
          <TableCell>{formatter.number(agg.numMatches)}</TableCell>
          <TableCell className="hidden sm:table-cell">
            {formatter.number(agg.placements.get(1) ?? 0)}
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            {agg.highscore === null
              ? '\u2014'
              : formatter.number(agg.highscore)}
          </TableCell>
        </TableRow>
      ))}
    </Table>
  );
};

export default function Leaderboard({ leagueId }: LeaderboardProps) {
  return (
    <Suspense>
      <LeaderboardContents leagueId={leagueId} />
    </Suspense>
  );
}

import React from 'react';
import { trpc } from '../../utils/trpc';
import Loading from '../Loading';
import Table, { TableCell, TableHeading, TableRow } from '../Table';
import { Placement } from './PlacementRange';
import Decimal from 'decimal.js';
import DateTime from '../DateTime';
import { useFormatter } from 'next-intl';
import { renderAliases } from '../../utils/usernames';
import { useSession } from 'next-auth/react';
import clsx from 'clsx';

export type LeaderboardProps = {
  leagueId: number;
};

export default function Leaderboard({ leagueId }: LeaderboardProps) {
  const userId = useSession().data?.user?.id;
  const query = trpc.leagues.leaderboard.useQuery({ leagueId });
  const formatter = useFormatter();
  if (query.isLoading || query.data === undefined) {
    return <Loading />;
  }

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
      caption={
        <span>
          Last updated{' '}
          <DateTime
            date={new Date(query.data.lastUpdated)}
            format={{ dateStyle: 'short', timeStyle: 'medium' }}
          />
        </span>
      }
      className="mb-4"
    >
      {query.data.users.map(({ user, rank, agg }) => (
        <TableRow
          key={user.id}
          className={clsx(user.id === userId && 'font-bold')}
        >
          <TableCell>
            {rank === undefined ? '\u2014' : <Placement placement={rank} />}
          </TableCell>
          <TableCell>{renderAliases(user.name, user)}</TableCell>
          <TableCell>{new Decimal(agg.score).toFixed(1)}</TableCell>
          <TableCell>{formatter.number(agg.numMatches)}</TableCell>
          <TableCell className="hidden sm:table-cell">
            {formatter.number(agg.placements[1] ?? 0)}
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
}

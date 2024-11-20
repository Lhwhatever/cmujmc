import React from 'react';
import { trpc } from '../../utils/trpc';
import Loading from '../Loading';
import Table, { TableCell, TableHeading, TableRow } from '../Table';
import { Placement } from './PlacementRange';
import Decimal from 'decimal.js';
import DateTime from '../DateTime';

export type LeaderboardProps = {
  leagueId: number;
};

export default function Leaderboard({ leagueId }: LeaderboardProps) {
  const query = trpc.leagues.leaderboard.useQuery({ leagueId });
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
      {query.data.rankedUsers.map(({ user, rank, agg }) => (
        <TableRow key={user.id}>
          <TableCell>
            <Placement placement={rank} />
          </TableCell>
          <TableCell>{user.name}</TableCell>
          <TableCell>{new Decimal(agg.score).toFixed(1)}</TableCell>
          <TableCell>{agg.numMatches}</TableCell>
          <TableCell className="hidden sm:table-cell">
            {agg.placements[1] ?? 0}
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            {agg.highscore ?? '\u2014'}
          </TableCell>
        </TableRow>
      ))}
      {query.data.unrankedUsers.map(({ user, agg }) => (
        <TableRow key={user.id}>
          <TableCell>&mdash;</TableCell>
          <TableCell>{user.name}</TableCell>
          <TableCell>{new Decimal(agg.score).toFixed(1)}</TableCell>
          <TableCell>{agg.numMatches}</TableCell>
          <TableCell className="hidden sm:table-cell">
            {agg.placements[1] ?? 0}
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            {agg.highscore ?? '\u2014'}
          </TableCell>
        </TableRow>
      ))}
    </Table>
  );
}

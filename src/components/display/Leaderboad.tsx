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
          <TableHeading scope="col">Rank</TableHeading>
          <TableHeading scope="col">Name</TableHeading>
          <TableHeading scope="col">PT</TableHeading>
          <TableHeading scope="col">Matches</TableHeading>
        </TableRow>
      }
      foot={
        <TableRow>
          <TableCell colSpan={4}>
            Last updated:{' '}
            <DateTime
              date={new Date(query.data.lastUpdated)}
              format={{ timeStyle: 'medium' }}
            />
          </TableCell>
        </TableRow>
      }
    >
      {query.data.rankedUsers.map(({ user, rank, agg }) => (
        <TableRow key={user.id}>
          <TableCell>
            <Placement placement={rank} />
          </TableCell>
          <TableCell>{user.name}</TableCell>
          <TableCell>{new Decimal(agg.score).toFixed(1)}</TableCell>
          <TableCell>{agg.numMatches}</TableCell>
        </TableRow>
      ))}
      {query.data.unrankedUsers.map(({ user, agg }) => (
        <TableRow key={user.id}>
          <TableCell>&mdash;</TableCell>
          <TableCell>{user.name}</TableCell>
          <TableCell>{new Decimal(agg.score).toFixed(1)}</TableCell>
          <TableCell>{agg.numMatches}</TableCell>
        </TableRow>
      ))}
    </Table>
  );
}

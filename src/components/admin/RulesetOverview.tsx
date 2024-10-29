import React from 'react';
import Table, { TableCell, TableHeading, TableRow } from '../Table';
import { RouterOutputs, trpc } from '../../utils/trpc';
import Loading from '../Loading';
import Decimal from 'decimal.js';

type RulesetTableProps = {
  data: RouterOutputs['rulesets']['list']['rulesets'];
};

const RulesetTable = ({ data }: RulesetTableProps) => {
  return (
    <Table
      head={
        <TableRow>
          <TableHeading scope="col">Name</TableHeading>
          <TableHeading scope="col">Start / Return</TableHeading>
          <TableHeading scope="col">Oka + Uma</TableHeading>
        </TableRow>
      }
    >
      {data.map((ruleset) => {
        return (
          <TableRow key={ruleset.id} className="text-xs">
            <TableHeading scope="col">
              <div className="flex flex-col">
                <div>{ruleset.name}</div>
                <div className="italic font-normal">{ruleset.gameMode}</div>
              </div>
            </TableHeading>
            <TableCell>
              {ruleset.startPts.toLocaleString()} /{' '}
              {ruleset.returnPts.toLocaleString()}
            </TableCell>
            <TableCell>
              {ruleset.uma
                .toSorted((a, b) => a.position - b.position)
                .map((uma) => new Decimal(uma.value).toString())
                .join(' / ')}
            </TableCell>
          </TableRow>
        );
      })}
    </Table>
  );
};

export default function RulesetOverview() {
  const rulesets = trpc.rulesets.list.useQuery();

  if (!rulesets.data) return <Loading />;
  return <RulesetTable data={rulesets.data.rulesets} />;
}

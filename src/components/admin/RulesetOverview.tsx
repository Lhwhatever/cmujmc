import React from 'react';
import Table from '../Table';
import { RouterOutputs, trpc } from '../../utils/trpc';
import Loading from '../Loading';

type RulesetTableProps = {
  data: RouterOutputs['rulesets']['listAll']['rulesets'];
};

const RulesetTable = ({ data }: RulesetTableProps) => {
  return (
    <Table
      head={
        <Table.Row>
          <Table.Heading scope="col">Name</Table.Heading>
          <Table.Heading scope="col">Start / Return</Table.Heading>
          <Table.Heading scope="col">Oka + Uma</Table.Heading>
        </Table.Row>
      }
    >
      {data.map((ruleset) => {
        return (
          <Table.Row key={ruleset.id} className="text-xs">
            <Table.Heading scope="col">
              <div className="flex flex-col">
                <div>{ruleset.name}</div>
                <div className="italic font-normal">{ruleset.gameMode}</div>
              </div>
            </Table.Heading>
            <Table.Cell>
              {ruleset.startPts.toLocaleString()} /{' '}
              {ruleset.returnPts.toLocaleString()}
            </Table.Cell>
            <Table.Cell>
              {ruleset.uma
                .toSorted((a, b) => a.position - b.position)
                .map((uma) => uma.value)
                .join(' / ')}
            </Table.Cell>
          </Table.Row>
        );
      })}
    </Table>
  );
};

export default function RulesetOverview() {
  const rulesets = trpc.rulesets.listAll.useQuery();

  if (!rulesets.data) return <Loading />;
  return <RulesetTable data={rulesets.data.rulesets} />;
}

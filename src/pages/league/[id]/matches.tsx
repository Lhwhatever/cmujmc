import React, { useEffect } from 'react';
import Page from '../../../components/Page';
import { useRouter } from 'next/router';
import { trpc } from '../../../utils/trpc';
import { useFormatter } from 'next-intl';
import Loading from '../../../components/Loading';
import DateTime from '../../../components/DateTime';
import PlacementRange from '../../../components/display/PlacementRange';
import MatchPlayerName from '../../../components/display/MatchPlayerName';
import Heading from '../../../components/Heading';

interface ContentProps {
  leagueId: number;
}

const Content = ({ leagueId }: ContentProps) => {
  const league = trpc.matches.getCompletedByLeague.useQuery(leagueId);
  const format = useFormatter();

  if (!league.data) {
    return <Loading />;
  }

  if (league.data.matches.length === 0) {
    return <div>No matches in record!</div>;
  }

  return (
    <div className="grid grid-cols-[4rem_4rem_1fr_6rem] md:grid-cols-7">
      {league.data.matches.map(({ id, time, players }) => (
        <div
          key={id}
          className="grid col-span-full grid-cols-subgrid divide-y divide-gray-200 even:bg-gray-100"
        >
          <div className="text-xs text-gray-700 text-center row-span-4 md:row-span-2">
            <DateTime
              date={time}
              format={{
                dateStyle: 'short',
                timeStyle: 'short',
              }}
            />
          </div>
          {players.map(
            ({
              playerPosition,
              placementMin,
              placementMax,
              rawScore,
              player,
              unregisteredPlaceholder,
            }) => (
              <React.Fragment key={playerPosition}>
                <PlacementRange min={placementMin} max={placementMax} />
                <div>
                  <MatchPlayerName
                    player={player}
                    unregisteredPlaceholder={unregisteredPlaceholder}
                  />
                </div>
                <div className="text-right mr-2">{format.number(rawScore)}</div>
              </React.Fragment>
            ),
          )}
        </div>
      ))}
    </div>
  );
};

export default function Matches() {
  const router = useRouter();
  const id = parseInt(router.query.id as string);

  const query = trpc.leagues.get.useQuery(id, { retry: 3 });

  useEffect(() => {
    if (query.isError) {
      void router.push('/');
    }
  }, [router, query.isError]);

  if (!query.data) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  const { league } = query.data;

  const onBack = () => {
    router.back();
  };

  return (
    <Page>
      <Heading level="h2" className="mb-1">
        {league.name} Match History
      </Heading>
      <div className="mb-3">
        <a onClick={onBack} className="text-green-700 underline cursor-pointer">
          Back
        </a>
      </div>
      <Content leagueId={id} />
      <div className="mt-3">
        <a onClick={onBack} className="text-green-700 underline cursor-pointer">
          Back
        </a>
      </div>
    </Page>
  );
}

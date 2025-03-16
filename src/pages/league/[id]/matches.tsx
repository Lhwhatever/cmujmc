import { Suspense, useEffect, useState } from 'react';
import Page from '../../../components/Page';
import { useRouter } from 'next/router';
import { trpc } from '../../../utils/trpc';
import { useFormatter } from 'next-intl';
import Loading from '../../../components/Loading';
import DateTime from '../../../components/DateTime';
import PlacementRange from '../../../components/display/PlacementRange';
import MatchPlayerName from '../../../components/display/MatchPlayerName';
import Heading from '../../../components/Heading';
import ButtonLink from 'components/ButtonLink';
import clsx from 'clsx';
import { useSession } from 'next-auth/react';
import Button from '../../../components/Button';
import MatchEditDialog from '../../../components/matchEntry/MatchEditDialog';

interface ContentProps {
  leagueId: number;
}

const MatchList = ({ leagueId }: ContentProps) => {
  const session = useSession();

  const [matchToEdit, setMatchToEdit] = useState<number | null>(null);

  const [{ matches }] =
    trpc.matches.getCompletedByLeague.useSuspenseQuery(leagueId);
  const format = useFormatter();

  if (matches.length === 0) {
    return <div>No matches in record!</div>;
  }

  const outerClass = clsx(
    'grid gap-x-2 md:gap-x-8',
    'grid-cols-[4rem_4rem_1fr_max-content_max-content]',
    'md:grid-cols-[8rem_4rem_1fr_max-content_4rem_1fr_max-content_max-content]',
  );

  const isAdmin = session.data?.user?.role === 'admin';

  return (
    <>
      <div className={outerClass}>
        {matches.map(({ id, time, players }) => (
          <div
            key={id}
            className="grid col-span-full grid-cols-subgrid divide-y divide-gray-200 even:bg-gray-100"
          >
            <div className="text-xs text-gray-700 text-center col-start-1 row-span-4 md:row-span-2">
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
                <div
                  key={playerPosition}
                  className={clsx(
                    'grid col-span-3 grid-cols-subgrid gap-x-2',
                    session.data &&
                      session.data.user.id === player?.id &&
                      'font-bold',
                  )}
                >
                  <PlacementRange min={placementMin} max={placementMax} />
                  <div>
                    <MatchPlayerName
                      player={player}
                      unregisteredPlaceholder={unregisteredPlaceholder}
                    />
                  </div>
                  <div className="text-right">{format.number(rawScore)}</div>
                </div>
              ),
            )}
            <div className="-col-start-1 row-start-1 row-end-5 md:row-end-3 flex flex-row flex-wrap py-1">
              {isAdmin && (
                <Button
                  color="blue"
                  fill="outlined"
                  onClick={() => setMatchToEdit(id)}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      {isAdmin && (
        <MatchEditDialog
          leagueId={leagueId}
          matchId={matchToEdit}
          onClose={() => setMatchToEdit(null)}
        />
      )}
    </>
  );
};

interface MatchHistoryProps {
  id: number;
}

const MatchHistory = ({ id }: MatchHistoryProps) => {
  const [{ league }] = trpc.leagues.get.useSuspenseQuery(id, { retry: 3 });
  return (
    <>
      <Heading level="h2" className="mb-1">
        {league.name} Match History
      </Heading>
      <div className="mb-3">
        <ButtonLink color="green" fill="outlined" href={`/league/${id}`}>
          Back
        </ButtonLink>
      </div>
      <Suspense fallback={<Loading />}>
        <MatchList leagueId={id} />
      </Suspense>
      <div className="mt-3">
        <ButtonLink color="green" fill="outlined" href={`/league/${id}`}>
          Back
        </ButtonLink>
      </div>
    </>
  );
};

export default function MatchHistoryPage() {
  const router = useRouter();
  const id = parseInt(router.query.id as string);

  const query = trpc.leagues.get.useQuery(id, { retry: 3 });

  useEffect(() => {
    if (Number.isNaN(id)) {
      void router.push('/');
    }
  }, [router, id]);

  if (!query.data) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  return (
    <Page>
      {Number.isNaN(id) ? (
        <Loading />
      ) : (
        <Suspense fallback={<Loading />}>
          <MatchHistory id={id} />
        </Suspense>
      )}
    </Page>
  );
}

import React, { Suspense, useEffect, useState } from 'react';
import Page from '../components/Page';
import Heading from '../components/Heading';
import { trpc } from '../utils/trpc';
import Loading from '../components/Loading';
import { useFormatter } from 'next-intl';
import Link from 'next/link';
import DateTime from '../components/DateTime';
import { isSameDay } from 'date-fns';
import Image from 'next/image';

const Header = () => {
  return (
    <div className="flex mb-4 gap-8">
      <div className="max-w-[10rem] w-full relative">
        <Image src="/favicon.svg" alt="Club Logo" fill />
      </div>
      <div>
        <Heading level="h2" className="mb-2">
          CMU Japanese Mahjong Club
        </Heading>
        <div className="hidden sm:block">
          <p>
            We are a beginner-friendly group of Riichi Mahjong players
            affiliated with Carnegie Mellon University.
          </p>
          <p>
            If you are a member of the CMU community, or are located in the
            Pittsburgh area, we welcome you to join us!
          </p>
        </div>
        <div>
          <p>
            📍{' '}
            <a
              href="https://maps.app.goo.gl/yx957CFMQD9wo3zv9"
              className="underline text-gray-700"
            >
              5000 Forbes Ave, Pittsburgh, PA 15213
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

const EventsSection = () => {
  const [checkDate, setCheckDate] = useState(new Date(0));
  const formatter = useFormatter();
  useEffect(() => {
    setCheckDate(new Date());
  }, [setCheckDate]);

  const [{ events }] = trpc.events.list.useSuspenseQuery({
    limit: 3,
    sortDirection: 'start-asc',
    filters: [{ lhs: 'closingDate', op: 'gt', rhs: checkDate }],
  });

  return (
    <div className="flex flex-col space-y-4">
      <Heading level="h3">Club Events</Heading>
      <p>
        📅{' '}
        <a
          href="https://tinyurl.com/cmumahjong"
          className="underline text-gray-700"
        >
          Club Calendar
        </a>
      </p>
      {events.map(({ startDate, endDate, id, parent }) => {
        const date = startDate ?? checkDate;
        const month = formatter.dateTime(date, { month: 'short' });
        return (
          <div
            key={id}
            className="flex flex-row bg-gray-200 border rounded-lg border-gray-200 p-2 space-x-3 mt-2"
          >
            <div className="flex flex-col space-y-0 items-center">
              <div className="text-md">{month.toUpperCase()}</div>
              <div className="text-3xl font-bold">
                {formatter.dateTime(date, { day: '2-digit' })}
              </div>
            </div>
            <div className="flex flex-col text-sm">
              <div className="mb-1">
                <Link
                  href={`/league/${parent.id}`}
                  className="text-gray-600 underline"
                >
                  {parent.name}
                </Link>
              </div>
              {startDate && (
                <div>
                  Starts at{' '}
                  <DateTime date={startDate} format={{ timeStyle: 'short' }} />{' '}
                  (<DateTime date={startDate} relative />)
                </div>
              )}
              {endDate && (
                <div>
                  Ends at{' '}
                  <DateTime
                    date={endDate}
                    format={{
                      timeStyle: 'short',
                      dateStyle:
                        startDate && isSameDay(startDate, endDate)
                          ? undefined
                          : 'short',
                    }}
                  />{' '}
                  (<DateTime date={endDate} relative />)
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LeaguesSection = () => {
  const [checkDate, setCheckDate] = useState(new Date(0));
  useEffect(() => {
    setCheckDate(new Date());
  }, [setCheckDate]);

  const [{ leagues }] = trpc.leagues.list.useSuspenseQuery({
    limit: 10,
    filter: {
      minUsers: 8,
      endDate: {
        lt: checkDate,
      },
    },
  });

  return (
    <div className="flex flex-col space-y-4">
      <Heading level="h3">Past Leagues/Tournaments</Heading>
      {leagues.length === 0 && <p>No leagues in record...</p>}
      {leagues.map(
        ({
          startDate,
          endDate,
          id,
          name,
          description,
          _count,
          defaultRuleset,
        }) => {
          const information: React.ReactNode[] = [];
          if (startDate) {
            information.push(
              <div>
                Started <DateTime date={startDate} />
              </div>,
            );
          }

          if (endDate) {
            information.push(
              <div>
                Ended <DateTime date={endDate} />
              </div>,
            );
          }

          information.push(`${_count.users} player(s)`);

          return (
            <div
              key={id}
              className="flex flex-col bg-gray-200 border rounded-lg border-gray-200 p-2 space-x-3 mt-2"
            >
              <Heading level="h6">
                <Link href={`/league/${id}`}>{name}</Link>
              </Heading>
              <div className="flex flex-row gap-x-2 text-sm">
                {information.map((info, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <div>&middot;</div>}
                    <div>{info}</div>
                  </React.Fragment>
                ))}
              </div>
              <div>Ruleset: {defaultRuleset.name}</div>
              <div>{description}</div>
            </div>
          );
        },
      )}
    </div>
  );
};

export default function IndexPage() {
  return (
    <Page>
      <div className="flex h-screen flex-col items-stretch">
        <div className="flex flex-col items-stretch gap-y-8">
          <Header />
          <Suspense fallback={<Loading />}>
            <EventsSection />
          </Suspense>
          <Suspense fallback={<Loading />}>
            <LeaguesSection />
          </Suspense>
        </div>
      </div>
    </Page>
  );
}

/**
 * If you want to statically render this page
 * - Export `appRouter` & `createContext` from [trpc].ts
 * - Make the `opts` object optional on `createContext()`
 *
 * @link https://trpc.io/docs/v11/ssg
 */
// export const getStaticProps = async (
//   context: GetStaticPropsContext<{ filter: string }>,
// ) => {
//   const ssg = createServerSideHelpers({
//     router: appRouter,
//     ctx: await createContext(),
//   });
//
//   await ssg.fetchQuery('post.all');
//
//   return {
//     props: {
//       trpcState: ssg.dehydrate(),
//       filter: context.params?.filter ?? 'all',
//     },
//     revalidate: 1,
//   };
// };

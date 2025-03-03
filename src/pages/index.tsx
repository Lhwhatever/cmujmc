import { useEffect, useState } from 'react';
import Page from '../components/Page';
import Heading from '../components/Heading';
import { trpc } from '../utils/trpc';
import Loading from '../components/Loading';
import { useFormatter } from 'next-intl';
import Link from 'next/link';
import DateTime from '../components/DateTime';
import { isSameDay } from 'date-fns';

const EventsSection = () => {
  const [checkDate, setCheckDate] = useState(new Date(0));
  const formatter = useFormatter();
  useEffect(() => {
    setCheckDate(new Date());
  }, [setCheckDate]);

  const query = trpc.events.list.useQuery({
    limit: 3,
    sortDirection: 'start-asc',
    filters: [{ lhs: 'closingDate', op: 'gt', rhs: checkDate }],
  });

  if (!query.data) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col space-y-4">
      {query.data.events.map(({ startDate, endDate, id, parent }) => {
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

export default function IndexPage() {
  return (
    <Page>
      <div className="flex h-screen flex-col items-stretch">
        <div className="flex flex-col items-stretch">
          <Heading level="h2">Club Events</Heading>
          <EventsSection />
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

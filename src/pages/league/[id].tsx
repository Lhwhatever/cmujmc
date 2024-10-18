import React from 'react';
import Page from '../../components/Page';
import Heading from '../../components/Heading';
import { useRouter } from 'next/router';
import { RouterOutputs, trpc } from '../../utils/trpc';
import Loading from '../../components/Loading';
import Text from '../../components/Text';
import { DisclosurePanel } from '@headlessui/react';
import DateTimeRange from '../../components/DateTimeRange';
import DateTime from '../../components/DateTime';
import Accordion, { AccordionSegment } from '../../components/Accordion';

type EventsSectionProps = {
  leagueId: number;
};

type Event = RouterOutputs['events']['getByLeague']['events'][number];

const partitionEvents = (refTime: number, events: Event[]) => {
  const closed = [];
  const ongoing = [];
  const future = [];

  for (const event of events) {
    if (event.closingDate && event.closingDate.getTime() < refTime) {
      closed.push(event);
    } else if (event.startDate && event.startDate.getTime() > refTime) {
      future.push(event);
    } else {
      ongoing.push(event);
    }
  }

  return [closed, ongoing, future];
};

const EventsSection = ({ leagueId }: EventsSectionProps) => {
  const query = trpc.events.getByLeague.useQuery({ leagueId });

  if (query.isLoading) {
    return <Loading />;
  }

  const [closed, ongoing, future] = partitionEvents(
    Date.now(),
    query.data!.events,
  );

  if (closed.length === 0 && ongoing.length === 0 && future.length === 0) {
    return <p>No events planned.</p>;
  }

  return (
    <Accordion>
      {ongoing.length > 0 && (
        <AccordionSegment
          heading={<Heading level="h4">Current Events</Heading>}
          defaultOpen={true}
        >
          {ongoing.map((event) => (
            <div key={event.id}>
              <Heading level="h5">
                <DateTimeRange
                  startDate={event.startDate}
                  endDate={event.endDate}
                />
              </Heading>
              <p>
                Ends <DateTime date={event.endDate!} relative />
              </p>
            </div>
          ))}
        </AccordionSegment>
      )}
      {future.length > 0 && (
        <AccordionSegment
          heading={<Heading level="h4">Future Events</Heading>}
          defaultOpen={ongoing.length === 0}
        >
          {future.map((event) => (
            <div key={event.id}>
              <Heading level="h5">
                <DateTimeRange
                  startDate={event.startDate}
                  endDate={event.endDate}
                />
              </Heading>
              <p>
                Starts <DateTime date={event.startDate!} relative />
              </p>
            </div>
          ))}
        </AccordionSegment>
      )}
      {closed.length > 0 && (
        <AccordionSegment heading={<Heading level="h4">Past Events</Heading>}>
          {future.map((event) => (
            <div key={event.id}>
              <Heading level="h5">
                <DateTimeRange
                  startDate={event.startDate}
                  endDate={event.endDate}
                />
              </Heading>
              <p>
                Starts <DateTime date={event.startDate!} relative />
              </p>
            </div>
          ))}
        </AccordionSegment>
      )}
    </Accordion>
  );
};

export default function League() {
  const router = useRouter();
  const id = parseInt(router.query.id as string);
  const query = trpc.leagues.get.useQuery(id, { retry: 3 });

  if (query.isError) {
    router.push('/');
  }

  if (!query.data) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  const { league } = query.data;

  return (
    <Page>
      <div className="flex flex-col space-y-4">
        <div>
          <Heading level="h2" className="mb-1">
            {league.name}
          </Heading>
          {(league.startDate || league.endDate) && (
            <p className="text-md text-gray-600">
              <DateTimeRange
                startDate={league.startDate}
                endDate={league.endDate}
              />
            </p>
          )}
          {league.invitational && <Text>Invite-only</Text>}
          <Text>{league.description}</Text>
        </div>
        <div>
          <Heading level="h3">Ruleset</Heading>
          <Heading level="h4">{league.defaultRuleset.name}</Heading>
        </div>
        <div>
          <Heading level="h3">Events</Heading>
          <EventsSection leagueId={id} />
        </div>
      </div>
    </Page>
  );
}

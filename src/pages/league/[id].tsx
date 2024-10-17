import React from 'react';
import Page from '../../components/Page';
import Heading from '../../components/Heading';
import { useRouter } from 'next/router';
import { trpc } from '../../utils/trpc';
import Loading from '../../components/Loading';
import Text from '../../components/Text';

const formatDateRange = (startDate?: Date | null, endDate?: Date | null) => {
  const fmt = new Intl.DateTimeFormat();
  if (startDate) {
    if (endDate) {
      return fmt.formatRange(startDate, endDate);
    } else {
      return `Starts ${fmt.format(startDate)}`;
    }
  } else {
    if (endDate) {
      return `Ends ${fmt.format(endDate)}`;
    } else {
      return null;
    }
  }
};

export default function League() {
  const router = useRouter();
  const id = parseInt(router.query.id as string);
  const { data } = trpc.leagues.get.useQuery(id);

  if (!data) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  const dates = formatDateRange(data.league.startDate, data.league.endDate);

  return (
    <Page>
      <div className="flex flex-col space-y-4">
        <div>
          <Heading level="h2" className="mb-1">
            {data.league.name}
          </Heading>
          {dates && <p className="text-md text-gray-600">{dates}</p>}
          {data.league.invitational && <Text>Invite-only</Text>}
          <Text>{data.league.description}</Text>
        </div>
        <div>
          <Heading level="h3">Ruleset</Heading>
          <Heading level="h4">{data.league.defaultRuleset.name}</Heading>
        </div>
      </div>
    </Page>
  );
}

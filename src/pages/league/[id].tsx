import React from 'react';
import Page from '../../components/Page';
import Heading from '../../components/Heading';
import { useRouter } from 'next/router';
import { trpc } from '../../utils/trpc';
import Loading from '../../components/Loading';
import Text from '../../components/Text';
import { formatDateRange } from '../../utils/dates';

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

  const dates = formatDateRange(league.startDate, league.endDate);

  return (
    <Page>
      <div className="flex flex-col space-y-4">
        <div>
          <Heading level="h2" className="mb-1">
            {league.name}
          </Heading>
          {dates && <p className="text-md text-gray-600">{dates}</p>}
          {league.invitational && <Text>Invite-only</Text>}
          <Text>{league.description}</Text>
        </div>
        <div>
          <Heading level="h3">Ruleset</Heading>
          <Heading level="h4">{league.defaultRuleset.name}</Heading>
        </div>
      </div>
    </Page>
  );
}

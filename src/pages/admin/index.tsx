import React from 'react';
import { Page } from '../../components/Page';
import { useSession } from 'next-auth/react';
import UserOverview from '../../components/admin/UserOverview';
import Loading from '../../components/Loading';
import RulesetOverview from '../../components/admin/RulesetOverview';
import LeagueControlPanel from '../../components/admin/LeagueControlPanel';
import Heading from '../../components/Heading';

const Contents = () => {
  return (
    <div className="flex flex-col space-y-4">
      <div>
        <Heading level="h3">Admin Dashboard</Heading>
      </div>
      <div>
        <Heading level="h4">Users</Heading>
        <UserOverview />
      </div>
      <div>
        <Heading level="h4">Rulesets</Heading>
        <RulesetOverview />
      </div>
      <div>
        <Heading level="h4">Leagues and Tournaments</Heading>
        <LeagueControlPanel />
      </div>
    </div>
  );
};

export default function AdminPage() {
  const { status, data: session } = useSession({ required: true });
  if (status === 'loading') {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  if (session?.user.role !== 'admin') {
    return (
      <Page>
        <div>Unauthorized</div>
      </Page>
    );
  }

  return (
    <Page>
      <Contents />
    </Page>
  );
}

AdminPage.auth = {
  role: 'admin',
  loading: <div>Loading...</div>,
  unauthorized: '/',
};

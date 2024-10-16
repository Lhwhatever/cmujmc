import React from 'react';
import { Page } from '../../components/Page';
import { useSession } from 'next-auth/react';
import UserOverview from '../../components/admin/UserOverview';
import Loading from '../../components/Loading';
import RulesetOverview from '../../components/admin/RulesetOverview';

const Contents = () => {
  return (
    <div className="flex flex-col space-y-4">
      <div>
        <h1 className="text-2xl">Users</h1>
        <UserOverview />
      </div>
      <div>
        <h1 className="text-2xl">Rulesets</h1>
        <RulesetOverview />
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

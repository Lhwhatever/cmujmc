import Page from '../../components/Page';
import UserOverview from '../../components/admin/UserOverview';
import RulesetOverview from '../../components/admin/RulesetOverview';
import LeagueControlPanel from '../../components/admin/LeagueControlPanel';
import Heading from '../../components/Heading';

function AdminMainPage() {
  return (
    <Page>
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
    </Page>
  );
}

AdminMainPage.auth = {
  role: 'admin',
};

export default AdminMainPage;

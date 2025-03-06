import Page from '../../components/Page';
import { useSession } from 'next-auth/react';
import Heading from '../../components/Heading';
import ButtonLink from '../../components/ButtonLink';

const WwydTemplateManagement = () => {
  return (
    <div className="bg-yellow-200 border-yellow-800 p-4 rounded-lg">
      <Heading level="h4">Admin Panel</Heading>
      <ButtonLink color="blue" fill="filled" href="/wwyd/template">
        Manage WWYD Templates
      </ButtonLink>
    </div>
  );
};

export default function WwydList() {
  const session = useSession();

  return (
    <Page>
      {session.data?.user?.role === 'admin' && <WwydTemplateManagement />}
    </Page>
  );
}

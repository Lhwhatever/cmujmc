import Page from '../../../components/Page';

export default function WwydAdmin() {
  return <Page></Page>;
}

WwydAdmin.auth = {
  role: 'admin',
  unauthorizedRedirect: '/wwyd',
};

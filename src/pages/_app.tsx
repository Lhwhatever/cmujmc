import '../styles/global.css';
import type { Session } from 'next-auth';
import { getSession, SessionProvider } from 'next-auth/react';
import type { AppProps, AppType } from 'next/app';
import { trpc } from 'utils/trpc';
import { NextIntlClientProvider } from 'next-intl';

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps,
}: AppProps<{ session: Session | null }>) => {
  return (
    <SessionProvider session={pageProps.session}>
      <NextIntlClientProvider
        locale="en"
        timeZone="America/New_York"
        now={new Date()}
      >
        <Component {...pageProps} />
      </NextIntlClientProvider>
    </SessionProvider>
  );
};

MyApp.getInitialProps = async ({ ctx }) => {
  return {
    session: await getSession(ctx),
  };
};

export default trpc.withTRPC(MyApp);

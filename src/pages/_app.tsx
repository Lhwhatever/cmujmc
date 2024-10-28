import '../styles/global.css';
import type { Session } from 'next-auth';
import { getSession, SessionProvider } from 'next-auth/react';
import type { AppType } from 'next/app';
import { trpc } from 'utils/trpc';
import { NextIntlClientProvider } from 'next-intl';

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps,
}) => {
  return (
    <SessionProvider session={pageProps.session}>
      <NextIntlClientProvider locale="en" timeZone="America/New_York">
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

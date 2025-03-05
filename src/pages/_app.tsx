import '../styles/global.css';
import type { Session } from 'next-auth';
import {
  getSession,
  SessionProvider,
  signIn,
  useSession,
} from 'next-auth/react';
import type { AppProps, AppType } from 'next/app';
import { trpc } from 'utils/trpc';
import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Page from '../components/Page';
import Loading from '../components/Loading';
import { BaseContext, NextComponentType } from 'next/dist/shared/lib/utils';
import { Url } from 'next/dist/shared/lib/router/router';

export interface AuthSpecifications {
  role: 'user' | 'admin';
  loading?: ReactNode;
  unauthorizedRedirect?: Url;
}

export type WithAuthSpecifications<
  Context extends BaseContext,
  InitialProps,
  Props,
> = NextComponentType<Context, InitialProps, Props> & {
  auth: AuthSpecifications;
};

function isProtectedComponent<Context extends BaseContext, InitialProps, Props>(
  component: NextComponentType<Context, InitialProps, Props>,
): component is WithAuthSpecifications<Context, InitialProps, Props> {
  return (
    'auth' in component &&
    typeof component.auth === 'object' &&
    component.auth !== null &&
    'role' in component.auth &&
    (component.auth.role === 'user' || component.auth.role === 'admin')
  );
}

interface AuthWrapperProps {
  children: ReactNode;
  specs: AuthSpecifications;
}

const AuthWrapper = ({ children, specs }: AuthWrapperProps) => {
  const { status, data: session } = useSession({ required: true });
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.role) {
      signIn();
    } else if (session.user?.role === 'admin') {
      setReady(true);
    } else if (session.user?.role === 'user' && specs.role === 'admin') {
      router.push(specs.unauthorizedRedirect ?? '/');
    } else {
      setReady(true);
    }
  }, [status, session, setReady, router]);

  if (ready) {
    return children;
  }

  return (
    specs.loading ?? (
      <Page>
        <Loading />
      </Page>
    )
  );
};

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
        {isProtectedComponent(Component) ? (
          <AuthWrapper specs={Component.auth}>
            <Component {...pageProps} />
          </AuthWrapper>
        ) : (
          <Component {...pageProps} />
        )}
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

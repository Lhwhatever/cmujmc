import React from 'react';
import Head from 'next/head';
import Navbar from './Navbar';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

type Props = {
  title?: string;
  children?: React.ReactNode;
};

export const Page = ({ children, title }: Props) => {
  return (
    <>
      <Head>
        <title>{title ?? 'CMU Japanese Mahjong'}</title>
        <meta name="description" content="CMU Japanese Mahjong Club" />
      </Head>
      <div>
        <header>
          <Navbar />
        </header>
      </div>
      <main className="container mx-auto p-2">
        {children}
        {process.env.NODE_ENV !== 'production' && (
          <div className="md:block">
            <ReactQueryDevtools initialIsOpen={false} />
          </div>
        )}
      </main>
    </>
  );
};
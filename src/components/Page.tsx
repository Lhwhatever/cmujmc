import React from 'react';
import Head from 'next/head';
import Navbar from './Navbar';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export type PageProps = {
  title?: string;
  children?: React.ReactNode;
};

export default function Page({ children, title }: PageProps) {
  return (
    <>
      <Head>
        <title>{title ?? 'CMU Japanese Mahjong'}</title>
        <meta name="description" content="CMU Japanese Mahjong Club" />
      </Head>
      <div>
        <header className="fixed inset-x-0 top-0 z-40 h-16">
          <Navbar />
        </header>
      </div>
      <main className="container mx-auto px-2 py-4 mt-16">
        {children}
        {process.env.NODE_ENV !== 'production' && (
          <div className="md:block">
            <ReactQueryDevtools initialIsOpen={false} />
          </div>
        )}
      </main>
    </>
  );
}

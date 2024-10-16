import React from 'react';
import Head from 'next/head';
import Navbar from './Navbar';

type Props = {
  title?: string;
  children?: React.ReactNode;
}

export const Page = ({ children, title }: Props) => {
  return (
    <>
      <Head>
        <title>{title ?? "CMU Japanese Mahjong"}</title>
        <meta name="description" content="CMU Japanese Mahjong Club" />
      </Head>
      <div>
        <header>
          <Navbar />
        </header>
      </div>
      <main>
        {children}
      </main>
    </>
  )
}
import type { AppProps } from 'next/app';
import Head from 'next/head';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Dheeraa Haffa Greens | Plot Viewer — Interactive Real-Estate Map</title>
        <meta name="description" content="Explore residential, LIG and EWS plots in Dheeraa Haffa Greens with high-resolution satellite imagery, real-time availability and interactive layout." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

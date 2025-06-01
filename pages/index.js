import Head from 'next/head';
import Chat from '../components/Chat';

export default function Home() {
  return (
    <div>
      <Head>
        <title>Offer Approved GPT</title>
        <meta name="description" content="Offer Approved - AI Ticket Concierge" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1 style={{ textAlign: 'center', marginTop: '20px' }}>
          🎟️ Offer Approved GPT Concierge
        </h1>
        <Chat />
      </main>
    </div>
  );
}

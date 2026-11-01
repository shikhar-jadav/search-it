import ChatWindow from '@/components/ChatWindow';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat - Search It',
  description: 'Chat with the internet, chat with Search It.',
};

const Home = () => {
  return <ChatWindow />;
};

export default Home;

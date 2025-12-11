import Header from '../../components/layout/Header';
import { RealTimeProvider } from '../../context/RealTimeContext';
import ChatWaitingModal from '../../components/modals/ChatWaitingModal';
import CallWaitingModal from '../../components/modals/CallWaitingModal';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <RealTimeProvider>
      <main>
        {children}
        <ChatWaitingModal />
        <CallWaitingModal />
      </main>
      </RealTimeProvider>
    </div>
  );
}

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DiagnosticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 ml-[220px] flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

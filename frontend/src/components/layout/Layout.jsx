import { Header } from './Header';
import { Toaster } from '../ui/sonner';

export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>{children}</main>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default Layout;

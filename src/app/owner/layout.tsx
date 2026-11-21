import { HeaderAuth } from '@/components/shell/header-auth';
import { SiteHeader } from '@/components/shell/site-header';

export default function OwnerLayout({ children }: LayoutProps<'/owner'>) {
  return (
    <>
      <SiteHeader authSlot={<HeaderAuth />} />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>
    </>
  );
}

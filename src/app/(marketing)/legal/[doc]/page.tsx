import { FileText } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/states/empty-state';

const DOCS = { terms: 'Terms of service', privacy: 'Privacy policy' } as const;
type Doc = keyof typeof DOCS;

const isDoc = (value: string): value is Doc => Object.hasOwn(DOCS, value);

// Cache Components has no `dynamicParams`, so any other value renders on demand and hits notFound().
// 'navigation' makes Next wait for that render instead of streaming the fallback shell first, which
// would commit a 200 before notFound() runs. The page is fully static, so the stricter level costs nothing.
export const ensureStatic = 'navigation';

export function generateStaticParams() {
  return (Object.keys(DOCS) as Doc[]).map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: PageProps<'/legal/[doc]'>): Promise<Metadata> {
  const { doc } = await params;
  if (!isDoc(doc)) notFound();
  return { title: DOCS[doc] };
}

export default async function LegalPage({ params }: PageProps<'/legal/[doc]'>) {
  const { doc } = await params;
  if (!isDoc(doc)) notFound();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl text-ink sm:text-5xl">{DOCS[doc]}</h1>
      <EmptyState
        icon={FileText}
        title="Draft — not legal advice"
        description="This document is still being written and reviewed. It is a placeholder, not a binding agreement."
      />
    </div>
  );
}

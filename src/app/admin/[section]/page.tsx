import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ADMIN_SECTIONS, findAdminSection } from '@/features/admin/nav';
import { PlaceholderPage } from '@/features/placeholder-page';

export const instant = false;

export function generateStaticParams() {
  return ADMIN_SECTIONS.map((section) => ({ section: section.slug }));
}

export async function generateMetadata({ params }: PageProps<'/admin/[section]'>): Promise<Metadata> {
  const { section } = await params;
  return { title: findAdminSection(section)?.label ?? 'Page not found' };
}

export default async function AdminSectionPage({ params }: PageProps<'/admin/[section]'>) {
  const section = findAdminSection((await params).section);
  if (!section) notFound();
  return <PlaceholderPage title={section.label} icon={section.icon} milestone="M5" />;
}

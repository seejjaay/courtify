import type { Metadata } from 'next';
import { LegalDocument } from '../legal-document';

export const metadata: Metadata = { title: 'Terms of service' };

export default function TermsPage() {
  return <LegalDocument title="Terms of service" />;
}

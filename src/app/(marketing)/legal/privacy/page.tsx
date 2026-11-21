import type { Metadata } from 'next';
import { LegalDocument } from '../legal-document';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function PrivacyPage() {
  return <LegalDocument title="Privacy policy" />;
}

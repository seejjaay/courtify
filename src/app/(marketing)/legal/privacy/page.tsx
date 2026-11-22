import type { Metadata } from 'next';
import { LegalDocument, type LegalSection } from '../legal-document';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'What personal data Courtify collects, why, who sees it and your rights under the Data Privacy Act (RA 10173). A draft, not legal advice.',
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'Who we are',
    body: (
      <p>
        Courtify is run by [Operator name] (“we”, “us”). We decide why and how your personal data is used, which makes us the personal information
        controller under the Data Privacy Act of 2012 (RA 10173). You can reach us at [contact email].
      </p>
    ),
  },
  {
    heading: 'What we collect',
    body: (
      <>
        <ul>
          <li>Account details: your name, email address, phone number if you add one, and your password (stored hashed, never in plain text).</li>
          <li>Bookings: the venue, court, date and time, status, and your booking code.</li>
          <li>Payment proofs: the GCash screenshots you upload to a venue, or to Courtify for Pro billing.</li>
          <li>Venue details from owners: venue name, address, contact buttons, photos, rates and team members.</li>
          <li>Things you choose to add: favourite venues and a profile photo, plus the notifications we send you.</li>
          <li>Records of changes to bookings and venues (who changed what, and when), and the time you agreed to our terms and this policy.</li>
          <li>Basic technical data your browser sends, such as your IP address and device type, in our server logs.</li>
        </ul>
      </>
    ),
  },
  {
    heading: 'Why we use it',
    body: (
      <ul>
        <li>To run your account and sign you in.</li>
        <li>To make, show, change and cancel bookings, and to let venues check you in.</li>
        <li>To let venue owners verify payments, and to verify Pro payments.</li>
        <li>To send you notices about your bookings and account.</li>
        <li>To keep Courtify safe, prevent abuse and fix problems.</li>
        <li>To meet legal and accounting obligations.</li>
      </ul>
    ),
  },
  {
    heading: 'Who can see it',
    body: (
      <>
        <ul>
          <li>The venue you book with sees your name, contact details, booking and payment proof for that booking.</li>
          <li>A venue’s team sees the bookings for their venue, according to their role.</li>
          <li>Courtify’s admin can see accounts, venues and payment proofs as needed to run the service and verify payments.</li>
          <li>Other players never see your bookings.</li>
        </ul>
        <p>We don’t sell your personal data.</p>
      </>
    ),
  },
  {
    heading: "Where it's stored",
    body: (
      <p>
        Your data is stored with our service providers: Supabase (database, sign-in and file storage, in its Singapore region) and Vercel (website
        hosting). They process data for us under their own security commitments. This means your data is handled outside the Philippines, and we
        remain responsible for it.
      </p>
    ),
  },
  {
    heading: 'How long we keep it',
    body: (
      <>
        <p>
          We keep your account data while your account is open. Booking and payment records are kept for as long as venues and Courtify need them for
          accounting, resolving disputes and meeting legal obligations, and are then deleted or anonymised.
        </p>
        <p>If you close your account, we delete or anonymise your personal data, except what we must keep for those purposes.</p>
      </>
    ),
  },
  {
    heading: 'Your rights',
    body: (
      <>
        <p>Under RA 10173 you have the right to:</p>
        <ul>
          <li>be informed about how your data is used, which is what this page is for;</li>
          <li>access the personal data we hold about you;</li>
          <li>object to how we use it, including withdrawing consent where we rely on it;</li>
          <li>erasure or blocking of your data, where it’s unlawfully held or no longer needed;</li>
          <li>claim damages if you’ve been harmed by inaccurate, incomplete, outdated or unlawfully used data;</li>
          <li>data portability, which means getting your data in a common, usable format;</li>
          <li>rectification, which means correcting data that’s wrong;</li>
          <li>file a complaint with the National Privacy Commission (privacy.gov.ph).</li>
        </ul>
        <p>To use any of these, email [contact email]. We’ll answer as quickly as we can.</p>
      </>
    ),
  },
  {
    heading: 'Keeping it safe',
    body: (
      <p>
        Data is encrypted in transit. Access to bookings, proofs and venue records is limited by role and enforced in the database. Payment proofs are
        kept in private storage that only the people involved can open. No system is perfectly secure. If a breach puts your data at risk, we’ll tell
        you and, where required, the National Privacy Commission.
      </p>
    ),
  },
  {
    heading: 'Cookies',
    body: (
      <p>
        We use only the cookies needed to keep you signed in and to remember small things like a confirmation message. We don’t use advertising or
        cross-site tracking cookies.
      </p>
    ),
  },
  {
    heading: 'Changes',
    body: (
      <p>
        If we change this policy in a meaningful way, we’ll update the date at the top and, where it matters, let you know in the app or by email.
      </p>
    ),
  },
  {
    heading: 'Contact',
    body: <p>[Operator name], [contact email].</p>,
  },
];

export default function PrivacyPage() {
  return <LegalDocument title="Privacy policy" sections={SECTIONS} />;
}

import type { Metadata } from 'next';
import { LegalDocument, type LegalSection } from '../legal-document';

export const metadata: Metadata = {
  title: 'Terms of service',
  description: 'The plain-language terms for using Courtify as a player or a venue owner. A draft, not legal advice.',
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'What Courtify is',
    body: (
      <>
        <p>
          Courtify is a website where players find and book racket courts (pickleball, badminton, tennis, padel, table tennis and squash) in the
          Philippines, and where venue owners list their courts and manage bookings.
        </p>
        <p>
          Courtify connects players and venues. The venue runs the court, sets its own rates and rules, and is the one you’re booking with. Courtify
          isn’t a party to your booking and doesn’t run any court.
        </p>
      </>
    ),
  },
  {
    heading: 'Your account',
    body: (
      <>
        <p>You need an account to book, favourite venues or list a venue. To keep it safe:</p>
        <ul>
          <li>Give us accurate details, and keep your password to yourself.</li>
          <li>You’re responsible for what happens under your account.</li>
          <li>You must be old enough to enter a contract where you live, or have a parent or guardian’s permission.</li>
          <li>Tell us if you think someone else has got into your account.</li>
        </ul>
      </>
    ),
  },
  {
    heading: 'Booking and cancelling',
    body: (
      <>
        <p>
          When you book a slot, it’s held for you for the time the venue allows. Some venues ask you to pay at the venue. Others ask you to send a
          GCash payment and upload a screenshot as proof, and the booking is confirmed once the venue checks it.
        </p>
        <p>
          Courtify doesn’t take payment for court time. You pay the venue directly, and any refund is between you and the venue. Each venue sets its
          own cancellation cut-off, and you’ll see it before you book. Cancelling after the cut-off may not be allowed or may not be refunded.
        </p>
        <p>Turn up with your booking code. A venue can turn you away if you break its house rules.</p>
      </>
    ),
  },
  {
    heading: 'For venues',
    body: (
      <>
        <p>If you list a venue, you confirm that you’re the owner or are allowed to act for the owner. You also agree that:</p>
        <ul>
          <li>Your venue details, photos, rates and availability are accurate and kept up to date.</li>
          <li>You’ll honour the bookings you confirm, and tell players quickly if something changes.</li>
          <li>You’re responsible for your court, your staff, your safety rules and any permits or taxes that apply to your business.</li>
          <li>You check GCash proofs yourself. Courtify gives you the tools, not a guarantee that a payment is real.</li>
        </ul>
        <p>Courtify reviews each venue before it goes live and may ask you to change or add details first.</p>
      </>
    ),
  },
  {
    heading: 'Pro billing',
    body: (
      <>
        <p>
          Listing a venue is free. Pro is a paid plan, billed per venue, that adds online booking and the venue tools. Prices, the free trial and the
          grace period are shown on the For venues page and are set by Courtify, who may change them going forward.
        </p>
        <p>
          Pro billing is manual. You pay by GCash or bank transfer to the account shown on your dashboard and upload proof. Courtify checks the proof,
          and Pro then runs until its end date. If a payment can’t be verified, we’ll tell you why.
        </p>
        <p>
          If Pro isn’t renewed, your listing stays up on the free tier. New online bookings and walk-ins stop. Bookings that already exist stay valid,
          and you keep check-in for them.
        </p>
      </>
    ),
  },
  {
    heading: 'Acceptable use',
    body: (
      <>
        <p>Please don’t:</p>
        <ul>
          <li>Post anything false, misleading, unlawful or that infringes someone else’s rights.</li>
          <li>Make bookings you don’t plan to use, or book to block other players out.</li>
          <li>Upload a payment proof that isn’t yours or isn’t genuine.</li>
          <li>Scrape the site, probe it for weaknesses, or interfere with how it works.</li>
          <li>Harass players, venue staff or Courtify’s team.</li>
        </ul>
      </>
    ),
  },
  {
    heading: 'Suspension',
    body: (
      <p>
        We may suspend or remove an account, a venue listing or a review that breaks these terms or puts others at risk. Where we reasonably can,
        we’ll tell you why. You can close your account at any time by contacting us.
      </p>
    ),
  },
  {
    heading: 'Liability',
    body: (
      <>
        <p>
          Courtify is provided as it is. We work to keep it accurate and available, but we can’t promise it will always be free of errors or downtime.
        </p>
        <p>
          Sport carries a risk of injury, and the venue is responsible for the condition of its courts. To the extent the law allows, Courtify isn’t
          liable for injuries or losses at a venue, for what a venue or a player does, or for indirect losses. Nothing here limits any right you have
          under Philippine law that can’t be limited.
        </p>
      </>
    ),
  },
  {
    heading: 'Governing law',
    body: (
      <p>
        These terms are governed by the laws of the Philippines. Any dispute that can’t be settled by talking it through will be brought before the
        proper courts of the Philippines.
      </p>
    ),
  },
  {
    heading: 'Contact',
    body: <p>Questions about these terms? Email [contact email].</p>,
  },
];

export default function TermsPage() {
  return <LegalDocument title="Terms of service" sections={SECTIONS} />;
}

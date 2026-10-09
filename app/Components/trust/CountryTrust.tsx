'use client';

import Link from 'next/link';
import { trustProfile } from '../../lib/countryProfile.mjs';
import { EMAIL } from '../../lib/legalEntity';
import { useVisitorCountry } from '../../lib/useVisitorCountry';

/** Trust points that change with the visitor's country: how they pay, what they can cancel, which data law they can cite. */
export function CountryTrust({ className = '' }: { className?: string }) {
  const country = useVisitorCountry();
  const profile = trustProfile(country, EMAIL.privacy);
  return (
    <section aria-label={profile.heading} className={`rounded-2xl border border-[#4A4238]/12 dark:border-[#3A3430] bg-[#FFF9F3]/60 dark:bg-[#211E1C]/60 p-6 ${className}`}>
      <h3 className="font-serif text-xl text-[#322C28] dark:text-[#F4EDE5]">{profile.heading}</h3>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {profile.points.map((point) => (
          <li key={point.title}>
            <p className="text-sm font-medium text-[#322C28] dark:text-[#F4EDE5]">{point.title}</p>
            <p className="mt-0.5 text-sm text-[#5C534A] dark:text-[#C5B9AE]">{point.body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-[#5C534A] dark:text-[#C5B9AE]">
        {profile.links.map((link, i) => (
          <span key={link.href}>
            {i > 0 && ' · '}
            <Link href={link.href} className="text-[#C45A42] hover:underline">{link.label}</Link>
          </span>
        ))}
      </p>
    </section>
  );
}

'use client';

import { ArrowRight, Layers, Paperclip, Wrench } from 'lucide-react';
import SectionHeading from './SectionHeading';
import { formatGhs } from './theme';
import { UNIT_WORD, type ServiceOffer } from '@/lib/serviceOffers';

/**
 * The half of the shop you cannot put in a basket.
 *
 * These used to sit in the product grid with an Add to Cart button, which told
 * a customer they could buy an hour of IT support the way they buy a stapler.
 * They cannot: the shop has to see the job first. So the work has its own band,
 * its own cards, and one button that says what actually happens next.
 *
 * Deliberately not styled like a product card. A customer skimming should be
 * able to tell at a glance that this part of the page behaves differently —
 * same shop, same colour, but a request rather than a price tag.
 */

interface Props {
  offers: ServiceOffer[];
  /** Open the request drawer, on this service if one was named. */
  onRequest: (offer?: ServiceOffer) => void;
}

export default function ServicesSection({ offers, onRequest }: Props) {
  if (!offers.length) return null;

  return (
    <section id="services" className="scroll-mt-24">
      <SectionHeading
        eyebrow="Also from this shop"
        title="Work we can do for you"
        actionLabel={offers.length > 3 ? 'Request anything' : undefined}
        onAction={offers.length > 3 ? () => onRequest() : undefined}
      />

      <p className="text-sm text-gray-600 -mt-2 mb-4 max-w-2xl">
        Tell us what you need and we&apos;ll come back with a price before any work
        starts. Nothing is charged until you&apos;ve agreed it.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {offers.map(offer => (
          <article key={offer.id} className="store-service-card group flex flex-col">
            <div className="flex items-start gap-3">
              <span className="store-service-icon flex-shrink-0">
                {offer.is_solution ? <Layers className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
              </span>
              <div className="min-w-0 flex-1">
                {offer.category_name && (
                  <div className="text-[10px] font-bold uppercase tracking-[0.1em] truncate"
                    style={{ color: 'var(--store-brand-on-paper)' }}>
                    {offer.category_name}
                  </div>
                )}
                <h3 className="text-sm font-bold text-gray-900 leading-snug">
                  {offer.name}
                  {offer.is_solution && (
                    <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wide text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">
                      Package
                    </span>
                  )}
                </h3>
              </div>
            </div>

            {(offer.short_description || offer.description) && (
              <p className="text-sm text-gray-600 leading-relaxed mt-2.5 line-clamp-3">
                {offer.short_description || offer.description}
              </p>
            )}

            {offer.requires_file && (
              <p className="flex items-center gap-1.5 text-xs text-amber-800 mt-2.5">
                <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                Send us your file and we&apos;ll get started
              </p>
            )}

            <div className="mt-auto pt-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                {offer.priced ? (
                  <>
                    <div className="text-lg font-extrabold text-gray-900 tracking-tight tabular-nums">
                      {formatGhs(offer.price || 0)}
                    </div>
                    <div className="text-[11px] text-gray-400 leading-tight">
                      {UNIT_WORD[offer.unit_type] || 'each'} · confirmed when we quote
                    </div>
                  </>
                ) : (
                  <>
                    {/* Showing GHS 0.00 for something the shop prices by hand
                        would be a lie with a decimal point on it. */}
                    <div className="text-base font-bold text-gray-900">We&apos;ll quote you</div>
                    <div className="text-[11px] text-gray-400 leading-tight">Priced once we&apos;ve seen the job</div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRequest(offer)}
                className="store-btn store-btn-primary store-btn-sm flex-shrink-0 inline-flex items-center gap-1.5"
              >
                Request <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

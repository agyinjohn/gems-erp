'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BadgeCheck, Star } from 'lucide-react';
import Stars from './Stars';
import {
  fetchEligibility, fetchReviews, submitReview, whenAgo,
  type Eligibility, type ReviewSummary,
} from '@/lib/reviews';

/**
 * What other customers thought.
 *
 * Every review here came from a paid order for this product in this shop —
 * there is no other way to leave one, so "verified purchase" is not a badge
 * some of them earn but a description of all of them. That is the only reason
 * a star rating is worth a customer's attention, and the panel says so once
 * rather than stamping every row with a badge.
 *
 * A product nobody has reviewed shows the invitation and nothing else. Five
 * empty stars and "0.0" would read as a verdict rather than as silence.
 */

interface Props {
  tenantSlug: string;
  productSlug?: string;
  /** The score the catalogue already sent, so the panel has something to show
   *  before its own fetch lands. */
  ratingAvg?: number;
  ratingCount?: number;
  /** A signed-in customer is already known and is not asked who they are. */
  customerToken?: string;
  customerName?: string;
}

export default function ProductReviews({
  tenantSlug, productSlug, ratingAvg = 0, ratingCount = 0, customerToken, customerName,
}: Props) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [page, setPage] = useState(1);
  const [eligible, setEligible] = useState<Eligibility | null>(null);

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [name, setName] = useState(customerName || '');
  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [thanks, setThanks] = useState(false);

  const load = useCallback(async (p: number) => {
    if (!productSlug) return;
    try {
      const data = await fetchReviews(tenantSlug, productSlug, p);
      setSummary(prev => (p > 1 && prev
        ? { ...data, reviews: [...prev.reviews, ...data.reviews] }
        : data));
    } catch { /* A shop with no reviews yet is not an error. */ }
  }, [tenantSlug, productSlug]);

  useEffect(() => { setPage(1); load(1); }, [load]);

  // A signed-in customer can be checked straight away. A guest has to say which
  // email their receipt went to first, so there is nothing to check yet.
  useEffect(() => {
    if (!productSlug || !customerToken) return;
    fetchEligibility(tenantSlug, productSlug, { token: customerToken })
      .then(setEligible)
      .catch(() => {});
  }, [tenantSlug, productSlug, customerToken]);

  const checkEmail = async () => {
    if (!productSlug || !email.trim()) return;
    setChecking(true);
    setError('');
    try {
      setEligible(await fetchEligibility(tenantSlug, productSlug, { email: email.trim() }));
    } catch {
      setError('We could not check that just now.');
    } finally {
      setChecking(false);
    }
  };

  const send = async () => {
    if (!productSlug) return;
    if (!rating) return setError('Choose between one and five stars.');
    setSending(true);
    setError('');
    try {
      await submitReview(tenantSlug, productSlug,
        { rating, body: body.trim(), name: name.trim(), email: email.trim() }, customerToken);
      setThanks(true);
      setOpen(false);
      setRating(0); setBody('');
      setPage(1);
      await load(1);
      setEligible({ allowed: false, reason: 'You have already reviewed this.', reviewed: true });
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      setError(res?.data?.message || 'We could not save your review.');
    } finally {
      setSending(false);
    }
  };

  const avg = summary?.rating_avg ?? ratingAvg;
  const count = summary?.rating_count ?? ratingCount;
  const breakdown = summary?.breakdown || {};

  // No address, no reviews to read and none to write about.
  if (!productSlug) return null;

  return (
    <div>
      <h2 className="store-detail-heading">
        {count > 0 ? 'What customers said' : 'Be the first to review this'}
      </h2>

      {count > 0 ? (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-shrink-0">
            <div className="text-4xl font-extrabold text-gray-900 tabular-nums leading-none">{avg.toFixed(1)}</div>
            <Stars value={avg} size="md" className="mt-2" />
            <p className="text-xs text-gray-500 mt-1.5">
              {count} review{count === 1 ? '' : 's'}
            </p>
          </div>

          {/* The distribution, so an average of 4.3 can be read as "mostly
              fives with one bad experience" rather than as "middling".
              Only once the reviews themselves have arrived: the average and
              count come from the catalogue and are there on first paint, but
              the breakdown does not, and five empty bars beside "27 reviews"
              is the page contradicting itself while it loads. */}
          {summary && (
          <div className="flex-1 min-w-0 max-w-sm space-y-1">
            {[5, 4, 3, 2, 1].map(star => {
              const n = breakdown[String(star)] || 0;
              const pct = count ? (n / count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-gray-500 tabular-nums">{star}</span>
                  <Star className="w-3 h-3 text-gray-300 fill-gray-300 flex-shrink-0" />
                  <span className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <span className="block h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-6 text-right text-gray-400 tabular-nums">{n}</span>
                </div>
              );
            })}
          </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-600 mt-2 max-w-prose">
          Nobody has reviewed this yet. If you&apos;ve bought one, tell the next customer what it was like.
        </p>
      )}

      <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-4">
        <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
        Only customers who bought this can review it.
      </p>

      {/* ── Leaving one ── */}
      {thanks ? (
        <p className="mt-4 text-sm font-semibold text-emerald-700">Thank you — your review is up.</p>
      ) : eligible?.reviewed ? (
        <p className="mt-4 text-sm text-gray-500">You&apos;ve already reviewed this one.</p>
      ) : !open ? (
        <button type="button" onClick={() => setOpen(true)} className="store-btn-outline mt-4">
          Write a review
        </button>
      ) : (
        <div className="mt-4 rounded-2xl ring-1 ring-gray-200 p-5 max-w-xl">
          {/* A guest proves the purchase with the address their receipt went to.
              Checked before the form opens, so nobody writes three paragraphs
              and is then told they cannot post them. */}
          {!customerToken && !eligible?.allowed && (
            <div className="space-y-2.5">
              <label className="block text-sm font-semibold text-gray-900">
                Which email did you order with?
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  className="form-input flex-1"
                  placeholder="you@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && checkEmail()}
                />
                <button type="button" onClick={checkEmail} disabled={checking} className="store-btn store-btn-primary flex-shrink-0">
                  {checking ? 'Checking…' : 'Continue'}
                </button>
              </div>
              {eligible && !eligible.allowed && (
                <p className="flex items-start gap-2 text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {eligible.reason}
                </p>
              )}
            </div>
          )}

          {(customerToken || eligible?.allowed) && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">How was it?</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHover(star)}
                      onMouseLeave={() => setHover(0)}
                      aria-label={`${star} star${star === 1 ? '' : 's'}`}
                      className="p-0.5"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          star <= (hover || rating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-200 fill-gray-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {!customerName && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">Your name</label>
                  <input className="form-input w-full" value={name} onChange={e => setName(e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">Shown as a first name and an initial.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Anything you&apos;d tell the next customer? <span className="font-normal text-gray-400">Optional</span>
                </label>
                <textarea
                  rows={3} maxLength={1500}
                  className="form-input w-full resize-none"
                  placeholder="How it fits, how it held up, whether you'd buy it again…"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                />
              </div>

              {error && (
                <p className="flex items-start gap-2 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <button type="button" onClick={send} disabled={sending} className="store-btn store-btn-primary">
                  {sending ? 'Posting…' : 'Post review'}
                </button>
                <button type="button" onClick={() => { setOpen(false); setError(''); }} className="store-btn-outline">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Reading them ── */}
      {!!summary?.reviews.length && (
        <ul className="mt-8 divide-y divide-gray-100 border-t border-gray-100">
          {summary.reviews.map(r => (
            <li key={r.id} className="py-5">
              <div className="flex items-center gap-3 flex-wrap">
                <Stars value={r.rating} size="sm" />
                <span className="text-sm font-semibold text-gray-900">{r.name}</span>
                {r.variant_label && <span className="text-xs text-gray-500">{r.variant_label}</span>}
                <span className="text-xs text-gray-400 ml-auto">{whenAgo(r.created_at)}</span>
              </div>
              {r.hidden ? (
                <p className="text-sm text-gray-400 italic mt-2">
                  This review was taken down by the shop. Its rating still counts.
                </p>
              ) : r.body ? (
                <p className="text-[15px] text-gray-700 leading-relaxed mt-2 max-w-prose whitespace-pre-line">{r.body}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {summary?.has_more && (
        <button
          type="button"
          onClick={() => { const next = page + 1; setPage(next); load(next); }}
          className="store-btn-outline mt-5"
        >
          Read more reviews
        </button>
      )}
    </div>
  );
}

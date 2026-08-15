'use client';
import { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { toast } from '@/components/ui';
import {
  AlertTriangle, Eye, EyeOff, MessageSquare, Package, RefreshCw, Search, Star,
} from 'lucide-react';

/**
 * What customers said, for the shop they said it to.
 *
 * Two jobs. Seeing it — which product is dragging, what people actually
 * complain about, whether the shop is being scored fairly. And answering it,
 * which is the only real thing a business can do about a bad review: a two-star
 * review with "sorry, we've refunded the postage and sent a replacement"
 * underneath reads better to the next customer than four stars with nothing.
 *
 * There is no delete, and the page says so rather than leaving somebody hunting
 * for it. Hiding takes the text off the shop front and leaves the rating in the
 * average, so a shop can remove something abusive without being able to remove
 * the two-star reviews and watch its score climb — which is the only reason the
 * score is worth anything to the customer reading it.
 */

interface Review {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  product_image: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  variant_label: string;
  rating: number;
  body: string;
  reply: string;
  replied_at: string | null;
  is_hidden: boolean;
  created_at: string;
}

interface Summary {
  total: number;
  rating_avg: number;
  breakdown: Record<string, number>;
  hidden: number;
  needs_reply: number;
}

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Five stars at a glance. Whole stars here — a list is scanned, not studied. */
function StarRow({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} title={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [rating, setRating] = useState('');
  const [hidden, setHidden] = useState('');
  const [search, setSearch] = useState('');

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const r = await api.get('/reviews', {
        params: {
          page: p,
          ...(rating && { rating }),
          ...(hidden && { hidden }),
          ...(search.trim() && { search: search.trim() }),
        },
      });
      const d = r.data.data;
      setReviews(prev => (p > 1 ? [...prev, ...d.reviews] : d.reviews));
      setSummary(d.summary);
      setHasMore(d.has_more);
      setPage(p);
    } catch {
      toast.error('Could not load reviews');
    } finally {
      setLoading(false);
    }
  }, [rating, hidden, search]);

  useEffect(() => {
    const t = setTimeout(() => load(1), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const patch = async (id: string, body: Record<string, unknown>, done: string) => {
    setSaving(true);
    try {
      await api.patch(`/reviews/${id}`, body);
      toast.success(done);
      await load(1);
      setReplyingTo(null);
      setDraft('');
    } catch {
      toast.error('Could not save that');
    } finally {
      setSaving(false);
    }
  };

  const filtered = rating || hidden || search.trim();

  return (
    <AppLayout
      title="Reviews"
      subtitle="What customers said about what they bought"
      allowedRoles={['business_owner', 'branch_manager', 'sales_staff']}
    >
      {/* ── The shop's score ── */}
      {summary && summary.total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-200/70 p-5 flex items-center gap-5">
            <div>
              <div className="text-4xl font-extrabold text-gray-900 tabular-nums leading-none">
                {summary.rating_avg.toFixed(1)}
              </div>
              <StarRow value={Math.round(summary.rating_avg)} className="mt-2" />
              <p className="text-xs text-gray-500 mt-1.5">{summary.total} review{summary.total === 1 ? '' : 's'}</p>
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              {[5, 4, 3, 2, 1].map(star => {
                const n = summary.breakdown[String(star)] || 0;
                const pct = summary.total ? (n / summary.total) * 100 : 0;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === String(star) ? '' : String(star))}
                    className="flex items-center gap-2 text-xs w-full group"
                    title={`Show only ${star}-star reviews`}
                  >
                    <span className="w-3 text-gray-500 tabular-nums">{star}</span>
                    <Star className="w-3 h-3 text-gray-300 fill-gray-300 flex-shrink-0" />
                    <span className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <span className="block h-full rounded-full bg-amber-400 group-hover:bg-amber-500 transition-colors"
                        style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-6 text-right text-gray-400 tabular-nums">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* What is actually waiting on somebody. */}
          <button
            type="button"
            onClick={() => { setRating(''); setHidden(''); setSearch(''); }}
            className={`bg-white rounded-2xl border p-5 text-left transition-colors ${
              summary.needs_reply > 0 ? 'border-amber-200 hover:border-amber-300' : 'border-gray-200/70'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <MessageSquare className="w-3.5 h-3.5" /> Waiting on a reply
            </div>
            <div className="text-3xl font-extrabold text-gray-900 tabular-nums mt-2">{summary.needs_reply}</div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {summary.needs_reply > 0
                ? 'Three stars or fewer, with nothing from you underneath. An answer is read by everybody who comes after.'
                : 'Every poor review has an answer under it.'}
            </p>
          </button>

          <div className="bg-white rounded-2xl border border-gray-200/70 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <EyeOff className="w-3.5 h-3.5" /> Hidden
            </div>
            <div className="text-3xl font-extrabold text-gray-900 tabular-nums mt-2">{summary.hidden}</div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Text taken off the shop front. The rating still counts toward your average —
              hiding a review cannot change your score.
            </p>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="form-input pl-9"
            placeholder="Search a name or what they wrote…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="form-input w-auto" value={rating} onChange={e => setRating(e.target.value)}>
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}
        </select>
        <select className="form-input w-auto" value={hidden} onChange={e => setHidden(e.target.value)}>
          <option value="">Shown and hidden</option>
          <option value="false">Shown on the shop</option>
          <option value="true">Hidden</option>
        </select>
        {filtered && (
          <button
            type="button"
            onClick={() => { setRating(''); setHidden(''); setSearch(''); }}
            className="text-xs text-[#0D3B6E] font-semibold hover:underline"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={() => load(1)}
          className="ml-auto text-gray-400 hover:text-gray-700 p-2"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── The reviews ── */}
      {loading && !reviews.length ? (
        <div className="flex justify-center py-16"><RefreshCw className="w-6 h-6 text-gray-300 animate-spin" /></div>
      ) : !reviews.length ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 p-12 text-center">
          <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-900">
            {filtered ? 'Nothing matches that' : 'No reviews yet'}
          </p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
            {filtered
              ? 'Try a different rating or clear the filters.'
              : 'Customers can review anything they have bought and paid for. The first one will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div
              key={r.id}
              className={`bg-white rounded-2xl border p-5 ${
                r.is_hidden ? 'border-gray-200/70 opacity-70' : 'border-gray-200/70'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-50 ring-1 ring-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {r.product_image
                    ? <img src={r.product_image} alt="" className="w-full h-full object-cover" />
                    : <Package className="w-5 h-5 text-gray-300" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <StarRow value={r.rating} />
                    <span className="text-sm font-bold text-gray-900">{r.product_name}</span>
                    {r.variant_label && (
                      <span className="text-xs text-gray-500 bg-gray-100 rounded-md px-1.5 py-0.5">{r.variant_label}</span>
                    )}
                    {r.is_hidden && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                        Hidden
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    {r.customer_name}
                    <span className="text-gray-300 mx-1.5">·</span>
                    <a href={`mailto:${r.customer_email}`} className="hover:underline">{r.customer_email}</a>
                    <span className="text-gray-300 mx-1.5">·</span>
                    {when(r.created_at)}
                    {r.order_number && (
                      <>
                        <span className="text-gray-300 mx-1.5">·</span>
                        <span className="font-mono">{r.order_number}</span>
                      </>
                    )}
                  </p>

                  {r.body ? (
                    <p className="text-sm text-gray-700 leading-relaxed mt-2.5 whitespace-pre-line max-w-prose">{r.body}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic mt-2.5">A rating with no words.</p>
                  )}

                  {/* The shop's answer, or the box to write one. */}
                  {replyingTo === r.id ? (
                    <div className="mt-3 max-w-prose">
                      <textarea
                        rows={3} maxLength={1000} autoFocus
                        className="form-input w-full resize-none"
                        placeholder="Answer them here. Everybody who reads this review will read your reply."
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button" disabled={saving}
                          onClick={() => patch(r.id, { reply: draft }, draft.trim() ? 'Reply posted' : 'Reply removed')}
                          className="btn-primary text-sm"
                        >
                          {saving ? 'Saving…' : draft.trim() ? 'Post reply' : 'Remove reply'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setReplyingTo(null); setDraft(''); }}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : r.reply ? (
                    <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-3.5 max-w-prose">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                        Your reply{r.replied_at ? ` · ${when(r.replied_at)}` : ''}
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{r.reply}</p>
                      <button
                        type="button"
                        onClick={() => { setReplyingTo(r.id); setDraft(r.reply); }}
                        className="text-xs text-[#0D3B6E] font-semibold hover:underline mt-2"
                      >
                        Edit
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {!r.reply && replyingTo !== r.id && (
                    <button
                      type="button"
                      onClick={() => { setReplyingTo(r.id); setDraft(''); }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D3B6E] hover:underline whitespace-nowrap"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Reply
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => patch(r.id, { is_hidden: !r.is_hidden },
                      r.is_hidden ? 'Back on your shop' : 'Hidden from your shop')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 whitespace-nowrap"
                    title={r.is_hidden
                      ? 'Put the text back on your shop front'
                      : 'Take the text off your shop front. The rating still counts.'}
                  >
                    {r.is_hidden
                      ? <><Eye className="w-3.5 h-3.5" /> Show</>
                      : <><EyeOff className="w-3.5 h-3.5" /> Hide</>}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={() => load(page + 1)}
              disabled={loading}
              className="btn-secondary w-full"
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}

      {/* Said once, at the bottom, rather than argued with on every row. */}
      {!!reviews.length && (
        <p className="flex items-start gap-2 text-xs text-gray-500 mt-6 max-w-2xl">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
          <span>
            Reviews cannot be deleted. Hiding one takes its text off your shop front and leaves its
            rating in your average — which is what makes your score worth something to the customer
            reading it. Only customers who have bought and paid for an item can review it.
          </span>
        </p>
      )}
    </AppLayout>
  );
}

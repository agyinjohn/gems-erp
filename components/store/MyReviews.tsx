'use client';

import { useCallback, useEffect, useState } from 'react';
import { EyeOff, Package, Star, Store } from 'lucide-react';
import Stars from './Stars';
import {
  fetchMyReviews, updateMyReview, whenAgo,
  type AwaitingReview, type MyReview,
} from '@/lib/reviews';

/**
 * What this customer has said, and what they have not said yet.
 *
 * Both halves earn their place. Their own reviews are theirs to look back at
 * and to correct — a one-star review left before the shop put the problem right
 * is a complaint with no way to withdraw it, and a rating nobody can update is
 * one that slowly stops being true.
 *
 * And the things they bought and never got round to talking about. Somebody who
 * bought three items and reviewed one is not withholding the other two; they
 * forgot. This is where a shop with four reviews becomes a shop with forty.
 */

interface Props {
  token: string;
  tenantSlug: string;
  /** Open a product's page, so the row can lead somewhere. */
  onOpenProduct: (slug: string) => void;
}

export default function MyReviews({ token, tenantSlug, onOpenProduct }: Props) {
  const [written, setWritten] = useState<MyReview[]>([]);
  const [awaiting, setAwaiting] = useState<AwaitingReview[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchMyReviews(token);
      setWritten(d.written);
      setAwaiting(d.awaiting);
    } catch { /* An account with nothing in it is not an error. */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const save = async (id: string) => {
    setSaving(true);
    try {
      await updateMyReview(id, { rating, body: body.trim() }, token);
      setEditing(null);
      await load();
    } catch { /* Left in the editor so nothing typed is lost. */ }
    finally { setSaving(false); }
  };

  if (loading) {
    return <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>;
  }

  if (!written.length && !awaiting.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Star className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">Nothing to review yet</p>
        <p className="text-xs mt-1 text-center max-w-[15rem] leading-relaxed">
          Once an order is paid for, you can tell the next customer what it was like.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* ── Not yet said ── */}
      {awaiting.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900">Tell us what you thought</h3>
          {/* The whole sentence inside the expression. Split as text either
              side of a conditional, JSX ate the space before "and" and it
              rendered as "you bought theseand haven't". */}
          <p className="text-xs text-gray-500 mt-0.5 mb-3">
            {awaiting.length === 1
              ? "You bought this and haven't said anything yet."
              : "You bought these and haven't said anything yet."}
          </p>
          <ul className="space-y-2">
            {awaiting.map(a => (
              <li key={`${a.product_id}-${a.order_number}`}>
                <button
                  type="button"
                  disabled={!a.product_slug}
                  onClick={() => onOpenProduct(a.product_slug)}
                  className="w-full text-left flex items-center gap-3 rounded-xl ring-1 ring-gray-200 p-3 hover:ring-gray-300 transition-colors disabled:opacity-60"
                >
                  <span className="w-11 h-11 rounded-lg bg-gray-50 ring-1 ring-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {a.product_image
                      ? <img src={a.product_image} alt="" className="w-full h-full object-cover" />
                      : <Package className="w-4 h-4 text-gray-300" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900 truncate">{a.product_name}</span>
                    <span className="block text-xs text-gray-500">
                      {a.variant_label && <>{a.variant_label} · </>}
                      Bought {whenAgo(a.bought_at)}
                    </span>
                  </span>
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--store-brand-on-paper)' }}>
                    Review
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Already said ── */}
      {written.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-3">
            Your reviews <span className="font-normal text-gray-400">({written.length})</span>
          </h3>
          <ul className="space-y-3">
            {written.map(r => (
              <li key={r.id} className="rounded-xl ring-1 ring-gray-200 p-3.5">
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-lg bg-gray-50 ring-1 ring-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {r.product_image
                      ? <img src={r.product_image} alt="" className="w-full h-full object-cover" />
                      : <Package className="w-4 h-4 text-gray-300" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      disabled={!r.product_slug}
                      onClick={() => onOpenProduct(r.product_slug)}
                      className="block text-sm font-semibold text-gray-900 truncate text-left hover:underline disabled:no-underline"
                    >
                      {r.product_name}
                    </button>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Stars value={r.rating} size="sm" />
                      <span className="text-xs text-gray-400">{whenAgo(r.created_at)}</span>
                      {r.variant_label && <span className="text-xs text-gray-500">{r.variant_label}</span>}
                    </div>
                  </div>
                </div>

                {editing === r.id ? (
                  <div className="mt-3 space-y-2.5">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star} type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHover(star)}
                          onMouseLeave={() => setHover(0)}
                          aria-label={`${star} star${star === 1 ? '' : 's'}`}
                          className="p-0.5"
                        >
                          <Star className={`w-6 h-6 transition-colors ${
                            star <= (hover || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'
                          }`} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={3} maxLength={1500}
                      className="form-input w-full resize-none"
                      value={body}
                      onChange={e => setBody(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => save(r.id)} disabled={saving}
                        className="store-btn store-btn-primary store-btn-sm">
                        {saving ? 'Saving…' : 'Save changes'}
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className="store-btn-quiet">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {r.body && (
                      <p className="text-sm text-gray-700 leading-relaxed mt-2.5 whitespace-pre-line">{r.body}</p>
                    )}

                    {/* Their words are off the shop front. Told to them rather
                        than concealed — and so is the part that has not
                        changed, which is that their rating still counts. */}
                    {r.is_hidden && (
                      <p className="flex items-start gap-2 text-xs text-gray-500 mt-2.5">
                        <EyeOff className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        The shop has taken this text off its page. Your rating still counts toward the score.
                      </p>
                    )}

                    {r.reply && (
                      <div className="mt-2.5 rounded-lg bg-gray-50 border border-gray-100 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                          <Store className="w-3.5 h-3.5" /> The shop replied
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{r.reply}</p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => { setEditing(r.id); setRating(r.rating); setBody(r.body); }}
                      className="text-xs font-semibold mt-2.5 hover:underline"
                      style={{ color: 'var(--store-brand-on-paper)' }}
                    >
                      Change what I said
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

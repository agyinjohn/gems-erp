'use client';
import { X, Printer } from 'lucide-react';

/**
 * A payment certificate, laid out for paper.
 *
 * The reason an invoice on its own won't do: a construction valuation is
 * cumulative, so what falls due has to be shown as arithmetic — gross work to
 * date, less retention, less everything already certified — rather than
 * asserted as a single number. Set out that way a quantity surveyor can check
 * it, which is the whole point of issuing one.
 *
 * Printing is the browser's, so the output is whatever the user's print dialog
 * produces — including "Save as PDF". Everything but the document itself is
 * hidden at print time, the same approach the POS receipt takes.
 */

interface Party {
  name: string; contact?: string; address?: string;
  phone?: string; email?: string; logo?: string;
}
export interface Certificate {
  certificate_no: number;
  type: 'interim' | 'retention_release';
  title: string;
  issued_on: string;
  due_on: string;
  invoice_number: string;
  status: string;
  amount_paid: number;
  balance_outstanding: number;
  notes?: string;
  parties: { contractor: Party; employer: Party };
  contract: {
    project_name: string; project_code: string; site_address: string; currency: string;
    original_sum: number; approved_variations: number; adjusted_sum: number;
    retention_pct: number; start_date: string | null; planned_end_date: string | null;
  };
  valuation: Record<string, number>;
  lines: { description: string; quantity: number; unit_price: number; total: number }[];
}

const date = (d?: string | null) =>
  (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function PaymentCertificate({
  cert, onClose,
}: { cert: Certificate; onClose: () => void }) {
  const cur = cert.contract.currency || 'GHS';
  const money = (n: number) =>
    `${cur} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const v = cert.valuation;
  const isRelease = cert.type === 'retention_release';

  // Each row is [label, value, emphasis]. Built as data so the running
  // subtraction reads in one place rather than being spread through markup.
  const rows: [string, number, 'plain' | 'deduct' | 'subtotal' | 'total'][] = isRelease
    ? [
      ['Retention withheld to date', v.retention_withheld_to_date, 'plain'],
      ['Less retention previously released', -v.previously_released, 'deduct'],
      ['Retention held before this certificate', v.retention_held_before_this, 'subtotal'],
      ['Amount released by this certificate', v.amount_now_due, 'total'],
      ['Retention still held', v.retention_still_held, 'plain'],
    ]
    : [
      ['Gross value of work executed to date', v.gross_value_to_date, 'plain'],
      [`Less retention at ${cert.contract.retention_pct}%`, -v.retention_to_date, 'deduct'],
      ['Net value to date', v.net_value_to_date, 'subtotal'],
      ['Less amount previously certified', -v.previously_certified, 'deduct'],
      ['Amount now due', v.amount_now_due, 'total'],
    ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto print:p-0 print:overflow-visible">
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body * { visibility: hidden !important; }
          #certificate-print, #certificate-print * { visibility: visible !important; }
          #certificate-print {
            position: absolute; left: 0; top: 0; width: 100%;
            box-shadow: none !important; border-radius: 0 !important;
            color: #000; background: #fff;
          }
          #certificate-print .no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm no-print" onClick={onClose} />

      <div id="certificate-print" className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4">
        {/* Toolbar — never printed */}
        <div className="no-print flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">{cert.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Print, or choose “Save as PDF” in the print dialog to send it on.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-primary" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Print
            </button>
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── The document ── */}
        <div className="px-8 py-8 text-[13px] leading-relaxed text-gray-900">

          <div className="flex items-start justify-between gap-6 pb-5 border-b-2 border-gray-900">
            <div className="min-w-0">
              <p className="text-lg font-extrabold tracking-tight">{cert.parties.contractor.name}</p>
              {cert.parties.contractor.address && <p className="text-gray-600">{cert.parties.contractor.address}</p>}
              <p className="text-gray-600">
                {[cert.parties.contractor.phone, cert.parties.contractor.email].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-extrabold uppercase tracking-wide">{cert.title}</p>
              <p className="text-gray-600">No. {String(cert.certificate_no).padStart(3, '0')}</p>
              <p className="text-gray-600">Ref {cert.invoice_number}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 py-5 border-b border-gray-200">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Employer</p>
              <p className="font-semibold">{cert.parties.employer.name || '—'}</p>
              {cert.parties.employer.contact && <p className="text-gray-600">Attn: {cert.parties.employer.contact}</p>}
              {cert.parties.employer.address && <p className="text-gray-600">{cert.parties.employer.address}</p>}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">The works</p>
              <p className="font-semibold">{cert.contract.project_name}</p>
              <p className="text-gray-600">{cert.contract.project_code}</p>
              {cert.contract.site_address && <p className="text-gray-600">{cert.contract.site_address}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 py-4 border-b border-gray-200">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Date of issue</p>
              <p className="font-semibold">{date(cert.issued_on)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Payment due</p>
              <p className="font-semibold">{date(cert.due_on)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Contract period</p>
              <p className="font-semibold">{date(cert.contract.start_date)} – {date(cert.contract.planned_end_date)}</p>
            </div>
          </div>

          {/* Contract sum */}
          <div className="py-4 border-b border-gray-200">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Contract sum</p>
            <dl className="space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-600">Original contract sum</dt>
                <dd className="tabular-nums">{money(cert.contract.original_sum)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Approved variations</dt>
                <dd className="tabular-nums">{money(cert.contract.approved_variations)}</dd>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200 font-semibold">
                <dt>Adjusted contract sum</dt>
                <dd className="tabular-nums">{money(cert.contract.adjusted_sum)}</dd>
              </div>
            </dl>
          </div>

          {/* The valuation — the part that has to be checkable */}
          <div className="py-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              {isRelease ? 'Retention account' : 'Valuation'}
            </p>
            <dl className="space-y-1">
              {rows.map(([label, value, kind]) => (
                <div
                  key={label}
                  className={
                    kind === 'total'
                      ? 'flex justify-between mt-2 pt-2 border-t-2 border-gray-900 text-[15px] font-extrabold'
                      : kind === 'subtotal'
                        ? 'flex justify-between pt-1 border-t border-gray-300 font-semibold'
                        : 'flex justify-between'
                  }
                >
                  <dt className={kind === 'plain' || kind === 'deduct' ? 'text-gray-600' : ''}>{label}</dt>
                  <dd className="tabular-nums">
                    {value < 0 ? `(${money(Math.abs(value))})` : money(value)}
                  </dd>
                </div>
              ))}
            </dl>

            {!isRelease && (
              <p className="text-gray-500 text-xs mt-3">
                {v.certified_pct?.toFixed(1)}% of the adjusted contract sum certified to date.
                {' '}{money(v.remaining_to_certify)} remains.
              </p>
            )}
          </div>

          {/* What this certificate covers */}
          {cert.lines?.length > 0 && (
            <div className="py-4 border-t border-gray-200">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                Covered by this certificate
              </p>
              <table className="w-full">
                <tbody>
                  {cert.lines.map((l, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-1.5 text-gray-700">{l.description}</td>
                      <td className="py-1.5 text-right tabular-nums">{money(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {cert.notes && (
            <div className="py-3 border-t border-gray-200">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
              <p className="text-gray-700">{cert.notes}</p>
            </div>
          )}

          {cert.amount_paid > 0 && (
            <div className="py-3 border-t border-gray-200 flex justify-between text-gray-700">
              <span>Received against this certificate</span>
              <span className="tabular-nums">
                {money(cert.amount_paid)} · {money(cert.balance_outstanding)} outstanding
              </span>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-10 pt-10 mt-4">
            {['Certified by', 'Received and accepted'].map(role => (
              <div key={role}>
                <div className="border-b border-gray-400 h-10" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-1">{role}</p>
                <p className="text-gray-500 text-xs mt-3">Name</p>
                <div className="border-b border-gray-300 h-5" />
                <p className="text-gray-500 text-xs mt-3">Date</p>
                <div className="border-b border-gray-300 h-5" />
              </div>
            ))}
          </div>

          <p className="text-center text-[10px] text-gray-400 mt-8">
            This certificate states the value of work executed to date. Amounts already certified are
            deducted, so it supersedes nothing — earlier certificates stand as issued.
          </p>
        </div>
      </div>
    </div>
  );
}

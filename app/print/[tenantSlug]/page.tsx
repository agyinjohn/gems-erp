import { permanentRedirect } from 'next/navigation';

/**
 * The intake page lived at /print before it handled anything but printing.
 *
 * Clients were given that link on counters, receipts and printed codes, and a
 * QR code stuck to a shop counter cannot be edited. So the old address keeps
 * working and sends them to the same form under its current name.
 */
export default async function PrintIntakeRedirect({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  permanentRedirect(`/services/${tenantSlug}`);
}

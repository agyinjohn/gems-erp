/**
 * What to call the place money is taken over the counter.
 *
 * "POS Terminal" is a shop word. A design studio billing a client for a company
 * profile is not making a point-of-sale transaction, and a firm that has never
 * sold anything off a shelf should not have to work out that the till is where
 * it goes to invoice work. The page is the same either way — what it is called
 * follows what the business actually has on its list.
 *
 * The mix comes from the catalogue rather than a setting, so a printer that
 * starts stocking paper is called the right thing the next time it signs in.
 */

export type CatalogMix = 'products' | 'services' | 'both' | 'empty';

export interface CounterName {
  /** Sidebar. Short enough not to wrap. */
  nav: string;
  title: string;
  subtitle: string;
}

const NAMES: Record<CatalogMix, CounterName> = {
  products: {
    nav: 'POS',
    title: 'Point of Sale',
    subtitle: 'Walk-in sales terminal',
  },
  services: {
    nav: 'Service Counter',
    title: 'Service Counter',
    subtitle: 'Bill a client for work, on the spot',
  },
  both: {
    nav: 'Sales Counter',
    title: 'Sales Counter',
    subtitle: 'Ring up work and goods for whoever is at the counter',
  },
  // Nothing on the list yet, so nothing to go on. The name that covers both is
  // the one that cannot be wrong later.
  empty: {
    nav: 'Sales Counter',
    title: 'Sales Counter',
    subtitle: 'Ring up work and goods for whoever is at the counter',
  },
};

export function counterName(sells?: string): CounterName {
  return NAMES[(sells as CatalogMix)] || NAMES.both;
}

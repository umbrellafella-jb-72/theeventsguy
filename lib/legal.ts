// Who runs The Events Guy, for the privacy, data processing and charity payments pages.
// Anything still in [square brackets] needs your details before launch — it's highlighted on the pages.
export const OPERATOR = {
  name: process.env.NEXT_PUBLIC_LEGAL_NAME || '[Your company or trading name]',
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || '[Registered address]',
  companyNo: process.env.NEXT_PUBLIC_COMPANY_NUMBER || '',
  ico: process.env.NEXT_PUBLIC_ICO_NUMBER || '[ICO registration number]',
  email: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || '[privacy contact email]',
  updated: '11 November 2026',
};

// How the charity share is worked out and paid. Confirm these with your accountant.
export const CHARITY_PAYMENTS = {
  basis: process.env.NEXT_PUBLIC_CHARITY_BASIS || '[before or after VAT and card fees — confirm]',
  frequency: process.env.NEXT_PUBLIC_CHARITY_FREQUENCY || 'every quarter',
};

/** Shows a placeholder highlighted so it's easy to spot before launch. */
export const isPlaceholder = (s: string) => s.startsWith('[');

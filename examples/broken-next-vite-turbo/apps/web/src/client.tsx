"use client";

export function BillingBanner() {
  const apiUrl = import.meta.env.API_URL;
  const stripeSecret = import.meta.env.VITE_STRIPE_SECRET_KEY;
  const privateServerSecret = process.env.SERVER_SECRET;
  const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  return (
    <pre>
      {JSON.stringify({ apiUrl, stripeSecret, privateServerSecret, publicSiteUrl }, null, 2)}
    </pre>
  );
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSiteSettings, useUpsertSiteSetting } from "@/hooks/use-site-settings";

const KEYS = {
  provider: "platform_payment_provider",
  stripePublishable: "platform_stripe_publishable_key",
  stripeLinkStarter: "platform_stripe_payment_link_starter",
  stripeLinkLifetime: "platform_stripe_payment_link_lifetime",
  stripeLinkPro: "platform_stripe_payment_link_pro", // legacy → maps to Lifetime
  paypalClientId: "platform_paypal_client_id",
  paypalUrlStarter: "platform_paypal_payment_url_starter",
  paypalUrlLifetime: "platform_paypal_payment_url_lifetime",
  paypalUrlPro: "platform_paypal_payment_url_pro", // legacy → maps to Lifetime
  paypalPaymentUrl: "platform_paypal_payment_url",
} as const;

export type PaymentProvider = "" | "stripe" | "paypal" | "both";

export interface PlatformPaymentSettings {
  provider: PaymentProvider;
  stripePublishableKey: string;
  stripePaymentLinkStarter: string;
  stripePaymentLinkLifetime: string;
  paypalClientId: string;
  paypalPaymentUrlStarter: string;
  paypalPaymentUrlLifetime: string;
}

const defaults: PlatformPaymentSettings = {
  provider: "",
  stripePublishableKey: "",
  stripePaymentLinkStarter: "",
  stripePaymentLinkLifetime: "",
  paypalClientId: "",
  paypalPaymentUrlStarter: "",
  paypalPaymentUrlLifetime: "",
};

function getSetting(settings: { key: string; value: string | null }[] | undefined, key: string): string {
  const s = settings?.find((x) => x.key === key);
  return s?.value ?? "";
}

export function usePlatformPaymentSettings() {
  const { data: settings } = useSiteSettings(null);
  const upsert = useUpsertSiteSetting();
  const qc = useQueryClient();

  const legacyUrl = getSetting(settings, KEYS.paypalPaymentUrl);
  const data: PlatformPaymentSettings = {
    provider: (getSetting(settings, KEYS.provider) || "") as PaymentProvider,
    stripePublishableKey: getSetting(settings, KEYS.stripePublishable),
    stripePaymentLinkStarter: getSetting(settings, KEYS.stripeLinkStarter),
    stripePaymentLinkLifetime: getSetting(settings, KEYS.stripeLinkLifetime) || getSetting(settings, KEYS.stripeLinkPro),
    paypalClientId: getSetting(settings, KEYS.paypalClientId),
    paypalPaymentUrlStarter: getSetting(settings, KEYS.paypalUrlStarter) || legacyUrl,
    paypalPaymentUrlLifetime: getSetting(settings, KEYS.paypalUrlLifetime) || getSetting(settings, KEYS.paypalUrlPro) || legacyUrl,
  };

  const update = async (next: Partial<PlatformPaymentSettings>) => {
    const updates = { ...data, ...next };
    await Promise.all([
      upsert.mutateAsync({ key: KEYS.provider, value: updates.provider || null, tenant_id: null }),
      upsert.mutateAsync({ key: KEYS.stripePublishable, value: updates.stripePublishableKey || null, tenant_id: null }),
      upsert.mutateAsync({ key: KEYS.stripeLinkStarter, value: updates.stripePaymentLinkStarter || null, tenant_id: null }),
      upsert.mutateAsync({ key: KEYS.stripeLinkLifetime, value: updates.stripePaymentLinkLifetime || null, tenant_id: null }),
      upsert.mutateAsync({ key: KEYS.paypalClientId, value: updates.paypalClientId || null, tenant_id: null }),
      upsert.mutateAsync({ key: KEYS.paypalUrlStarter, value: updates.paypalPaymentUrlStarter || null, tenant_id: null }),
      upsert.mutateAsync({ key: KEYS.paypalUrlLifetime, value: updates.paypalPaymentUrlLifetime || null, tenant_id: null }),
    ]);
    qc.invalidateQueries({ queryKey: ["site-settings", null] });
  };

  return { data, update, isUpdating: upsert.isPending };
}

/** Public hook for Pricing/checkout: only reads provider and payment links (no secrets). */
export function usePublicPaymentOptions() {
  const { data: settings } = useSiteSettings(null);
  const legacyUrl = getSetting(settings, KEYS.paypalPaymentUrl);
  return {
    provider: (getSetting(settings, KEYS.provider) || "") as PaymentProvider,
    stripePaymentLinkStarter: getSetting(settings, KEYS.stripeLinkStarter),
    stripePaymentLinkLifetime: getSetting(settings, KEYS.stripeLinkLifetime) || getSetting(settings, KEYS.stripeLinkPro),
    paypalPaymentUrlStarter: getSetting(settings, KEYS.paypalUrlStarter) || legacyUrl,
    paypalPaymentUrlLifetime: getSetting(settings, KEYS.paypalUrlLifetime) || getSetting(settings, KEYS.paypalUrlPro) || legacyUrl,
    paypalClientId: getSetting(settings, KEYS.paypalClientId),
  };
}

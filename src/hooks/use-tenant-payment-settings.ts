import { useSiteSettings, useUpsertSiteSetting } from "@/hooks/use-site-settings";

/** Keys for tenant-level payment settings (booking payments go to this tenant's account). */
export const TENANT_PAYMENT_KEYS = {
  paypalClientId: "paypal_client_id",
  paypalClientSecret: "paypal_client_secret",
  stripePublishableKey: "stripe_publishable_key",
  stripeSecretKey: "stripe_secret_key",
  mpesaConsumerKey: "mpesa_consumer_key",
  mpesaConsumerSecret: "mpesa_consumer_secret",
  mpesaShortcode: "mpesa_shortcode",
  mpesaPasskey: "mpesa_passkey",
  payAtVenueEnabled: "pay_at_venue_enabled",
  cancelByHours: "cancel_by_hours",
  noShowAfterMinutes: "no_show_after_minutes",
} as const;

/** Returns tenant payment config for the booking page. Only safe/public values (no secrets). */
export function useTenantPaymentSettings(tenantId: string | undefined) {
  const { data: settings } = useSiteSettings(tenantId ?? null);
  const get = (key: string) => settings?.find((s) => s.key === key)?.value ?? "";
  const paypalClientId = get(TENANT_PAYMENT_KEYS.paypalClientId);
  const stripePublishableKey = get(TENANT_PAYMENT_KEYS.stripePublishableKey);
  const mpesaShortcode = get(TENANT_PAYMENT_KEYS.mpesaShortcode);
  const mpesaConsumerKey = get(TENANT_PAYMENT_KEYS.mpesaConsumerKey);
  const payAtVenueRaw = get(TENANT_PAYMENT_KEYS.payAtVenueEnabled);
  const payAtVenueEnabled = payAtVenueRaw !== "false" && payAtVenueRaw !== "0";
  return {
    paypalClientId: paypalClientId || undefined,
    stripePublishableKey: stripePublishableKey || undefined,
    mpesaConfigured: !!(mpesaShortcode && mpesaConsumerKey),
    hasAnyPayment: !!(paypalClientId || stripePublishableKey || (mpesaShortcode && mpesaConsumerKey)),
    payAtVenueEnabled,
  };
}

export type TenantPaymentSaveValues = {
  paypalClientId?: string;
  paypalClientSecret?: string;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  mpesaConsumerKey?: string;
  mpesaConsumerSecret?: string;
  mpesaShortcode?: string;
  mpesaPasskey?: string;
  payAtVenueEnabled?: boolean;
  cancelByHours?: number;
  noShowAfterMinutes?: number;
};

/** For tenant payment form (Platform edit tenant / Admin Settings): load and save. Secrets are write-only. */
export function useTenantPaymentSettingsForm(tenantId: string | undefined) {
  const { data: settings } = useSiteSettings(tenantId ?? null);
  const upsert = useUpsertSiteSetting();
  const get = (key: string) => settings?.find((s) => s.key === key)?.value ?? "";
  const paypalClientId = get(TENANT_PAYMENT_KEYS.paypalClientId);
  const stripePublishableKey = get(TENANT_PAYMENT_KEYS.stripePublishableKey);
  const mpesaConsumerKey = get(TENANT_PAYMENT_KEYS.mpesaConsumerKey);
  const mpesaShortcode = get(TENANT_PAYMENT_KEYS.mpesaShortcode);
  const payAtVenueRaw = get(TENANT_PAYMENT_KEYS.payAtVenueEnabled);
  const payAtVenueEnabled = payAtVenueRaw !== "false" && payAtVenueRaw !== "0";
  const cancelByHoursRaw = get(TENANT_PAYMENT_KEYS.cancelByHours);
  const cancelByHours = cancelByHoursRaw !== "" ? Math.max(0, parseInt(cancelByHoursRaw, 10) || 0) : 24;
  const noShowAfterMinutesRaw = get(TENANT_PAYMENT_KEYS.noShowAfterMinutes);
  const noShowAfterMinutes = noShowAfterMinutesRaw !== "" ? Math.max(0, parseInt(noShowAfterMinutesRaw, 10) || 0) : 0;

  const save = async (values: TenantPaymentSaveValues) => {
    if (!tenantId) return;
    if (values.paypalClientId != null) {
      await upsert.mutateAsync({
        key: TENANT_PAYMENT_KEYS.paypalClientId,
        value: values.paypalClientId.trim() || null,
        tenant_id: tenantId,
      });
    }
    if (values.paypalClientSecret != null && values.paypalClientSecret.trim() !== "") {
      await upsert.mutateAsync({
        key: TENANT_PAYMENT_KEYS.paypalClientSecret,
        value: values.paypalClientSecret.trim(),
        tenant_id: tenantId,
      });
    }
    if (values.stripePublishableKey != null) {
      await upsert.mutateAsync({
        key: TENANT_PAYMENT_KEYS.stripePublishableKey,
        value: values.stripePublishableKey.trim() || null,
        tenant_id: tenantId,
      });
    }
    if (values.stripeSecretKey != null && values.stripeSecretKey.trim() !== "") {
      await upsert.mutateAsync({
        key: TENANT_PAYMENT_KEYS.stripeSecretKey,
        value: values.stripeSecretKey.trim(),
        tenant_id: tenantId,
      });
    }
    if (values.mpesaConsumerKey != null) {
      await upsert.mutateAsync({
        key: TENANT_PAYMENT_KEYS.mpesaConsumerKey,
        value: values.mpesaConsumerKey.trim() || null,
        tenant_id: tenantId,
      });
    }
    if (values.mpesaConsumerSecret != null && values.mpesaConsumerSecret.trim() !== "") {
      await upsert.mutateAsync({
        key: TENANT_PAYMENT_KEYS.mpesaConsumerSecret,
        value: values.mpesaConsumerSecret.trim(),
        tenant_id: tenantId,
      });
    }
    if (values.mpesaShortcode != null) {
      await upsert.mutateAsync({
        key: TENANT_PAYMENT_KEYS.mpesaShortcode,
        value: values.mpesaShortcode.trim() || null,
        tenant_id: tenantId,
      });
    }
    if (values.mpesaPasskey != null && values.mpesaPasskey.trim() !== "") {
      await upsert.mutateAsync({
        key: TENANT_PAYMENT_KEYS.mpesaPasskey,
        value: values.mpesaPasskey.trim(),
        tenant_id: tenantId,
      });
    }
    if (values.payAtVenueEnabled != null) {
      await upsert.mutateAsync({
        key: TENANT_PAYMENT_KEYS.payAtVenueEnabled,
        value: values.payAtVenueEnabled ? "true" : "false",
        tenant_id: tenantId,
      });
    }
    if (values.cancelByHours != null) {
      await upsert.mutateAsync({
        key: TENANT_PAYMENT_KEYS.cancelByHours,
        value: String(values.cancelByHours),
        tenant_id: tenantId,
      });
    }
    if (values.noShowAfterMinutes != null) {
      await upsert.mutateAsync({
        key: TENANT_PAYMENT_KEYS.noShowAfterMinutes,
        value: String(values.noShowAfterMinutes),
        tenant_id: tenantId,
      });
    }
  };

  return {
    paypalClientId,
    stripePublishableKey,
    mpesaConsumerKey,
    mpesaShortcode,
    payAtVenueEnabled,
    cancelByHours,
    noShowAfterMinutes,
    save,
    isSaving: upsert.isPending,
  };
}

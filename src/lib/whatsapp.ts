// Build a wa.me deep-link with sanitized phone + URL-encoded message.
export function buildWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/[^\d]/g, "");
  // Auto-prepend Indian country code for 10-digit numbers
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(phone: string, message: string) {
  if (!phone) return false;
  const url = buildWhatsAppUrl(phone, message);
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
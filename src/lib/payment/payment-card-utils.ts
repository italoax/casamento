/**
 * Utilitários de cartão usados pelo checkout.
 */

import { digits } from "./payment-utils";

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

export function cardExpiration(expiration: string): { expiryMonth: string; expiryYear: string } {
  const d = digits(expiration);
  if (d.length < 4) throw new Error("Validade do cartão inválida.");
  return {
    expiryMonth: d.slice(0, 2),
    expiryYear: d.length === 4 ? `20${d.slice(2)}` : d.slice(2, 6),
  };
}



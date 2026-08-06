const TTL_MS = 60 * 1000; // cache de 1 minuto
const APP_URL = 'https://hold-alert.vercel.app';

/**
 * Estados posibles:
 *   'ok'       -> cliente sin hold
 *   'hold'     -> cliente con el tag hold
 *   'unknown'  -> no se pudo verificar (offline, error, sin permisos)
 *   'none'     -> no hay cliente asociado a la venta
 */
export async function getHoldStatus(customerId) {
  if (!customerId) return {status: 'none'};

  const key = `hold:${customerId}`;

  // 1. Cache local con TTL
  try {
    const raw = await shopify.storage.get(key);
    if (raw) {
      const cached = JSON.parse(String(raw));
      if (Date.now() - cached.ts < TTL_MS) {
        return {
          status: cached.status,
          reason: cached.reason,
          name: cached.name,
          email: cached.email,
          cached: true,
        };
      }
    }
  } catch (_) {
    // storage vacio o corrupto: seguimos al fetch
  }

  // 2. Lookup contra el backend en Vercel
  try {
    const token = await shopify.session.getSessionToken();
    if (!token) return {status: 'unknown', reason: 'Sin token'};

    const res = await fetch(`${APP_URL}/api/customer-hold`, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain'},
      body: JSON.stringify({token, customerId}),
    });

    if (!res.ok) return {status: 'unknown', reason: `HTTP ${res.status}`};

    const data = await res.json();

    const result = {
      status: data.onHold ? 'hold' : 'ok',
      reason: data.reason,
      name: data.name,
      email: data.email,
    };

    await shopify.storage.set(
      key,
      JSON.stringify({...result, ts: Date.now()}),
    );

    return result;
  } catch (err) {
    // POS sigue vendiendo offline: no rompas la venta, marca como no verificado
    return {status: 'unknown', reason: String(err?.message ?? err)};
  }
}
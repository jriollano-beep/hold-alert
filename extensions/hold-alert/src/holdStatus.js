const TTL_MS = 5 * 60 * 1000; // cache de 5 minutos
const APP_URL = 'https://plans-vehicles-come-colleagues.trycloudflare.com';

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

  // 1. Cache local con TTL (comentado mientras depuramos)
  // try {
  //   const raw = await shopify.storage.get(key);
  //   if (raw) {
  //     const cached = JSON.parse(String(raw));
  //     if (Date.now() - cached.ts < TTL_MS) {
  //       return {status: cached.status, reason: cached.reason, cached: true};
  //     }
  //   }
  // } catch (_) {
  //   // storage vacio o corrupto: seguimos al fetch
  // }

  // 2. Lookup contra el backend.
  // URL relativa: POS la resuelve contra el application_url de la app
  // y agrega el header Authorization automaticamente.
  try {
const res = await fetch(`${APP_URL}/api/customer-hold`);
    const texto = await res.text();
    return {status: 'unknown', reason: texto.slice(0, 60)};

    if (!res.ok) return {status: 'unknown', reason: `HTTP ${res.status}`};

    const data = await res.json();
    const status = data.onHold ? 'hold' : 'ok';

    await shopify.storage.set(
      key,
      JSON.stringify({status, reason: data.reason, ts: Date.now()}),
    );

    return {status, reason: data.reason};
  } catch (err) {
    // POS sigue vendiendo offline: no rompas la venta, marca como no verificado
    return {status: 'unknown', reason: String(err?.message ?? err)};
  }
}
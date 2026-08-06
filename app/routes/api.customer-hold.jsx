import {jwtVerify} from 'jose';
import {unauthenticated} from '../shopify.server';

// El tag que marca la cuenta como retenida (case-insensitive)
const HOLD_TAG = 'hold';

// Las UI extensions corren en un Web Worker con origen null,
// asi que el CORS tiene que ser abierto.
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

// GET simple para probar desde el navegador.
// Tambien responde al preflight OPTIONS que hace el POS.
export async function loader({request}) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {status: 204, headers: corsHeaders()});
  }

  return Response.json(
    {error: 'missing token', hint: 'la ruta existe'},
    {status: 401, headers: corsHeaders()},
  );
}

// La extension usa POST con text/plain para evitar el preflight de CORS.
// La extension manda token y customerId en el body via POST.
export async function action({request}) {
  const headers = corsHeaders();

  if (request.method === 'OPTIONS') {
    return new Response(null, {status: 204, headers});
  }

  try {
    const {token, customerId} = JSON.parse(await request.text());

    console.log('customer-hold: token?', Boolean(token), 'customerId:', customerId);

    if (!token) {
      return Response.json({error: 'missing token'}, {status: 401, headers});
    }
    if (!customerId) {
      return Response.json({error: 'missing customerId'}, {status: 400, headers});
    }

    // 1. Verificar el token que mando POS
    const secret = new TextEncoder().encode(process.env.SHOPIFY_API_SECRET);
    const {payload} = await jwtVerify(token, secret, {
      audience: process.env.SHOPIFY_API_KEY,
    });

    // `dest` es la tienda, ej. https://mi-tienda.myshopify.com
    const shop = new URL(payload.dest).host;

    // 2. Consultar los tags del cliente con el Admin API
    const {admin} = await unauthenticated.admin(shop);

    const response = await admin.graphql(
      `#graphql
        query CustomerTags($id: ID!) {
          customer(id: $id) {
            id
            tags
            note
          }
        }`,
      {variables: {id: `gid://shopify/Customer/${customerId}`}},
    );

    const body = await response.json();
    const customer = body?.data?.customer;

    if (!customer) {
      return Response.json({onHold: false, found: false}, {headers});
    }

    const onHold = (customer.tags ?? []).some(
      (tag) => tag.trim().toLowerCase() === HOLD_TAG,
    );

    return Response.json(
      {
        onHold,
        found: true,
        // La nota del cliente sirve como motivo visible para el cajero
        reason: onHold ? customer.note || undefined : undefined,
      },
      {headers},
    );
  } catch (error) {
    console.error('customer-hold error:', error?.message ?? error);
    return Response.json(
      {error: 'unauthorized', detail: String(error?.message ?? error)},
      {status: 401, headers},
    );
  }
}
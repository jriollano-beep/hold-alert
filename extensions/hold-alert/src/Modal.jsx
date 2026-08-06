import {render} from 'preact';
import {useState, useEffect} from 'preact/hooks';
import '@shopify/ui-extensions/preact';
import {getHoldStatus} from './holdStatus.js';

export default async () => {
  render(<Modal />, document.body);
};

function Modal() {
  const customer = shopify.cart.current.value.customer;
  const [state, setState] = useState(null);

  useEffect(() => {
    getHoldStatus(customer?.id).then(setState);
  }, [customer?.id]);

  if (!customer) {
    return (
      <s-page heading="Estado de cuenta">
        <s-box padding="base">
          <s-text>No hay cliente asociado a esta venta.</s-text>
        </s-box>
      </s-page>
    );
  }

  if (!state) {
    return (
      <s-page heading="Estado de cuenta">
        <s-box padding="base">
          <s-text>Verificando...</s-text>
        </s-box>
      </s-page>
    );
  }

  // El nombre del backend manda; si no llega, usamos lo del carrito
  const nombre =
    state.name ||
    [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
    'Cliente sin nombre';

  return (
    <s-page heading="Estado de cuenta">
      <s-scroll-box>
        <s-stack direction="block" gap="large">

          <s-section heading="Cliente">
            <s-box padding="base">
              <s-stack direction="block" gap="small">
                <s-text type="strong">{nombre}</s-text>
                {state.email && (
                  <s-text type="small" color="subdued">{state.email}</s-text>
                )}
              </s-stack>
            </s-box>
          </s-section>

          {state.status === 'hold' && (
            <s-section>
              <s-stack direction="block" gap="large">

                <s-box padding="base">
                  <s-stack direction="block" gap="small">
                    <s-text type="strong" tone="critical">
                      CUENTA EN HOLD
                    </s-text>
                    <s-text tone="critical">
                      No proceses la venta sin autorizacion de un supervisor.
                    </s-text>
                  </s-stack>
                </s-box>

                {state.reason && (
                  <s-box padding="base">
                    <s-stack direction="block" gap="small">
                      <s-text type="small" color="subdued">MOTIVO</s-text>
                      <s-text type="strong">{state.reason}</s-text>
                    </s-stack>
                  </s-box>
                )}

              </s-stack>
            </s-section>
          )}

          {state.status === 'ok' && (
            <s-section>
              <s-box padding="base">
                <s-text tone="success" type="strong">
                  Cliente al dia — puedes continuar.
                </s-text>
              </s-box>
            </s-section>
          )}

          {state.status === 'unknown' && (
            <s-section>
              <s-box padding="base">
                <s-stack direction="block" gap="small">
                  <s-text tone="warning" type="strong">
                    No se pudo verificar
                  </s-text>
                  <s-text>
                    Confirma manualmente antes de cobrar. ({state.reason})
                  </s-text>
                </s-stack>
              </s-box>
            </s-section>
          )}

        </s-stack>
      </s-scroll-box>
    </s-page>
  );
}
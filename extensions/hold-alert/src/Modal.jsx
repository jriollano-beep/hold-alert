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
        <s-text>No hay cliente asociado a esta venta.</s-text>
      </s-page>
    );
  }

  if (!state) {
    return (
      <s-page heading="Estado de cuenta">
        <s-text>Verificando...</s-text>
      </s-page>
    );
  }

  return (
    <s-page heading="Estado de cuenta">
      <s-scroll-box>
        <s-stack direction="block">
          <s-section heading="Cliente">
            <s-text>
              {customer.firstName ?? ''} {customer.lastName ?? ''}
            </s-text>
            <s-text>ID: {customer.id}</s-text>
          </s-section>

          {state.status === 'hold' && (
            <s-section heading="CUENTA EN HOLD">
              <s-text>
                Esta cuenta tiene el tag "hold". No proceses la venta sin
                autorizacion de un supervisor.
              </s-text>
              {state.reason && <s-text>Motivo: {state.reason}</s-text>}
            </s-section>
          )}

          {state.status === 'ok' && (
            <s-section heading="Sin restricciones">
              <s-text>El cliente esta al dia. Puedes continuar.</s-text>
            </s-section>
          )}

          {state.status === 'unknown' && (
            <s-section heading="No se pudo verificar">
              <s-text>
                POS no pudo consultar el estado ({state.reason}). Confirma
                manualmente antes de cobrar.
              </s-text>
            </s-section>
          )}
        </s-stack>
      </s-scroll-box>
    </s-page>
  );
}

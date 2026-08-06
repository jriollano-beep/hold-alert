import {render} from 'preact';
import {useState, useEffect} from 'preact/hooks';
import '@shopify/ui-extensions/preact';
import {getHoldStatus} from './holdStatus.js';

export default async () => {
  render(<CustomerBlock />, document.body);
};

function CustomerBlock() {
  const customerId = shopify.customer?.id;
  const [state, setState] = useState(null);

  useEffect(() => {
    getHoldStatus(customerId).then(setState);
  }, [customerId]);

  // No ensuciar la ficha de clientes normales
  if (!state || state.status === 'ok' || state.status === 'none') return null;

  return (
    <s-pos-block>
      {state.status === 'hold' ? (
        <>
          <s-text>CUENTA EN HOLD - no procesar ventas</s-text>
          {state.reason && <s-text>Motivo: {state.reason}</s-text>}
        </>
      ) : (
        <s-text>Estado de cuenta sin verificar ({state.reason})</s-text>
      )}
    </s-pos-block>
  );
}

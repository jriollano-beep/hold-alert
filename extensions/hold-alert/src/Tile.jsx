import {render} from 'preact';
import {useState, useEffect, useRef} from 'preact/hooks';
import '@shopify/ui-extensions/preact';
import {getHoldStatus} from './holdStatus.js';

export default async () => {
  render(<Tile />, document.body);
};

function Tile() {
  const [customerId, setCustomerId] = useState(
    shopify.cart.current.value.customer?.id ?? null,
  );
  const [state, setState] = useState({status: 'none'});

  // Para no repetir el toast del mismo cliente una y otra vez
  const toastedFor = useRef(null);

  // 1. Escuchar cambios del carrito (incluye asociar/quitar cliente)
  useEffect(() => {
    return shopify.cart.current.subscribe((cart) => {
      setCustomerId(cart.customer?.id ?? null);
    });
  }, []);

  // 2. Cada vez que cambia el cliente, verificar el tag
  useEffect(() => {
    let cancelled = false;

    if (!customerId) {
      setState({status: 'none'});
      toastedFor.current = null;
      return;
    }

    (async () => {
      const result = await getHoldStatus(customerId);
      if (cancelled) return;

      setState(result);

      // 3. El "popup": toast automatico, sin que el cajero toque nada
      if (result.status === 'hold' && toastedFor.current !== customerId) {
        toastedFor.current = customerId;
        shopify.toast.show('CUENTA EN HOLD - no procesar la venta');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const view = tileView(state.status);

  return (
    <s-tile
      heading={view.heading}
      subheading={view.subheading}
      tone={view.tone}
      itemCount={state.status === 'hold' ? 1 : undefined}
      onClick={() => shopify.action.presentModal()}
    />
  );
}

function tileView(status) {
  switch (status) {
    case 'hold':
      return {
        heading: 'CUENTA EN HOLD',
        subheading: 'Tocar para ver el motivo',
        tone: 'accent',
      };
    case 'ok':
      return {
        heading: 'Estado de cuenta',
        subheading: 'Cliente al dia',
        tone: 'neutral',
      };
    case 'unknown':
      return {
        heading: 'Estado sin verificar',
        subheading: 'Sin conexion - confirmar manualmente',
        tone: 'accent',
      };
    default:
      return {
        heading: 'Estado de cuenta',
        subheading: 'Sin cliente asociado',
        tone: 'neutral',
      };
  }
}

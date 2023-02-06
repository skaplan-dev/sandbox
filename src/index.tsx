import React, {
  useEffect,
  useMemo,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { createRoot } from 'react-dom/client';
import {
  createRemoteReceiver,
  RemoteRenderer,
  createController,
} from '@remote-ui/react/host';
import { createEndpoint, Endpoint, fromIframe } from '@remote-ui/rpc';

import { RemoteChannel } from '@remote-ui/core';

interface WorkerEndpoint {
  load: (script: string) => void;
  render: (receiver: RemoteChannel) => void;
}
interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
}

const Button = ({ children, onClick }: ButtonProps) => {
  return <button onClick={() => onClick()}>{children}</button>;
};

const Card = ({children}: any) => {
  return <div style={{padding:'5px', border: '1px solid black'}}>{children}</div>
}

const App = () => {
  const controller = useMemo(
    () =>
      createController({
        Button,
        Card
      }),
    []
  );

  const iframe = useRef<HTMLIFrameElement | null>(null);
  const sandbox = useRef<Endpoint<WorkerEndpoint> | null>(null);
  const receiver = useMemo(() => createRemoteReceiver(), []);

  useEffect(() => {
    if (!iframe.current) return undefined;

    sandbox.current = createEndpoint(fromIframe(iframe.current), {
      callable: ['load', 'render'],
    });

    return () => {
      if (sandbox.current) {
        sandbox.current.terminate();
      }
    };
  }, [receiver.receive]);

  const onSandboxLoad = useCallback(() => {
    if (!(iframe.current && sandbox.current)) return;

    if (iframe.current.contentWindow) {
      window.setTimeout(() => {}, 1000);
      iframe.current.contentWindow.postMessage({ init: 'true' }, '*');
    }

    sandbox.current.call
      .load(`http://localhost:5173/crm-card.js`)
      .then(result => {
        return sandbox.current
          ? sandbox.current.call.render(receiver.receive)
          : result;
      })
      .catch(e => {
        console.error('error ==>', e);
      });
  }, [receiver.receive]);

  return (
    <>
    This is rendered from a 3rd party
      <RemoteRenderer receiver={receiver} controller={controller} />
      <iframe
        ref={iframe}
        onLoad={onSandboxLoad}
        sandbox="allow-scripts"
        style={{ display: 'none', position: 'absolute', bottom: 0, right: 0 }}
        src={`http://localhost:8081`}
      />
    </>
  );
};

const container = document.getElementById('root');

const root = createRoot(container!);
root.render(<App />);

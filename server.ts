// custom server to support websockets

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import next from 'next';
import WebSocket from 'ws';

import retellWsServer from './src/retellWsServer';

const dev: boolean = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const upgradeHandler = app.getUpgradeHandler();

app.prepare().then(() => {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Setting up WebSocket server
  const wssVoice = new WebSocket.Server({ noServer: true });

  wssVoice.on('connection', (ws: WebSocket, request: IncomingMessage) => {
    console.log('New connection from retell, invoking server');
    const { pathname } = parse(request.url!);
    const callId = pathname?.split('/')[2];
    retellWsServer(ws, callId!);
  });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url!);
    const callId = pathname?.split('/')[2];
    if (!callId) {
        console.log('No call ID in pathname');
        socket.destroy();
        return;
    }
    console.log('Upgrade request to:', pathname);

    if (pathname.startsWith('/retellcallback')) {
        wssVoice.handleUpgrade(request, socket, head, (ws: WebSocket) => {
            wssVoice.emit('connection', ws, request);
        });
    } else {
        console.log('passing through to next router');
        upgradeHandler(request, socket, head);
    }
  });

  server.listen(3000, (err?: Error) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});
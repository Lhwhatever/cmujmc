import next from 'next';
import { createServer } from 'node:http';
import { parse } from 'node:url';
import type { Socket } from 'net';

import { WebSocketServer } from 'ws';
import { applyWSSHandler } from '@trpc/server/adapters/ws';

import { appRouter } from './routers/_app';
import { createContext } from './context';

const port = parseInt(process.env.PORT ?? '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

void app.prepare().then(() => {
  console.log('NEXTAUTH_URL', process.env.NEXTAUTH_URL);
  const server = createServer((req, res) => {
    if (!req.url) return;
    const parsedUrl = parse(req.url, true);
    void handle(req, res, parsedUrl);
  });
  const wss = new WebSocketServer({ noServer: true });
  const handler = applyWSSHandler({ wss, router: appRouter, createContext });

  process.on('SIGTERM', () => {
    console.log('SIGTERM');
    handler.broadcastReconnectNotification();
  });

  server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket as Socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  // Keep the next.js upgrade handler from being added to our custom server
  // so sockets stay open even when not HMR.
  const originalOn = server.on.bind(server);
  server.on = function (event, listener) {
    return event !== 'upgrade' ? originalOn(event, listener) : server;
  };
  server.listen(port);

  console.log(
    `> Server listening at http://localhost:${port} as ${
      dev ? 'development' : process.env.NODE_ENV
    }`,
  );

  if (process.env.VALKEY_HOST !== undefined) {
    console.log(
      `> Using cache at ${process.env.VALKEY_HOST ?? '[default]'}:${
        process.env.VALKEY_PORT ?? '[default port]'
      }`,
    );
  }
});

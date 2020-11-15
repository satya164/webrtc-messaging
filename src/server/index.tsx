import WebSocket from 'ws';
import { v4 } from 'uuid';
import type { Message } from '../types';

const PORT = 3045;

const users = new Map<string, { connection: WebSocket; partner?: string }>();
const wss = new WebSocket.Server({ port: PORT });

const send = (connection: WebSocket, data: Data): void =>
  connection.send(JSON.stringify(data));

wss.on('listening', () => {
  console.log(`Listening on port ${PORT}`);
});

//when a user connects to our sever
wss.on('connection', (connection) => {
  const id = v4();

  console.log('Client connected, create an ID for the client');

  users.set(id, { connection });

  send(connection, { type: 'connect', id });

  connection.on('message', (message) => {
    if (typeof message !== 'string') {
      return;
    }

    const data: Message = JSON.parse(message);

    console.log('Received message', data);

    switch (data.type) {
      case 'offer':
        {
          console.log('Sending offer to', data.id);

          const user = users.get(data.id);

          if (user == null) {
            send(connection, {
              type: 'error',
              message: `Couldn't find id ${data.id}`,
            });
          } else {
            if (user.partner) {
              send(connection, { type: 'reject', reason: 'busy' });
            } else {
              send(user.connection, {
                type: 'offer',
                offer: data.offer,
                id,
              });
            }
          }
        }
        break;

      case 'answer':
        {
          console.log('Sending answer to', data.id);

          const user = users.get(data.id);

          if (user == null) {
            send(connection, {
              type: 'error',
              message: `Couldn't find id ${data.id}`,
            });
          } else {
            user.partner = id;
            send(user.connection, {
              type: 'answer',
              answer: data.answer,
              id,
            });
          }
        }

        break;

      case 'candidate':
        {
          console.log('Sending candidate to', data.id);

          const user = users.get(data.id);

          if (user == null) {
            send(connection, {
              type: 'error',
              message: `Couldn't find id ${data.id}`,
            });
          } else {
            send(user.connection, {
              type: 'candidate',
              candidate: data.candidate,
              id,
            });
          }
        }
        break;

      case 'leave':
        {
          const user = users.get(id);

          if (user?.partner) {
            console.log('Disconnecting from ', user?.partner);

            const partner = users.get(user.partner);
            delete user.partner;

            if (partner) {
              send(partner.connection, { type: 'leave' });
            }
          }
        }

        break;

      default:
        send(connection, {
          type: 'error',
          message: `Command not found: ${message}`,
        });
        break;
    }
  });

  connection.on('close', () => {
    const user = users.get(id);

    if (user != null) {
      users.delete(id);

      if (user.partner) {
        console.log('Disconnecting from ', user.partner);

        const partner = users.get(user.partner);

        if (partner != null) {
          send(partner.connection, { type: 'leave' });
        }
      }
    }
  });
});

import type { Message } from '../types';

let partner: string | undefined;

const connection = new WebSocket('ws://localhost:3045');
const peer = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun2.1.google.com:19302' }],
});

let channel: RTCDataChannel | undefined;

const send = (message: Message) => {
  connection.send(JSON.stringify(message));
};

connection.onopen = () => {
  console.log('Connected to the signaling server');
};

connection.onmessage = (message) => {
  console.log('Got message', message.data);

  const data: Message = JSON.parse(message.data);

  switch (data.type) {
    case 'connect':
      peer.onicecandidate = (event) => {
        if (partner && event.candidate) {
          send({
            type: 'candidate',
            candidate: event.candidate,
            id: partner,
          });
        }
      };

      channel = peer.createDataChannel('channel1');

      peer.ondatachannel = ({ channel }) => {
        channel.onmessage = (event) => {
          chatArea.innerHTML += 'Received: ' + event.data + '<br />';
        };

        channel.onerror = (error) => {
          console.log('Ooops...error:', error);
        };

        channel.onclose = () => {
          console.log('Data channel is closed');
        };
      };

      break;
    case 'offer':
      partner = data.id;
      peer.setRemoteDescription(new RTCSessionDescription(data.offer));

      //create an answer to an offer
      peer.createAnswer().then((answer) => {
        peer.setLocalDescription(answer);

        if (partner) {
          send({
            type: 'answer',
            answer: answer,
            id: partner,
          });
        }
      });
      break;
    case 'answer':
      peer.setRemoteDescription(new RTCSessionDescription(data.answer));
      break;
    case 'candidate':
      peer.addIceCandidate(new RTCIceCandidate(data.candidate));
      break;
    case 'leave':
      partner = undefined;
      peer.close();
      break;
  }
};

connection.onerror = (err) => {
  console.log('Got error', err);
};

const callToUsernameInput = document.querySelector(
  '#callToUsernameInput'
) as HTMLInputElement;
const callBtn = document.querySelector('#callBtn') as HTMLButtonElement;

const hangUpBtn = document.querySelector('#hangUpBtn') as HTMLButtonElement;
const msgInput = document.querySelector('#msgInput') as HTMLInputElement;
const sendMsgBtn = document.querySelector('#sendMsgBtn') as HTMLButtonElement;

const chatArea = document.querySelector('#chatarea') as HTMLDivElement;

callBtn.addEventListener('click', () => {
  let callToUsername = callToUsernameInput.value;

  if (callToUsername) {
    partner = callToUsername;

    peer.createOffer().then((offer) => {
      peer.setLocalDescription(offer);

      if (partner) {
        send({ type: 'offer', offer: offer, id: partner });
      }
    });
  }
});

hangUpBtn.addEventListener('click', () => {
  send({ type: 'leave' });
  partner = undefined;
  peer.close();
});

sendMsgBtn.addEventListener('click', () => {
  let val = msgInput.value;
  chatArea.innerHTML += 'Sent: ' + val + '<br />';

  channel?.send(val);
  msgInput.value = '';
});

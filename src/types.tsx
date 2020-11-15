export type Message =
  | { type: 'connect'; id: string }
  | { type: 'offer'; id: string; offer: object }
  | { type: 'answer'; id: string; answer: object }
  | { type: 'candidate'; id: string; candidate: object }
  | { type: 'reject'; reason: string }
  | { type: 'error'; message: string }
  | { type: 'leave' };

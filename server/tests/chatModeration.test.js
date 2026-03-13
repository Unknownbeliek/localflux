const { ChatManager } = require('../core/chatManager');
const { Server } = require('socket.io');
const { createServer } = require('http');

describe('ChatManager moderation & IP throttle', () => {
  let httpServer, io, chat, socketMock;
  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      chat = new ChatManager(io, { tokenRefillMs: 100, tokenCap: 10, ipWindowMs: 1000, ipLimit: 2 });
      socketMock = { id: 's1', playerName: 'A', handshake: { address: '127.0.0.1' } };
      done();
    });
  });
  afterAll((done) => {
    chat.stop();
    io.close();
    httpServer.close(done);
  });

  test('mute and unmute work', () => {
    chat.mute('s1');
    expect(chat.isMuted('s1')).toBe(true);
    chat.unmute('s1');
    expect(chat.isMuted('s1')).toBe(false);
  });

  test('per-IP throttling blocks after limit', () => {
    const ack = (r) => { lastAck = r; };
    let lastAck = null;
    // allowed 2 messages
    chat.handleFreeMessage(socketMock, { roomPin: 'p', text: 'hi' }, ack);
    expect(lastAck.ok).toBe(true);
    chat.handleFreeMessage(socketMock, { roomPin: 'p', text: 'hi' }, ack);
    expect(lastAck.ok).toBe(true);
    // third within window should be blocked by ip throttle
    chat.handleFreeMessage(socketMock, { roomPin: 'p', text: 'hi' }, ack);
    expect(lastAck.ok).toBe(false);
    expect(lastAck.reason).toBe('ip_throttled');
  });
});

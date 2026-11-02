// ========================================================
// CampusHub - Live updates (Server-Sent Events)
// Browsers subscribe at GET /api/events/stream and are told when
// events or registrations change, so seat counts stay current.
// ========================================================

const clients = new Set();

function addClient(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 5000\n\n');
  clients.add(res);

  const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 25000);
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
}

function broadcast(type = 'events-changed') {
  for (const res of clients) {
    res.write(`event: ${type}\ndata: {}\n\n`);
  }
}

module.exports = { addClient, broadcast };

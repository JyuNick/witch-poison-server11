const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

let room = {
  players: [],
  poison: {},
  turn: 0,
  started: false
};

wss.on("connection", ws => {
  if (room.players.length >= 2) {
    ws.send(JSON.stringify({ type: "error", msg: "房间已满" }));
    ws.close();
    return;
  }

  const id = room.players.length;
  room.players.push(ws);

  ws.send(JSON.stringify({ type: "init", id }));

  ws.on("message", msg => {
    const data = JSON.parse(msg);

    if (data.type === "poison") {
      room.poison[id] = data.index;
      if (Object.keys(room.poison).length === 2) {
        room.started = true;
        broadcast({ type: "start", turn: room.turn });
      }
    }

    if (data.type === "select" && room.started) {
      if (id !== room.turn) return;

      const hit =
        data.index === room.poison[0] ||
        data.index === room.poison[1];

      if (hit) {
        broadcast({ type: "end", loser: id, index: data.index });
        reset();
      } else {
        room.turn = 1 - room.turn;
        broadcast({ type: "move", index: data.index, turn: room.turn });
      }
    }
  });

  ws.on("close", reset);
});

function broadcast(data) {
  room.players.forEach(p => p.send(JSON.stringify(data)));
}

function reset() {
  room = { players: [], poison: {}, turn: 0, started: false };
}

console.log("WebSocket server started");

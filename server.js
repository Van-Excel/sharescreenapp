import { WebSocketServer } from "ws";
import { createServer } from "http";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Store sessions: { sessionId: { agent: ws, customer: ws } }
const sessions = {};

wss.on("connection", (ws) => {
  ws.on("message", async (raw) => {
    const text = raw instanceof Buffer ? raw.toString() : raw;
    const data = JSON.parse(text);

    const { type, role, sessionId } = data;
    if (!sessionId) return;

    if (!sessions[sessionId]) {
      sessions[sessionId] = { agent: null, customer: null };
    }

    const session = sessions[sessionId];

    if (type === "register") {
      if (role === "agent") session.agent = ws;
      if (role === "customer") session.customer = ws;
      return;
    }

    // Forward messages
    if (type === "offer" && session.agent) {
      session.agent.send(JSON.stringify(data));
    }

    if (type === "answer" && session.customer) {
      session.customer.send(JSON.stringify(data));
    }

    if (type === "ice") {
      const target = (ws === session.agent) ? session.customer : session.agent;
      if (target) target.send(JSON.stringify(data));
    }
  });
});

server.listen(3000, () =>
  console.log("Server running on http://localhost:3000")
);

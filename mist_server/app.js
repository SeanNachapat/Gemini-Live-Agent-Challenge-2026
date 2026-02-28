import { GoogleGenAI, Modality } from "@google/genai";
import { WebSocketServer } from "ws";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
      console.error("ERROR: GEMINI_API_KEY is not set. Please set it in .env file.");
      process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const LIVE_CONFIG = {
      responseModalities: [Modality.AUDIO],
      systemInstruction:
            "You are Mist, a helpful and friendly AI voice assistant. " +
            "Respond naturally and conversationally. Keep responses concise. " +
            "You can also see what the user's camera captures, so you can describe or comment on what you see when asked.",
};

const PORT = process.env.PORT || 8080;

const rooms = new Map();

function joinRoom(roomId, ws) {
      if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
      }
      rooms.get(roomId).add(ws);
      console.log(`[Room ${roomId}] Client joined (${rooms.get(roomId).size} clients)`);
}

function leaveRoom(roomId, ws) {
      const room = rooms.get(roomId);
      if (!room) return;
      room.delete(ws);
      console.log(`[Room ${roomId}] Client left (${room.size} clients)`);
      if (room.size === 0) {
            rooms.delete(roomId);
            console.log(`[Room ${roomId}] Room removed (empty)`);
      }
}

function getRoomClients(roomId) {
      return rooms.get(roomId) || new Set();
}

async function main() {
      const wss = new WebSocketServer({ port: PORT });
      console.log(`WebSocket server running on port ${PORT}`);

      wss.on("connection", async (ws, req) => {
            const url = new URL(req.url, `http://localhost:${PORT}`);
            const roomId = url.searchParams.get("room") || "default";

            console.log(`Client connected → room: ${roomId}`);
            joinRoom(roomId, ws);

            ws.send(JSON.stringify({
                  type: "room_info",
                  roomId,
                  clients: getRoomClients(roomId).size,
            }));

            let geminiSession = null;

            try {
                  geminiSession = await ai.live.connect({
                        model: MODEL,
                        config: LIVE_CONFIG,
                        callbacks: {
                              onopen: () => {
                                    console.log(`[Room ${roomId}] Connected to Gemini Live API`);
                                    ws.send(JSON.stringify({ type: "status", status: "connected" }));
                              },
                              onmessage: (message) => {
                                    if (message.serverContent && message.serverContent.interrupted) {
                                          ws.send(JSON.stringify({ type: "interrupted" }));
                                          return;
                                    }

                                    if (
                                          message.serverContent &&
                                          message.serverContent.modelTurn &&
                                          message.serverContent.modelTurn.parts
                                    ) {
                                          for (const part of message.serverContent.modelTurn.parts) {
                                                if (part.inlineData && part.inlineData.data) {
                                                      ws.send(
                                                            JSON.stringify({
                                                                  type: "audio",
                                                                  data: part.inlineData.data,
                                                            })
                                                      );
                                                }
                                          }
                                    }

                                    if (
                                          message.serverContent &&
                                          message.serverContent.turnComplete
                                    ) {
                                          ws.send(JSON.stringify({ type: "turn_complete" }));
                                    }
                              },
                              onerror: (e) => {
                                    console.error(`[Room ${roomId}] Gemini Live error:`, e.message || e);
                                    ws.send(
                                          JSON.stringify({
                                                type: "error",
                                                message: e.message || "Gemini Live error",
                                          })
                                    );
                              },
                              onclose: (e) => {
                                    console.log(`[Room ${roomId}] Gemini Live session closed:`, e?.reason || "unknown");
                              },
                        },
                  });
            } catch (err) {
                  console.error(`[Room ${roomId}] Failed to connect to Gemini Live:`, err.message);
                  ws.send(
                        JSON.stringify({
                              type: "error",
                              message: "Failed to connect to Gemini Live API",
                        })
                  );
                  ws.close();
                  return;
            }

            ws.on("message", (raw) => {
                  try {
                        const msg = JSON.parse(raw.toString());

                        if (msg.type === "audio" && msg.data) {
                              geminiSession.sendRealtimeInput({
                                    audio: {
                                          data: msg.data,
                                          mimeType: "audio/pcm;rate=16000",
                                    },
                              });
                        } else if (msg.type === "video" && msg.data) {
                              geminiSession.sendRealtimeInput({
                                    video: {
                                          data: msg.data,
                                          mimeType: "image/jpeg",
                                    },
                              });
                        }
                  } catch (err) {
                        console.error(`[Room ${roomId}] Error processing message:`, err.message);
                  }
            });

            ws.on("close", () => {
                  console.log(`[Room ${roomId}] Client disconnected`);
                  leaveRoom(roomId, ws);
                  if (geminiSession) {
                        try {
                              geminiSession.close();
                        } catch (e) {
                        }
                        geminiSession = null;
                  }
            });

            ws.on("error", (err) => {
                  console.error(`[Room ${roomId}] WebSocket error:`, err.message);
            });
      });
}

main().catch((err) => {
      console.error("Server error:", err);
      process.exit(1);
});

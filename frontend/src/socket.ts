import { io, Socket } from "socket.io-client";

const socket: Socket = io(import.meta.env.VITE_SOCKET_URL as string, {
  path: import.meta.env.VITE_SOCKET_PATH as string,
  transports: ["websocket", "polling"],
  reconnection: true,               // включаем переподключение
  reconnectionAttempts: Infinity,   // без лимита попыток
  reconnectionDelay: 1000,          // первая задержка 1 сек
  reconnectionDelayMax: 10000,      // максимум 10 сек
  randomizationFactor: 0.5,         // добавляем рандом для "экспоненты"
  timeout: 20000,                   // таймаут соединения 20 сек
});

socket.on("connect", () => {
  console.log("✅ Connected to server:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.warn("⚠️ Disconnected:", reason);
});

socket.on("reconnect_attempt", (attempt) => {
  console.log(`🔄 Reconnect attempt #${attempt}`);
});

socket.on("reconnect", (attempt) => {
  console.log(`✅ Reconnected after ${attempt} attempts`);
});

socket.on("reconnect_failed", () => {
  console.error("❌ Failed to reconnect");
});

export default socket;

import { io } from "socket.io-client";
import type { SocketFactory } from "./chatRealtime";

/** socket.io-client de verdade (JS puro, funciona no Expo Go). Só websocket: o long-polling não ajuda no celular. */
export const socketIoFactory: SocketFactory = (url, options) => io(url, options);

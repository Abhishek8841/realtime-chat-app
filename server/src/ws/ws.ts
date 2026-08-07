import WebSocket, { WebSocketServer } from "ws"
import { extractUserId } from "./utils/extract-user.js";
import { addUser, broadCast, broadCastToEveryOneExcept, isUserOnline, onlineUsersList, removeUserSocket, sendToUser } from "./socket-manager.js";
import { clientMessageSchema } from "./schemas/client-message.schema.js";
import { handlers } from "./routes/message.routes.js";
import type { IncomingMessage, Server } from "http";
import type { ServerMessageType } from "./schemas/server-message.schema.js";

export const initWebsockets = (server: Server) => {
    const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:8080",
        "https://echo.abatra.me",
    ];


    const wss = new WebSocketServer({
        server,

        verifyClient(info, cb) {

            if (
                allowedOrigins.includes(info.origin) || info.origin.endsWith("localhost:3001")
            ) {
                cb(true);
            }
            else {
                cb(false);
            }

        }
    });

    wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
        const id = extractUserId(req);
        if (!id) {
            ws.close();
            return;
        };

        const wasOffline = !(isUserOnline(id));

        addUser(id, ws);

        if (wasOffline) {
            const broadCastMessage: ServerMessageType = {
                type: "status_indicator",
                payload: {
                    from: id,
                    content: "ONLINE",
                }
            };
            broadCastToEveryOneExcept(id, broadCastMessage);
        }

        const online_list_message: ServerMessageType = {
            type: "online_list",
            payload: onlineUsersList(),
        }
        sendToUser(id, online_list_message);

        ws.on("message", async (msg) => {
            try {
                console.log(msg.toString());
                const result = clientMessageSchema.safeParse(JSON.parse(msg.toString()));
                // console.log("ws.ts");
                if (!result.success) return;
                // console.log("ws.ts");
                const data = result.data;
                switch (data.type) {
                    case "send_message":
                        await handlers[data.type](id, data);
                        break;
                    case "start_typing":
                        handlers[data.type](id, data);
                        break;
                    case "stop_typing":
                        handlers[data.type](id, data);
                        break;
                    case "send_read_receipt":
                        handlers[data.type](id, data)
                        break;
                }

                // console.log("ws.ts");
            } catch (e) {
                // console.log("ws.ts");
                console.error(e);
            }
        })

        ws.on("close", () => {

            removeUserSocket(id, ws);

            if (isUserOnline(id)) return;

            const broadCastMessage: ServerMessageType = {
                type: "status_indicator",
                payload: {
                    from: id,
                    content: "OFFLINE",
                }
            };

            broadCast(broadCastMessage);

        })

    })
}
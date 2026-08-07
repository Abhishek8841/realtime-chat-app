import type { Request, Response } from "express";
import cookieParser from "cookie-parser";
import express from "express";
import { router1 } from "./routes/auth.routes.js";
import { router2 } from "./routes/conversation.router.js";

const app = express();
import cors from "cors";

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:8080",
    "https://echo.abatra.me"
];

app.use(cors({
    origin: (origin, callback) => {

        if (!origin || allowedOrigins.includes(origin) || origin.endsWith("localhost:3001")) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }

    },
    credentials: true
}));

app.use(cookieParser());
app.use(express.json());

app.use("/api/v1", router1);
app.use("/api/v1", router2);

app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

export default app;
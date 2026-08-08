import { handlePublish } from "./services/publish.js";
import { handleGetItems } from "./services/items.js";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === "/api/health") {
            return Response.json({
                status: "ok",
                service: "scout-and-steward-portal"
            });
        }

        if (url.pathname === "/api/db-health") {
            try {
                const result = await env.DB.prepare(
                    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
                ).all();

                return Response.json({
                    status: "ok",
                    database: "connected",
                    tables: result.results.map((row) => row.name)
                });
            } catch (error) {
                console.error("D1 health check failed:", error);

                return Response.json(
                    {
                        status: "error",
                        database: "unavailable"
                    },
                    { status: 500 }
                );
            }
        }

        if (url.pathname === "/api/items" && request.method === "GET") {
            return handleGetItems(env);
        }

        if (url.pathname === "/api/publish" && request.method === "POST") {
            return handlePublish(request, env);
        }

        return env.ASSETS.fetch(request);
    }
};

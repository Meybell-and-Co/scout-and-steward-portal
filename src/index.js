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

        if (url.pathname === "/api/publish" && request.method === "POST") {
            const authorization = request.headers.get("Authorization");
            const expectedAuthorization = `Bearer ${env.PUBLISH_TOKEN}`;

            if (!authorization || authorization !== expectedAuthorization) {
                return Response.json(
                    {
                        status: "error",
                        error: "unauthorized"
                    },
                    { status: 401 }
                );
            }

            return Response.json({
                status: "ok",
                authenticated: true,
                message: "Publisher authenticated. No data written."
            });
        }

        if (url.pathname === "/api/publish" && request.method === "POST") {
            const authorization = request.headers.get("Authorization");
            const expectedAuthorization = `Bearer ${env.PUBLISH_TOKEN}`;

            if (!authorization || authorization !== expectedAuthorization) {
                return Response.json(
                    {
                        status: "error",
                        error: "unauthorized"
                    },
                    { status: 401 }
                );
            }

            return Response.json({
                status: "ok",
                authenticated: true,
                message: "Publisher authenticated. No data written."
            });
        }

        return env.ASSETS.fetch(request);
    }
};

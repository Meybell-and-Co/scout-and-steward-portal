const EBAY_DELETION_PATH =
    "/api/ebay/marketplace-account-deletion";

async function sha256Hex(value) {
    const bytes = new TextEncoder().encode(value);

    const digest = await crypto.subtle.digest(
        "SHA-256",
        bytes
    );

    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

export async function handleEbayAccountDeletion(
    request,
    env
) {
    const url = new URL(request.url);

    /*
     * eBay verifies ownership of the endpoint by sending:
     *
     * GET ?challenge_code=...
     */
    if (request.method === "GET") {
        const challengeCode =
            url.searchParams.get("challenge_code");

        if (!challengeCode) {
            return Response.json(
                {
                    status: "error",
                    error: "missing_challenge_code"
                },
                { status: 400 }
            );
        }

        if (!env.EBAY_DELETION_VERIFICATION_TOKEN) {
            console.error(
                "EBAY_DELETION_VERIFICATION_TOKEN is not configured"
            );

            return Response.json(
                {
                    status: "error",
                    error: "verification_unavailable"
                },
                { status: 500 }
            );
        }

        /*
         * IMPORTANT:
         * eBay hashes the exact public endpoint URL supplied
         * in Developer Portal — without the challenge query.
         */
        const endpoint =
            `${url.origin}${EBAY_DELETION_PATH}`;

        const challengeResponse = await sha256Hex(
            challengeCode +
            env.EBAY_DELETION_VERIFICATION_TOKEN +
            endpoint
        );

        return Response.json({
            challengeResponse
        });
    }

    /*
     * eBay sends account-deletion notifications as POSTs.
     *
     * Scout & Steward does not currently persist eBay-user
     * identity data. Acknowledge receipt immediately.
     *
     * If that changes later, deletion processing belongs here.
     */
    if (request.method === "POST") {
        return new Response(null, {
            status: 204
        });
    }

    return new Response(null, {
        status: 405,
        headers: {
            Allow: "GET, POST"
        }
    });
}
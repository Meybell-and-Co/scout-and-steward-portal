import {
    buildAndPersistPriceRecommendation
} from "./recommendation.js";

export async function handleCreatePriceRecommendation(
    request,
    env,
    itemId
) {
    let body;

    try {
        body = await request.json();
    } catch {
        return Response.json(
            {
                status: "error",
                error: "invalid_json"
            },
            { status: 400 }
        );
    }

    if (!Array.isArray(body.comps)) {
        return Response.json(
            {
                status: "error",
                error: "comps_must_be_array"
            },
            { status: 400 }
        );
    }

    const recommendationId = crypto.randomUUID();

    const recommendation =
        await buildAndPersistPriceRecommendation(
            env.DB,
            {
                recommendationId,
                itemId,
                comps: body.comps,
                evidence: body.evidence ?? {}
            }
        );

    if (recommendation.recommended_price_cents === null) {
        return Response.json(
            {
                status: "insufficient_evidence",
                recommendation
            },
            { status: 422 }
        );
    }

    return Response.json(
        {
            status: "ok",
            recommendation_id: recommendationId,
            recommendation
        },
        { status: 201 }
    );
}

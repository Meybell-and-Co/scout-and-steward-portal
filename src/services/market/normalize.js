export function normalizeMarketComp({
    compId,
    source,
    title,
    priceCents,
    shippingCents,
    marketStatus,
    condition = null,
    itemOriginDate = null,
    compTier
}) {
    if (!compId || typeof compId !== "string") {
        throw new Error("compId must be a non-empty string");
    }

    if (!source || typeof source !== "string") {
        throw new Error("source must be a non-empty string");
    }

    if (!title || typeof title !== "string") {
        throw new Error("title must be a non-empty string");
    }

    if (!Number.isInteger(priceCents) || priceCents < 0) {
        throw new Error("priceCents must be a non-negative integer");
    }

    if (!Number.isInteger(shippingCents) || shippingCents < 0) {
        throw new Error("shippingCents must be a non-negative integer");
    }

    if (!["sold", "active"].includes(marketStatus)) {
        throw new Error("marketStatus must be 'sold' or 'active'");
    }

    if (!compTier || typeof compTier !== "string") {
        throw new Error("compTier must be a non-empty string");
    }

    if (itemOriginDate !== null) {
        const parsedDate = new Date(itemOriginDate);

        if (Number.isNaN(parsedDate.getTime())) {
            throw new Error("itemOriginDate must be a valid date");
        }
    }

    return {
        comp_id: compId,
        source,
        title,
        price_cents: priceCents,
        shipping_cents: shippingCents,
        total_buyer_cost_cents: priceCents + shippingCents,
        market_status: marketStatus,
        condition,
        item_origin_date: itemOriginDate,
        comp_tier: compTier
    };
}

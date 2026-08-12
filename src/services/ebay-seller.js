const EBAY_TOKEN_URL =
    "https://api.ebay.com/identity/v1/oauth2/token";

const EBAY_OFFERS_URL =
    "https://api.ebay.com/sell/inventory/v1/offer";

const EBAY_INVENTORY_SCOPE =
    "https://api.ebay.com/oauth/api_scope/sell.inventory";

async function getSellerAccessToken(env) {
    if (
        !env.EBAY_CLIENT_ID ||
        !env.EBAY_CLIENT_SECRET ||
        !env.EBAY_REFRESH_TOKEN
    ) {
        throw new Error(
            "eBay seller credentials are not configured"
        );
    }

    const credentials = btoa(
        `${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`
    );

    const response = await fetch(EBAY_TOKEN_URL, {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type":
                "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: env.EBAY_REFRESH_TOKEN,
            scope: EBAY_INVENTORY_SCOPE
        })
    });

    if (!response.ok) {
        const detail = await response.text();

        console.error(
            "eBay seller token refresh failed:",
            response.status,
            detail
        );

        throw new Error(
            `eBay seller token refresh failed: ${response.status}`
        );
    }

    const payload = await response.json();

    if (!payload.access_token) {
        throw new Error(
            "eBay seller token refresh returned no access token"
        );
    }

    return payload.access_token;
}

export async function getEbayOffersBySku(env, sku) {
    if (!sku || !sku.trim()) {
        throw new Error("SKU is required");
    }

    const token = await getSellerAccessToken(env);

    const url = new URL(EBAY_OFFERS_URL);
    url.searchParams.set("sku", sku.trim());

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Language": "en-US"
        }
    });

    if (!response.ok) {
        const detail = await response.text();

        console.error(
            "eBay Inventory offer lookup failed:",
            response.status,
            detail
        );

        throw new Error(
            `eBay Inventory offer lookup failed: ${response.status}`
        );
    }

    const payload = await response.json();

    return {
        sku: sku.trim(),
        total: payload.total ?? 0,

        offers: (payload.offers ?? []).map((offer) => ({
            offer_id: offer.offerId ?? null,
            sku: offer.sku ?? null,
            marketplace_id: offer.marketplaceId ?? null,
            format: offer.format ?? null,
            status: offer.status ?? null,

            listing: offer.listing
                ? {
                    listing_id:
                        offer.listing.listingId ?? null
                }
                : null,

            price: offer.pricingSummary?.price
                ? {
                    value:
                        offer.pricingSummary.price.value ?? null,
                    currency:
                        offer.pricingSummary.price.currency ?? null
                }
                : null,

            quantity_limit_per_buyer:
                offer.quantityLimitPerBuyer ?? null,

            category_id:
                offer.categoryId ?? null
        }))
    };
}
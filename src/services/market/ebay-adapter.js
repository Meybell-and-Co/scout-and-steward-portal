import {
    determineCompTier
} from "./match.js";

function dollarsToCents(value) {
    const amount = Number.parseFloat(value);

    if (!Number.isFinite(amount) || amount < 0) {
        return null;
    }

    return Math.round(amount * 100);
}

export function adaptEbayListingToMarketComp(
    item,
    listing
) {
    if (!item || !listing) {
        return null;
    }

    const compTier = determineCompTier(
        item,
        listing.title
    );

    if (!compTier) {
        return null;
    }

    if (
        listing.price?.currency !== "USD" ||
        (
            listing.shipping?.currency &&
            listing.shipping.currency !== "USD"
        )
    ) {
        return null;
    }

    const priceCents =
        dollarsToCents(listing.price?.value);

    if (
        !listing.shipping ||
        listing.shipping.value === null ||
        listing.shipping.value === undefined
    ) {
        return null;
    }

    const shippingCents =
        dollarsToCents(listing.shipping.value);

    if (
        priceCents === null ||
        shippingCents === null
    ) {
        return null;
    }

    if (
        !listing.item_id ||
        !listing.title
    ) {
        return null;
    }

    return {
        compId: listing.item_id,
        source: "ebay",
        title: listing.title,
        priceCents,
        shippingCents,
        marketStatus: "active",
        condition: listing.condition ?? null,
        itemOriginDate:
            listing.item_creation_date ?? null,
        compTier
    };
}

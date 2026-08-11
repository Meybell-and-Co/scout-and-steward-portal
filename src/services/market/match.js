function normalizeText(value) {
    return String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function includesPhrase(title, value) {
    const normalizedValue = normalizeText(value);

    if (!normalizedValue) {
        return false;
    }

    return normalizeText(title).includes(normalizedValue);
}

function includesAllTokens(title, value) {
    const titleTokens = new Set(
        normalizeText(title)
            .split(" ")
            .filter(Boolean)
    );

    const valueTokens = normalizeText(value)
        .split(" ")
        .filter(Boolean);

    if (valueTokens.length === 0) {
        return false;
    }

    return valueTokens.every((token) =>
        titleTokens.has(token)
    );
}

function includesCardNumber(title, cardNumber) {
    const normalizedTitle = normalizeText(title);
    const normalizedNumber = normalizeText(cardNumber);

    if (!normalizedNumber) {
        return false;
    }

    return normalizedTitle
        .split(" ")
        .includes(normalizedNumber);
}

function getSetIdentity(item) {
    const setName = normalizeText(item.set_name);
    const year = normalizeText(item.year);
    const manufacturer = normalizeText(item.manufacturer);

    let identity = setName;

    if (year) {
        identity = identity
            .replace(new RegExp(`\\b${year}\\b`, "g"), " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    if (manufacturer) {
        identity = identity
            .replace(
                new RegExp(`\\b${manufacturer}\\b`, "g"),
                " "
            )
            .replace(/\s+/g, " ")
            .trim();
    }

    return identity;
}

export function determineCompTier(item, title) {
    if (!item || !title) {
        return null;
    }

    const hasPlayer =
        includesPhrase(title, item.player_name);

    const hasYear =
        includesPhrase(title, item.year);

    const hasManufacturer =
        includesPhrase(title, item.manufacturer);

    const setIdentity = getSetIdentity(item);

    const hasSet =
        setIdentity
            ? includesAllTokens(title, setIdentity)
            : false;

    const hasCardNumber =
        includesCardNumber(title, item.card_number);

    if (
        hasPlayer &&
        hasYear &&
        hasManufacturer &&
        hasSet &&
        hasCardNumber
    ) {
        return "exact";
    }

    return null;
}

const app = document.querySelector("#app");
const inventoryNav = document.querySelector("#nav-inventory");


/* ---------------------------------------------------------
   Application routing
   --------------------------------------------------------- */

function getRoute() {
    const path = window.location.pathname;

    if (path.startsWith("/item/")) {
        const itemId = decodeURIComponent(
            path.slice("/item/".length)
        );

        return {
            name: "item",
            itemId
        };
    }

    return {
        name: "inventory"
    };
}


async function startApp() {
    const route = getRoute();

    if (route.name === "item") {
        await loadItem(route.itemId);
        return;
    }

    await loadInventory();
}


function setDocumentTitle(title) {
    document.title = `${title} | Scout & Steward`;
}


/* ---------------------------------------------------------
   Inventory
   --------------------------------------------------------- */

let allItems = [];


async function loadInventory() {
    setDocumentTitle("Inventory");

    inventoryNav.classList.add("app-nav__item--active");
    inventoryNav.setAttribute("aria-current", "page");

    renderInventoryShell();

    const inventoryGrid = document.querySelector("#inventory-grid");
    const inventoryCount = document.querySelector("#inventory-count");
    const inventoryStatus = document.querySelector("#inventory-status");
    const inventorySearch = document.querySelector("#inventory-search");

    try {
        const response = await fetch("/api/items");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();

        allItems = payload.items ?? [];

        console.log("Scout & Steward inventory:", payload);

        renderItems(allItems, inventoryGrid);

        inventoryCount.textContent =
            `${allItems.length} item${allItems.length === 1 ? "" : "s"} in inventory`;

        inventoryStatus.textContent =
            allItems.length > 0
                ? ""
                : "No inventory items found.";

        inventorySearch.addEventListener("input", () => {
            filterInventory(
                inventorySearch,
                inventoryGrid,
                inventoryStatus
            );
        });
    } catch (error) {
        console.error("Unable to load inventory:", error);

        inventoryCount.textContent = "Inventory unavailable";

        inventoryStatus.textContent =
            "We couldn't load the inventory. Please try again.";
    }
}


function renderInventoryShell() {
    app.innerHTML = `
        <section
            class="page-heading"
            aria-labelledby="inventory-heading"
        >
            <p class="page-heading__eyebrow">
                Inventory
            </p>

            <h1 id="inventory-heading">
                The Collection
            </h1>

            <p
                class="inventory-count"
                id="inventory-count"
                aria-live="polite"
            >
                Loading inventory…
            </p>
        </section>

        <section
            class="inventory-toolbar"
            aria-label="Inventory controls"
        >
            <label
                class="search"
                for="inventory-search"
            >
                <span class="search__label">
                    Search inventory
                </span>

                <input
                    id="inventory-search"
                    type="search"
                    placeholder="Player, team, set, card number…"
                    autocomplete="off"
                >
            </label>
        </section>

        <div
            id="inventory-status"
            class="inventory-status"
            aria-live="polite"
        >
            Loading cards…
        </div>

        <section
            id="inventory-grid"
            class="inventory-grid"
            aria-label="Sports card inventory"
        ></section>
    `;
}


function renderItems(items, inventoryGrid) {
    inventoryGrid.innerHTML = "";

    for (const item of items) {
        const article = document.createElement("article");
        article.className = "inventory-card";

        const content = document.createElement("div");
        content.className = "inventory-card__content";

        const title = document.createElement("h2");
        title.className = "inventory-card__title";
        title.textContent = getItemTitle(item);

        const identity = document.createElement("p");
        identity.className = "inventory-card__identity";
        identity.textContent = getItemIdentity(item);

        const team = document.createElement("p");
        team.className = "inventory-card__team";
        team.textContent = item.team ?? "";

        const footer = document.createElement("div");
        footer.className = "inventory-card__footer";

        const itemId = document.createElement("span");
        itemId.className = "inventory-card__id";
        itemId.textContent = item.item_id ?? "";

        const affordance = document.createElement("span");
        affordance.className = "inventory-card__affordance";
        affordance.setAttribute("aria-hidden", "true");
        affordance.textContent = "›";

        content.append(title);

        if (identity.textContent) {
            content.append(identity);
        }

        if (team.textContent) {
            content.append(team);
        }

        if (itemId.textContent) {
            footer.append(itemId);
        }

        footer.append(affordance);

        article.append(content, footer);

        if (item.item_id) {
            article.classList.add("inventory-card--interactive");
            article.tabIndex = 0;
            article.setAttribute(
                "aria-label",
                `View ${getItemTitle(item)}`
            );

            article.addEventListener("click", () => {
                window.location.href =
                    `/item/${encodeURIComponent(item.item_id)}`;
            });

            article.addEventListener("keydown", (event) => {
                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();

                    window.location.href =
                        `/item/${encodeURIComponent(item.item_id)}`;
                }
            });
        }

        inventoryGrid.append(article);
    }
}


function filterInventory(
    inventorySearch,
    inventoryGrid,
    inventoryStatus
) {
    const query = inventorySearch.value
        .trim()
        .toLowerCase();

    if (!query) {
        renderItems(allItems, inventoryGrid);
        inventoryStatus.textContent = "";
        return;
    }

    const filteredItems = allItems.filter((item) =>
        Object.values(item).some((value) =>
            String(value ?? "")
                .toLowerCase()
                .includes(query)
        )
    );

    renderItems(filteredItems, inventoryGrid);

    inventoryStatus.textContent =
        filteredItems.length === 0
            ? "No matching inventory items."
            : `${filteredItems.length} match${filteredItems.length === 1 ? "" : "es"}`;
}


/* ---------------------------------------------------------
   Item detail
   --------------------------------------------------------- */

async function loadItem(itemId) {
    app.innerHTML = `
        <p class="app-loading" aria-live="polite">
            Loading card…
        </p>
    `;

    try {
        const response = await fetch(
            `/api/items/${encodeURIComponent(itemId)}`
        );

        if (response.status === 404) {
            renderItemNotFound();
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const item = payload.item;

        setDocumentTitle(getItemTitle(item));
        renderItemDetail(item);
    } catch (error) {
        console.error("Unable to load inventory item:", error);

        app.innerHTML = `
            <section class="page-heading">
                <p class="page-heading__eyebrow">
                    Inventory
                </p>

                <h1>
                    Card unavailable
                </h1>

                <p class="inventory-count">
                    We couldn't load this card.
                </p>
            </section>

            <p>
                <a href="/">Return to inventory</a>
            </p>
        `;
    }
}


function renderItemDetail(item) {
    app.innerHTML = `
        <section class="item-detail">

            <a class="item-detail__back" href="/">
                ‹ Inventory
            </a>

            <div class="item-detail__media">
                <img
                    class="item-detail__image"
                    id="item-image"
                    src="${escapeAttribute(item.image_front_url ?? "")}"
                    alt="${escapeAttribute(`${getItemTitle(item)} — front`)}"
                >

                <div
                    class="item-detail__image-controls"
                    aria-label="Card image"
                >
                    <button
                        class="item-detail__image-button item-detail__image-button--active"
                        type="button"
                        data-image-side="front"
                    >
                        Front
                    </button>

                    <button
                        class="item-detail__image-button"
                        type="button"
                        data-image-side="back"
                    >
                        Back
                    </button>
                </div>
            </div>

            <header class="item-detail__header">
                <p class="page-heading__eyebrow">
                    ${escapeHtml(item.classification ?? "Inventory item")}
                </p>

                <h1>
                    ${escapeHtml(getItemTitle(item))}
                </h1>

                <p class="item-detail__identity">
                    ${escapeHtml(getItemIdentity(item))}
                </p>

                ${item.team
            ? `
                            <p class="item-detail__team">
                                ${escapeHtml(item.team)}
                            </p>
                        `
            : ""
        }
            </header>

            <section
                class="item-detail__section"
                aria-labelledby="card-details-heading"
            >
                <h2 id="card-details-heading">
                    Card details
                </h2>

                <dl class="item-detail__metadata">
                    ${renderMetadataRow("Manufacturer", item.manufacturer)}
                    ${renderMetadataRow("Year", item.year)}
                    ${renderMetadataRow("Set", item.set_name)}
                    ${renderMetadataRow("Card number", item.card_number)}
                    ${renderMetadataRow("Classification", item.classification)}
                    ${renderMetadataRow("Item ID", item.item_id)}
                </dl>
            </section>

            <section
                class="item-detail__section"
                aria-labelledby="pricing-heading"
            >
                <h2 id="pricing-heading">
                    Pricing
                </h2>

                <p class="item-detail__label">
    ${item.price_approval ? "Approved price" : "Recommended price"}
</p>

                <p class="item-detail__price">
                    ${formatPrice(item.recommended_price_cents)}
                </p>
             <p class="item-detail__approval-status ${item.price_approval
            ? "item-detail__approval-status--approved"
            : "item-detail__approval-status--pending"
        }">
${item.recommended_price_cents == null
            ? "Pricing recommendation pending"
            : item.price_approval
                ? "Price approved"
                : "Awaiting price approval"}
</p>
${item.recommended_price_cents != null && !item.price_approval
            ? `
        <button
            type="button"
            class="item-detail__approve-button"
            data-action="approve-price"
        >
            Approve ${formatPrice(item.recommended_price_cents)}
        </button>
    `
            : ""}
            </section>

        </section>
    `;

    wireImageControls(item);
    wirePriceApproval(item);
}

async function wirePriceApproval(item) {
    const button = document.querySelector(
        '[data-action="approve-price"]'
    );

    if (!button) {
        return;
    }

    button.addEventListener("click", async () => {
        button.disabled = true;
        button.textContent = "Approving…";

        try {
            const response = await fetch(
                `/api/items/${encodeURIComponent(item.item_id)}/approve-price`,
                {
                    method: "POST"
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            await loadItem(item.item_id);
        } catch (error) {
            console.error("Unable to approve price:", error);

            button.disabled = false;
            button.textContent = `Approve ${formatPrice(
                item.recommended_price_cents
            )}`;
        }
    });
}


function renderMetadataRow(label, value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "";
    }

    return `
        <div class="item-detail__metadata-row">
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(String(value))}</dd>
        </div>
    `;
}


function wireImageControls(item) {
    const image = document.querySelector("#item-image");
    const buttons = document.querySelectorAll(
        "[data-image-side]"
    );

    for (const button of buttons) {
        button.addEventListener("click", () => {
            const side = button.dataset.imageSide;

            const imageUrl =
                side === "back"
                    ? item.image_back_url
                    : item.image_front_url;

            if (!imageUrl) {
                return;
            }

            image.src = imageUrl;
            image.alt =
                `${getItemTitle(item)} — ${side}`;

            for (const otherButton of buttons) {
                otherButton.classList.remove(
                    "item-detail__image-button--active"
                );
            }

            button.classList.add(
                "item-detail__image-button--active"
            );
        });
    }
}


/* ---------------------------------------------------------
   Shared item formatting
   --------------------------------------------------------- */

function getItemTitle(item) {
    return (
        item.player_name ??
        item.player ??
        item.item_id ??
        "Unknown item"
    );
}


function getItemIdentity(item) {
    const year = item.year
        ? String(item.year).trim()
        : "";

    const manufacturer = item.manufacturer
        ? String(item.manufacturer).trim()
        : "";

    const setName = item.set_name
        ? String(item.set_name).trim()
        : "";

    const cardNumber = item.card_number
        ? String(item.card_number).trim()
        : "";

    const identityParts = [];

    const normalizedSetName = setName.toLowerCase();

    if (
        year &&
        !normalizedSetName.includes(year.toLowerCase())
    ) {
        identityParts.push(year);
    }

    if (
        manufacturer &&
        !normalizedSetName.includes(manufacturer.toLowerCase())
    ) {
        identityParts.push(manufacturer);
    }

    if (setName) {
        identityParts.push(setName);
    }

    if (cardNumber) {
        identityParts.push(`#${cardNumber}`);
    }

    return identityParts.join(" · ");
}


function formatPrice(cents) {
    if (
        cents === null ||
        cents === undefined
    ) {
        return "Not priced yet";
    }

    return new Intl.NumberFormat(
        "en-US",
        {
            style: "currency",
            currency: "USD"
        }
    ).format(cents / 100);
}


/* ---------------------------------------------------------
   Error states
   --------------------------------------------------------- */

function renderItemNotFound() {
    setDocumentTitle("Card not found");

    app.innerHTML = `
        <section class="page-heading">
            <p class="page-heading__eyebrow">
                Inventory
            </p>

            <h1>
                Card not found
            </h1>

            <p class="inventory-count">
                This inventory item doesn't exist.
            </p>
        </section>

        <p>
            <a href="/">Return to inventory</a>
        </p>
    `;
}


/* ---------------------------------------------------------
   Output safety
   --------------------------------------------------------- */

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {
    return escapeHtml(value);
}


/* ---------------------------------------------------------
   Start
   --------------------------------------------------------- */

startApp();

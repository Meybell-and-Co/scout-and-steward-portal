const inventoryGrid = document.querySelector("#inventory-grid");
const inventoryCount = document.querySelector("#inventory-count");
const inventoryStatus = document.querySelector("#inventory-status");
const inventorySearch = document.querySelector("#inventory-search");

let allItems = [];


/* ---------------------------------------------------------
   Load inventory
   --------------------------------------------------------- */

async function loadItems() {
    try {
        const response = await fetch("/api/items");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();

        allItems = payload.items ?? [];

        console.log("Scout & Steward inventory:", payload);

        renderItems(allItems);

        inventoryCount.textContent =
            `${allItems.length} item${allItems.length === 1 ? "" : "s"} in inventory`;

        inventoryStatus.textContent =
            allItems.length > 0
                ? ""
                : "No inventory items found.";
    } catch (error) {
        console.error("Unable to load inventory:", error);

        inventoryCount.textContent =
            "Inventory unavailable";

        inventoryStatus.textContent =
            "We couldn't load the inventory. Please try again.";
    }
}


/* ---------------------------------------------------------
   Render inventory
   --------------------------------------------------------- */

function renderItems(items) {
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
        inventoryGrid.append(article);
    }
}


/* ---------------------------------------------------------
   Item formatting
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
    return [
        item.year,
        item.manufacturer,
        item.set_name,
    ]
        .filter(Boolean)
        .join(" · ");
}


/* ---------------------------------------------------------
   Inventory search
   --------------------------------------------------------- */

inventorySearch.addEventListener("input", () => {
    const query = inventorySearch.value
        .trim()
        .toLowerCase();

    if (!query) {
        renderItems(allItems);
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

    renderItems(filteredItems);

    inventoryStatus.textContent =
        filteredItems.length === 0
            ? "No matching inventory items."
            : `${filteredItems.length} match${filteredItems.length === 1 ? "" : "es"}`;
});


loadItems();

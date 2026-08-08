const inventoryGrid = document.querySelector("#inventory-grid");
const inventoryCount = document.querySelector("#inventory-count");
const inventoryStatus = document.querySelector("#inventory-status");
const inventorySearch = document.querySelector("#inventory-search");

let allItems = [];

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

function renderItems(items) {
    inventoryGrid.innerHTML = "";

    for (const item of items) {
        const article = document.createElement("article");

        const title = document.createElement("h2");
        title.textContent =
            item.player_name ??
            item.player ??
            item.item_id ??
            "Unknown item";

        const details = document.createElement("p");
        details.textContent = [
            item.year,
            item.manufacturer,
            item.set_name,
            item.team,
        ]
            .filter(Boolean)
            .join(" · ");

        article.append(title, details);
        inventoryGrid.append(article);
    }
}

loadItems();

"use strict";

const STORAGE_KEY = "campusExchangeListings";
const REQUESTS_KEY = "campusExchangeRequests";

const listingForm = document.getElementById("listingForm");
const listingsContainer = document.getElementById("listings");
const requestsContainer = document.getElementById("requests");
const searchInput = document.getElementById("search");
const categoryFilter = document.getElementById("filterCategory");
const sortSelect = document.getElementById("sort");

let currentView = "all";
let listings = loadFromStorage(STORAGE_KEY, []);
let requests = loadFromStorage(REQUESTS_KEY, []);

function loadFromStorage(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
        console.error(`Could not load ${key} from browser storage.`, error);
        return fallback;
    }
}

function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        alert("The browser could not save this data. Try removing some stored data or using a different browser.");
        console.error(`Could not save ${key} to browser storage.`, error);
    }
}

function makeId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function formatPrice(price) {
    return Number(price) === 0
        ? "Free"
        : `₹${Number(price).toLocaleString("en-IN")}`;
}

function renderListings() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;

    let visibleListings = listings.filter(listing => {
        const matchesSearch = [
            listing.title,
            listing.description,
            listing.category,
            listing.condition
        ].some(value => String(value).toLowerCase().includes(searchTerm));

        const matchesCategory =
            !selectedCategory || listing.category === selectedCategory;

        const matchesView =
            currentView !== "available" || listing.status === "Available";

        return matchesSearch && matchesCategory && matchesView;
    });

    if (sortSelect.value === "low") {
        visibleListings.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortSelect.value === "high") {
        visibleListings.sort((a, b) => Number(b.price) - Number(a.price));
    } else {
        visibleListings.sort((a, b) => b.createdAt - a.createdAt);
    }

    if (currentView === "mine") {
        visibleListings = visibleListings.filter(listing => listing.isMine);
    }

    if (visibleListings.length === 0) {
        listingsContainer.innerHTML =
            `<p class="empty-message">No listings found. Try changing your search or add a listing.</p>`;
        return;
    }

    listingsContainer.innerHTML = visibleListings.map(listing => {
        const imageMarkup = listing.image
            ? `<img src="${escapeHTML(listing.image)}" alt="${escapeHTML(listing.title)}" onerror="this.style.display='none'">`
            : "";

        const statusOptions = ["Available", "Reserved", "Completed"]
            .map(status =>
                `<option value="${status}" ${listing.status === status ? "selected" : ""}>${status}</option>`
            ).join("");

        return `
            <article class="card">
                ${imageMarkup}
                <h3>${escapeHTML(listing.title)}</h3>
                <p>${escapeHTML(listing.description)}</p>
                <p><strong>Category:</strong> ${escapeHTML(listing.category)}</p>
                <p><strong>Condition:</strong> ${escapeHTML(listing.condition)}</p>
                <p><strong>Type:</strong> ${escapeHTML(listing.type)}</p>
                <p><strong>Price:</strong> ${formatPrice(listing.price)}</p>
                <p class="status">Status: ${escapeHTML(listing.status)}</p>
                <label>
                    Update status:
                    <select data-status-id="${escapeHTML(listing.id)}">
                        ${statusOptions}
                    </select>
                </label>
                <button type="button" data-request-id="${escapeHTML(listing.id)}">
                    ${listing.type === "Exchange" ? "Request Exchange" : "Inquire"}
                </button>
            </article>
        `;
    }).join("");
}

function renderRequests() {
    if (requests.length === 0) {
        requestsContainer.innerHTML = "<p>No inquiries or exchange requests yet.</p>";
        return;
    }

    requestsContainer.innerHTML = requests.map(request => `
        <article class="request-card">
            <strong>${escapeHTML(request.kind)}:</strong>
            ${escapeHTML(request.title)}
            <span> — ${escapeHTML(request.createdAt)}</span>
        </article>
    `).join("");
}

listingForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const category = document.getElementById("category").value;
    const condition = document.getElementById("condition").value;
    const price = Number(document.getElementById("price").value);
    const image = document.getElementById("image").value.trim();
    const type = document.getElementById("exchangeType").value;

    if (!title || !description || !category || !condition || !type || price < 0) {
        alert("Please complete all required fields with a valid price.");
        return;
    }

    listings.push({
        id: makeId(),
        title,
        description,
        category,
        condition,
        price,
        image,
        type,
        status: "Available",
        createdAt: Date.now(),
        isMine: true
    });

    saveToStorage(STORAGE_KEY, listings);
    listingForm.reset();
    currentView = "all";
    renderListings();
});

searchInput.addEventListener("input", renderListings);
categoryFilter.addEventListener("change", renderListings);
sortSelect.addEventListener("change", renderListings);

listingsContainer.addEventListener("change", event => {
    const listingId = event.target.dataset.statusId;
    if (!listingId) return;

    const listing = listings.find(item => item.id === listingId);
    if (!listing) return;

    listing.status = event.target.value;
    saveToStorage(STORAGE_KEY, listings);
    renderListings();
});

listingsContainer.addEventListener("click", event => {
    const listingId = event.target.dataset.requestId;
    if (!listingId) return;

    const listing = listings.find(item => item.id === listingId);
    if (!listing) return;

    const kind = listing.type === "Exchange" ? "Exchange request" : "Inquiry";

    requests.unshift({
        id: makeId(),
        listingId: listing.id,
        title: listing.title,
        kind,
        createdAt: new Date().toLocaleString()
    });

    saveToStorage(REQUESTS_KEY, requests);
    renderRequests();
    alert(`${kind} saved for "${listing.title}".`);
});

function showAll() {
    currentView = "all";
    renderListings();
}

function showAvailable() {
    currentView = "available";
    renderListings();
}

function showMyListings() {
    currentView = "mine";
    renderListings();
}

renderListings();
renderRequests();

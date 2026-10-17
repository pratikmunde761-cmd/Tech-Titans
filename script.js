"use strict";

const LISTINGS_KEY = "campusExchangeListings";
const REQUESTS_KEY = "campusExchangeRequests";

const form = document.getElementById("listingForm");
const listingsElement = document.getElementById("listings");
const requestsElement = document.getElementById("requests");
const searchElement = document.getElementById("search");
const categoryElement = document.getElementById("filterCategory");
const sortElement = document.getElementById("sort");

let currentView = "all";
let listings = loadData(LISTINGS_KEY);
let requests = loadData(REQUESTS_KEY);

function loadData(key) {
    try {
        const saved = localStorage.getItem(key);
        const data = saved ? JSON.parse(saved) : [];
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error(`Could not read ${key}.`, error);
        return [];
    }
}

function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        alert("Your browser could not save this data.");
        console.error(`Could not save ${key}.`, error);
    }
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

function makeId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatPrice(price) {
    return Number(price) === 0
        ? "Free"
        : `₹${Number(price).toLocaleString("en-IN")}`;
}

function validImageUrl(value) {
    if (!value) return "";

    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

function renderListings() {
    const searchText = searchElement.value.trim().toLowerCase();
    const selectedCategory = categoryElement.value;

    let shownListings = listings.filter(item => {
        const matchesSearch = [
            item.title,
            item.description,
            item.category,
            item.condition
        ].some(value => String(value).toLowerCase().includes(searchText));

        const matchesCategory =
            !selectedCategory || item.category === selectedCategory;

        const matchesView =
            currentView !== "available" || item.status === "Available";

        const matchesOwner =
            currentView !== "mine" || item.isMine;

        return matchesSearch && matchesCategory && matchesView && matchesOwner;
    });

    if (sortElement.value === "low") {
        shownListings.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortElement.value === "high") {
        shownListings.sort((a, b) => Number(b.price) - Number(a.price));
    } else {
        shownListings.sort((a, b) => b.createdAt - a.createdAt);
    }

    if (shownListings.length === 0) {
        listingsElement.innerHTML =
            "<p>No listings found. Try another search or add an item.</p>";
        return;
    }

    listingsElement.innerHTML = shownListings.map(item => {
        const image = validImageUrl(item.image);
        const imageHTML = image
            ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(item.title)}">`
            : "";

        const statusHTML = item.isMine
            ? `
                <label>
                    Update status:
                    <select data-status-id="${escapeHTML(item.id)}">
                        ${["Available", "Reserved", "Completed"].map(status =>
                            `<option value="${status}" ${item.status === status ? "selected" : ""}>${status}</option>`
                        ).join("")}
                    </select>
                </label>`
            : `<p class="status">Status: ${escapeHTML(item.status)}</p>`;

        const actionHTML = item.isMine
            ? "<p>Your listing</p>"
            : item.status === "Available"
                ? `<button type="button" data-request-id="${escapeHTML(item.id)}">
                    ${item.type === "Exchange" ? "Request Exchange" : "Inquire"}
                   </button>`
                : "<p>This item is not currently available.</p>";

        return `
            <article class="card">
                ${imageHTML}
                <h3>${escapeHTML(item.title)}</h3>
                <p>${escapeHTML(item.description)}</p>
                <p><strong>Category:</strong> ${escapeHTML(item.category)}</p>
                <p><strong>Condition:</strong> ${escapeHTML(item.condition)}</p>
                <p><strong>Listing type:</strong> ${escapeHTML(item.type)}</p>
                <p><strong>Price:</strong> ${formatPrice(item.price)}</p>
                ${statusHTML}
                ${actionHTML}
            </article>
        `;
    }).join("");

    listingsElement.querySelectorAll("img").forEach(image => {
        image.addEventListener("error", () => image.remove(), { once: true });
    });
}

function renderRequests() {
    if (requests.length === 0) {
        requestsElement.innerHTML = "<p>No inquiries or exchange requests yet.</p>";
        return;
    }

    requestsElement.innerHTML = requests.map(request => `
        <article class="request-card">
            <strong>${escapeHTML(request.kind)}:</strong>
            ${escapeHTML(request.title)}
            <p>From: ${escapeHTML(request.requester)}</p>
            <p>Contact: ${escapeHTML(request.contact)}</p>
            <p>Message: ${escapeHTML(request.message)}</p>
            <p>Status: ${escapeHTML(request.status)}</p>
            <p>${escapeHTML(new Date(request.createdAt).toLocaleString())}</p>
        </article>
    `).join("");
}

form.addEventListener("submit", event => {
    event.preventDefault();

    const price = Number(document.getElementById("price").value);

    if (!Number.isFinite(price) || price < 0) {
        alert("Enter a valid price of 0 or more.");
        return;
    }

    listings.push({
        id: makeId(),
        title: document.getElementById("title").value.trim(),
        description: document.getElementById("description").value.trim(),
        category: document.getElementById("category").value,
        condition: document.getElementById("condition").value,
        price,
        image: validImageUrl(document.getElementById("image").value.trim()),
        type: document.getElementById("exchangeType").value,
        status: "Available",
        createdAt: Date.now(),
        isMine: true
    });

    saveData(LISTINGS_KEY, listings);
    form.reset();
    currentView = "all";
    renderListings();
});

searchElement.addEventListener("input", renderListings);
categoryElement.addEventListener("change", renderListings);
sortElement.addEventListener("change", renderListings);

listingsElement.addEventListener("change", event => {
    const listingId = event.target.dataset.statusId;
    if (!listingId) return;

    const listing = listings.find(item => item.id === listingId);
    if (!listing || !listing.isMine) return;

    listing.status = event.target.value;
    saveData(LISTINGS_KEY, listings);
    renderListings();
});

listingsElement.addEventListener("click", event => {
    const button = event.target.closest("[data-request-id]");
    if (!button) return;

    const listing = listings.find(item => item.id === button.dataset.requestId);
    if (!listing || listing.status !== "Available") return;

    const requester = prompt("Your name:");
    if (!requester || !requester.trim()) return;

    const contact = prompt("Your email or phone number:");
    if (!contact || !contact.trim()) return;

    const message = prompt("Write a short message to the item owner:");
    if (!message || !message.trim()) return;

    requests.unshift({
        id: makeId(),
        listingId: listing.id,
        title: listing.title,
        kind: listing.type === "Exchange" ? "Exchange request" : "Inquiry",
        requester: requester.trim(),
        contact: contact.trim(),
        message: message.trim(),
        status: "Pending",
        createdAt: Date.now()
    });

    saveData(REQUESTS_KEY, requests);
    renderRequests();
    alert("Your request was saved in this browser.");
});

window.showAll = function () {
    currentView = "all";
    renderListings();
};

window.showAvailable = function () {
    currentView = "available";
    renderListings();
};

window.showMyListings = function () {
    currentView = "mine";
    renderListings();
};
function seedSampleData() {
    try {
        if (localStorage.getItem("campusExchangeSeeded")) return;
    } catch { return; }

    const now = Date.now();
    const samples = [
        { title: "Engineering Mathematics Textbook", description: "Clean copy, no highlighting. Covers the Sem I syllabus.", category: "Books", condition: "Good", price: 150, type: "Sell" },
        { title: "Casio fx-991ES Plus Calculator", description: "Works perfectly, comes with cover.", category: "Electronics", condition: "Like New", price: 400, type: "Sell" },
        { title: "Lab Coat (Size M)", description: "Used for one semester, washed.", category: "Lab Supplies", condition: "Good", price: 0, type: "Donate" },
        { title: "Drafter + Geometry Box", description: "Complete set. Want to swap for a scientific calculator.", category: "Stationery", condition: "Acceptable", price: 0, type: "Exchange" }
    ].map((item, i) => ({
        ...item,
        id: makeId(),
        image: "",
        status: i === 2 ? "Reserved" : "Available",
        createdAt: now - i * 3600000,
        isMine: false
    }));

    listings.push(...samples);
    saveData(LISTINGS_KEY, listings);
    try { localStorage.setItem("campusExchangeSeeded", "1"); } catch {}
}

seedSampleData();
renderListings();
renderRequests();

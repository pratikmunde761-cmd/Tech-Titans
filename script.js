"use strict";

const LISTINGS_KEY = "campusExchangeListings";
const REQUESTS_KEY = "campusExchangeRequests";
const SEED_KEY = "campusExchangeSeededV2";
const STATUSES = ["Available", "Reserved", "Completed"];

const $ = id => document.getElementById(id);

const listingsElement = $("listings");
const requestsElement = $("requests");
const searchElement = $("search");
const categoryElement = $("filterCategory");
const sortElement = $("sort");
const statsElement = $("stats");
const resultCountElement = $("resultCount");
const requestCountElement = $("requestCount");
const listingDialog = $("listingDialog");
const listingForm = $("listingForm");
const imageFileElement = $("imageFile");
const imagePreviewElement = $("imagePreview");
const inquiryDialog = $("inquiryDialog");
const inquiryForm = $("inquiryForm");
const inquiryTitle = $("inquiryTitle");
const inquirySubtitle = $("inquirySubtitle");

let currentView = "all";
let uploadedImage = "";
let activeListingId = null;
let listings = loadData(LISTINGS_KEY);
let requests = loadData(REQUESTS_KEY);

/* ---------- Storage ---------- */

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
        alert("Your browser could not save this data. Try a smaller photo.");
        console.error(`Could not save ${key}.`, error);
    }
}

/* ---------- Helpers ---------- */

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

function priceLabel(item) {
    const price = Number(item.price);
    if (item.type === "Exchange" && price === 0) return "Swap";
    if (price === 0) return "Free";
    return `₹${price.toLocaleString("en-IN")}`;
}

function validImageUrl(value) {
    if (!value) return "";
    if (value.startsWith("data:image/")) return value;

    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

function timeAgo(timestamp) {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
}

function initial(name) {
    return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
}

/* ---------- Generated artwork for items without a photo ---------- */

const CATEGORY_STYLE = {
    "Books": { emoji: "📚", c1: "#34d399", c2: "#0f766e" },
    "Electronics": { emoji: "🔌", c1: "#60a5fa", c2: "#4338ca" },
    "Lab Supplies": { emoji: "🧪", c1: "#fbbf24", c2: "#ea580c" },
    "Stationery": { emoji: "✏️", c1: "#f472b6", c2: "#be185d" },
    "Other": { emoji: "🎒", c1: "#a78bfa", c2: "#6d28d9" }
};

function artFor(category) {
    const style = CATEGORY_STYLE[category] || CATEGORY_STYLE.Other;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>` +
        `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
        `<stop offset='0' stop-color='${style.c1}'/><stop offset='1' stop-color='${style.c2}'/>` +
        `</linearGradient></defs>` +
        `<rect width='400' height='300' fill='url(#g)'/>` +
        `<circle cx='330' cy='60' r='90' fill='#fff' fill-opacity='.14'/>` +
        `<circle cx='60' cy='260' r='110' fill='#fff' fill-opacity='.10'/>` +
        `<text x='200' y='185' font-size='110' text-anchor='middle'>${style.emoji}</text>` +
        `</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* ---------- Sample data ---------- */

function seedSampleData() {
    try {
        if (localStorage.getItem(SEED_KEY)) return;
    } catch {
        return;
    }

    const hour = 3600000;
    const now = Date.now();

    const samples = [
        { title: "Engineering Mathematics Textbook", description: "Clean copy, no highlighting. Covers the full Sem I syllabus with solved examples.", category: "Books", condition: "Good", price: 150, type: "Sell", seller: "Aarav S. · Mechanical", status: "Available", age: 2 },
        { title: "Casio fx-991ES Plus Calculator", description: "Works perfectly, includes the original cover. Allowed in all university exams.", category: "Electronics", condition: "Like New", price: 400, type: "Sell", seller: "Riya P. · Computer", status: "Available", age: 5 },
        { title: "Lab Coat (Size M)", description: "Used for one semester and washed. Free to a junior who needs it.", category: "Lab Supplies", condition: "Good", price: 0, type: "Donate", seller: "Karan M. · Civil", status: "Reserved", age: 9 },
        { title: "Drafter + Geometry Box", description: "Complete set for engineering graphics. Would like to swap for a scientific calculator.", category: "Stationery", condition: "Acceptable", price: 0, type: "Exchange", seller: "Sneha D. · Electrical", status: "Available", age: 14 },
        { title: "Let Us C (Kanetkar)", description: "Handy for the C programming practicals. Light pencil notes in a few chapters.", category: "Books", condition: "Good", price: 120, type: "Sell", seller: "Omkar J. · IT", status: "Available", age: 22 },
        { title: "Arduino Uno Starter Kit", description: "Board, breadboard, jumper wires, LEDs and sensors. Great for first-year projects.", category: "Electronics", condition: "Good", price: 650, type: "Sell", seller: "Neha K. · E&TC", status: "Available", age: 30 },
        { title: "Engineering Physics Lab Journal", description: "Completed Sem I journal. Free to anyone who wants to refer to it.", category: "Books", condition: "Like New", price: 0, type: "Donate", seller: "Vikram T. · Mechanical", status: "Available", age: 40 },
        { title: "Safety Goggles (Pair)", description: "Scratch-free lens, adjustable strap. Already picked up by a junior.", category: "Lab Supplies", condition: "Like New", price: 50, type: "Sell", seller: "Pooja L. · Chemical", status: "Completed", age: 52 },
        { title: "LED Study Table Lamp", description: "Three brightness levels with a USB charging cable. Looking to swap for a mini fan.", category: "Other", condition: "Good", price: 0, type: "Exchange", seller: "Aditya R. · Computer", status: "Available", age: 70 }
    ].map(({ age, ...item }) => ({
        ...item,
        id: makeId(),
        image: "",
        createdAt: now - age * hour,
        isMine: false
    }));

    listings = listings.filter(item => item.isMine).concat(samples);
    requests = requests.filter(request => listings.some(item => item.id === request.listingId));
    saveData(LISTINGS_KEY, listings);
    saveData(REQUESTS_KEY, requests);

    try {
        localStorage.setItem(SEED_KEY, "1");
    } catch {
        // Ignore: sample data may simply reload next time.
    }
}

/* ---------- Rendering ---------- */

function renderStats() {
    const available = listings.filter(item => item.status === "Available").length;
    const free = listings.filter(item => Number(item.price) === 0).length;

    statsElement.innerHTML = [
        [listings.length, "Items listed"],
        [available, "Available now"],
        [free, "Free or swap"],
        [requests.length, "Requests"]
    ].map(([number, label]) =>
        `<div class="stat"><strong>${number}</strong><span>${label}</span></div>`
    ).join("");
}

function renderListings() {
    document.querySelectorAll(".tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.view === currentView);
    });

    const searchText = searchElement.value.trim().toLowerCase();
    const selectedCategory = categoryElement.value;

    const shownListings = listings.filter(item => {
        const matchesSearch = [
            item.title,
            item.description,
            item.category,
            item.condition,
            item.type,
            item.seller
        ].some(value => String(value || "").toLowerCase().includes(searchText));

        const matchesCategory = !selectedCategory || item.category === selectedCategory;
        const matchesView = currentView !== "available" || item.status === "Available";
        const matchesOwner = currentView !== "mine" || item.isMine;

        return matchesSearch && matchesCategory && matchesView && matchesOwner;
    });

    if (sortElement.value === "low") {
        shownListings.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortElement.value === "high") {
        shownListings.sort((a, b) => Number(b.price) - Number(a.price));
    } else {
        shownListings.sort((a, b) => b.createdAt - a.createdAt);
    }

    resultCountElement.textContent =
        `${shownListings.length} item${shownListings.length === 1 ? "" : "s"} found`;

    if (shownListings.length === 0) {
        listingsElement.innerHTML = `
            <div class="empty">
                <strong>No listings found</strong>
                Try another search, or add an item of your own.
            </div>`;
        return;
    }

    listingsElement.innerHTML = shownListings.map(item => {
        const image = validImageUrl(item.image) || artFor(item.category);
        const status = STATUSES.includes(item.status) ? item.status : "Available";
        const sellerName = item.isMine ? "You" : (item.seller || "Student");

        const actionHTML = item.isMine
            ? `
                <select data-status-id="${escapeHTML(item.id)}" aria-label="Update status">
                    ${STATUSES.map(option =>
                        `<option value="${option}" ${status === option ? "selected" : ""}>${option}</option>`
                    ).join("")}
                </select>
                <button type="button" class="btn-danger btn-sm" data-delete-id="${escapeHTML(item.id)}">Delete</button>`
            : status === "Available"
                ? `<button type="button" class="btn-primary btn-sm" data-request-id="${escapeHTML(item.id)}">
                        ${item.type === "Exchange" ? "Request Exchange" : "Inquire"}
                   </button>`
                : `<button type="button" class="btn-ghost btn-sm" disabled>Not available</button>`;

        return `
            <article class="card">
                <div class="card-media">
                    <img src="${escapeHTML(image)}" alt="${escapeHTML(item.title)}" data-cat="${escapeHTML(item.category)}" loading="lazy">
                    <span class="badge badge-${status.toLowerCase()}">${status}</span>
                    <span class="type-tag">${escapeHTML(item.type)}</span>
                </div>
                <div class="card-body">
                    <div class="price-row">
                        <span class="price">${escapeHTML(priceLabel(item))}</span>
                        <span class="time">${timeAgo(item.createdAt)}</span>
                    </div>
                    <h3>${escapeHTML(item.title)}</h3>
                    <p class="desc">${escapeHTML(item.description)}</p>
                    <div class="chips">
                        <span class="chip">${escapeHTML(item.category)}</span>
                        <span class="chip">${escapeHTML(item.condition)}</span>
                    </div>
                    <div class="seller">
                        <span class="avatar">${escapeHTML(initial(sellerName))}</span>
                        <span>${escapeHTML(sellerName)}</span>
                    </div>
                </div>
                <div class="card-actions">${actionHTML}</div>
            </article>
        `;
    }).join("");

    listingsElement.querySelectorAll("img").forEach(image => {
        image.addEventListener("error", () => {
            image.src = artFor(image.dataset.cat);
        }, { once: true });
    });
}

function renderRequests() {
    requestCountElement.textContent = requests.length;

    if (requests.length === 0) {
        requestsElement.innerHTML =
            `<p class="empty">No inquiries yet. Click Inquire on any item to send one.</p>`;
        return;
    }

    requestsElement.innerHTML = requests.map(request => `
        <article class="request-card">
            <span class="avatar">${escapeHTML(initial(request.requester))}</span>
            <div class="request-main">
                <div class="request-top">
                    <span class="request-title">${escapeHTML(request.title)}</span>
                    <span class="pill pill-${escapeHTML(String(request.status).toLowerCase())}">${escapeHTML(request.status)}</span>
                </div>
                <div class="request-meta">
                    ${escapeHTML(request.kind)} from ${escapeHTML(request.requester)}
                    · ${escapeHTML(request.contact)}
                    · ${escapeHTML(timeAgo(request.createdAt))}
                </div>
                <p class="request-msg">${escapeHTML(request.message)}</p>
                ${request.status === "Pending" ? `
                    <div class="request-actions">
                        <button type="button" class="btn-primary btn-sm" data-accept-id="${escapeHTML(request.id)}">Accept</button>
                        <button type="button" class="btn-danger btn-sm" data-decline-id="${escapeHTML(request.id)}">Decline</button>
                    </div>` : ""}
            </div>
        </article>
    `).join("");
}

function renderAll() {
    renderStats();
    renderListings();
    renderRequests();
}

/* ---------- Photo upload ---------- */

function clearImagePreview() {
    uploadedImage = "";
    imagePreviewElement.hidden = true;
    imagePreviewElement.removeAttribute("src");
}

imageFileElement.addEventListener("change", () => {
    const file = imageFileElement.files[0];

    if (!file) {
        clearImagePreview();
        return;
    }

    if (!file.type.startsWith("image/")) {
        alert("Please choose an image file.");
        imageFileElement.value = "";
        clearImagePreview();
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            const maxSize = 600;
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            uploadedImage = canvas.toDataURL("image/jpeg", 0.7);
            imagePreviewElement.src = uploadedImage;
            imagePreviewElement.hidden = false;
        };
        img.onerror = () => alert("Could not read this image.");
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
});

/* ---------- Dialogs ---------- */

document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => button.closest("dialog").close());
});

[listingDialog, inquiryDialog].forEach(dialog => {
    dialog.addEventListener("click", event => {
        if (event.target === dialog) dialog.close();
    });
});

$("openListingDialog").addEventListener("click", () => listingDialog.showModal());

function openInquiry(listing) {
    activeListingId = listing.id;
    inquiryTitle.textContent =
        listing.type === "Exchange" ? "Request Exchange" : "Send Inquiry";
    inquirySubtitle.textContent = `About: ${listing.title}`;
    inquiryForm.reset();
    inquiryDialog.showModal();
}

/* ---------- Forms ---------- */

listingForm.addEventListener("submit", event => {
    event.preventDefault();

    const price = Number($("price").value);

    if (!Number.isFinite(price) || price < 0) {
        alert("Enter a valid price of 0 or more.");
        return;
    }

    listings.push({
        id: makeId(),
        title: $("title").value.trim(),
        description: $("description").value.trim(),
        category: $("category").value,
        condition: $("condition").value,
        price,
        seller: $("seller").value.trim() || "You",
        image: uploadedImage || validImageUrl($("image").value.trim()),
        type: $("exchangeType").value,
        status: "Available",
        createdAt: Date.now(),
        isMine: true
    });

    saveData(LISTINGS_KEY, listings);
    listingForm.reset();
    clearImagePreview();
    listingDialog.close();
    currentView = "all";
    sortElement.value = "newest";
    renderAll();
    showToast("Listing added!");
});

inquiryForm.addEventListener("submit", event => {
    event.preventDefault();

    const listing = listings.find(item => item.id === activeListingId);
    if (!listing || listing.status !== "Available") {
        inquiryDialog.close();
        return;
    }

    requests.unshift({
        id: makeId(),
        listingId: listing.id,
        title: listing.title,
        kind: listing.type === "Exchange" ? "Exchange request" : "Inquiry",
        requester: $("reqName").value.trim(),
        contact: $("reqContact").value.trim(),
        message: $("reqMessage").value.trim(),
        status: "Pending",
        createdAt: Date.now()
    });

    saveData(REQUESTS_KEY, requests);
    inquiryDialog.close();
    renderAll();
    showToast("Request sent to the owner!");
});

/* ---------- Filters ---------- */

searchElement.addEventListener("input", renderListings);
categoryElement.addEventListener("change", renderListings);
sortElement.addEventListener("change", renderListings);

document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        currentView = tab.dataset.view;
        renderListings();
    });
});

/* ---------- Listing actions ---------- */

listingsElement.addEventListener("change", event => {
    const listingId = event.target.dataset.statusId;
    if (!listingId) return;

    const listing = listings.find(item => item.id === listingId);
    if (!listing || !listing.isMine) return;

    listing.status = event.target.value;
    saveData(LISTINGS_KEY, listings);
    renderAll();
    showToast(`Marked as ${listing.status}`);
});

listingsElement.addEventListener("click", event => {
    const requestButton = event.target.closest("[data-request-id]");
    if (requestButton) {
        const listing = listings.find(item => item.id === requestButton.dataset.requestId);
        if (listing && listing.status === "Available") openInquiry(listing);
        return;
    }

    const deleteButton = event.target.closest("[data-delete-id]");
    if (deleteButton) {
        const listing = listings.find(item => item.id === deleteButton.dataset.deleteId);
        if (!listing || !listing.isMine) return;
        if (!confirm(`Delete "${listing.title}"?`)) return;

        listings = listings.filter(item => item.id !== listing.id);
        requests = requests.filter(request => request.listingId !== listing.id);
        saveData(LISTINGS_KEY, listings);
        saveData(REQUESTS_KEY, requests);
        renderAll();
        showToast("Listing deleted");
    }
});

/* ---------- Request actions ---------- */

requestsElement.addEventListener("click", event => {
    const acceptButton = event.target.closest("[data-accept-id]");
    const declineButton = event.target.closest("[data-decline-id]");
    const requestId = acceptButton?.dataset.acceptId || declineButton?.dataset.declineId;
    if (!requestId) return;

    const request = requests.find(item => item.id === requestId);
    if (!request || request.status !== "Pending") return;

    if (acceptButton) {
        request.status = "Accepted";
        const listing = listings.find(item => item.id === request.listingId);
        if (listing && listing.status === "Available") {
            listing.status = "Reserved";
            saveData(LISTINGS_KEY, listings);
        }
        showToast("Request accepted. Item reserved.");
    } else {
        request.status = "Declined";
        showToast("Request declined");
    }

    saveData(REQUESTS_KEY, requests);
    renderAll();
});

/* ---------- Start ---------- */

seedSampleData();
renderAll();

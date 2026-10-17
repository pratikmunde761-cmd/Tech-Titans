"use strict";

const LISTINGS_KEY = "campusExchangeListings";
const REQUESTS_KEY = "campusExchangeRequests";
const SEEDED_KEY = "campusExchangeSeeded";

const form = document.getElementById("listingForm");
const listingsElement = document.getElementById("listings");
const requestsElement = document.getElementById("requests");
const searchElement = document.getElementById("search");
const categoryElement = document.getElementById("filterCategory");
const sortElement = document.getElementById("sort");
const imageFileElement = document.getElementById("imageFile");
const imagePreviewElement = document.getElementById("imagePreview");
const inquiryDialog = document.getElementById("inquiryDialog");
const inquiryForm = document.getElementById("inquiryForm");
const inquiryTitle = document.getElementById("inquiryTitle");

let currentView = "all";
let uploadedImage = "";
let activeListingId = null;
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
        alert("Your browser could not save this data. Try a smaller photo.");
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
    if (value.startsWith("data:image/")) return value;

    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function seedSampleData() {
    try {
        if (localStorage.getItem(SEEDED_KEY)) return;
    } catch {
        return;
    }

    const now = Date.now();
    const samples = [
        { title: "Engineering Mathematics Textbook", description: "Clean copy, no highlighting. Covers the Sem I syllabus.", category: "Books", condition: "Good", price: 150, type: "Sell" },
        { title: "Casio fx-991ES Plus Calculator", description: "Works perfectly, comes with cover.", category: "Electronics", condition: "Like New", price: 400, type: "Sell" },
        { title: "Lab Coat (Size M)", description: "Used for one semester, washed.", category: "Lab Supplies", condition: "Good", price: 0, type: "Donate" },
        { title: "Drafter + Geometry Box", description: "Complete set. Want to swap for a scientific calculator.", category: "Stationery", condition: "Acceptable", price: 0, type: "Exchange" }
    ].map((item, index) => ({
        ...item,
        id: makeId(),
        image: "",
        status: index === 2 ? "Reserved" : "Available",
        createdAt: now - index * 3600000,
        isMine: false
    }));

    listings.push(...samples);
    saveData(LISTINGS_KEY, listings);

    try {
        localStorage.setItem(SEEDED_KEY, "1");
    } catch {
        // Ignore: samples simply may show again next time.
    }
}

function renderListings() {
    document.querySelectorAll("nav button").forEach(button => {
        button.classList.toggle("active", button.dataset.view === currentView);
    });

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

        const badgeHTML = `<span class="badge badge-${escapeHTML(String(item.status).toLowerCase())}">${escapeHTML(item.status)}</span>`;

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
            : "";

        const actionHTML = item.isMine
            ? `<p>Your listing</p>
               <button type="button" class="danger" data-delete-id="${escapeHTML(item.id)}">Delete</button>`
            : item.status === "Available"
                ? `<button type="button" data-request-id="${escapeHTML(item.id)}">
                    ${item.type === "Exchange" ? "Request Exchange" : "Inquire"}
                   </button>`
                : "<p>This item is not currently available.</p>";

        return `
            <article class="card">
                ${imageHTML}
                ${badgeHTML}
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
            <p>Status: <strong>${escapeHTML(request.status)}</strong></p>
            ${request.status === "Pending" ? `
                <button type="button" data-accept-id="${escapeHTML(request.id)}">Accept</button>
                <button type="button" class="danger" data-decline-id="${escapeHTML(request.id)}">Decline</button>
            ` : ""}
            <p>${escapeHTML(new Date(request.createdAt).toLocaleString())}</p>
        </article>
    `).join("");
}

function clearImagePreview() {
    uploadedImage = "";
    imagePreviewElement.style.display = "none";
    imagePreviewElement.removeAttribute("src");
}

function openInquiry(listing) {
    activeListingId = listing.id;
    inquiryTitle.textContent =
        listing.type === "Exchange" ? "Request Exchange" : "Send Inquiry";
    inquiryForm.reset();
    inquiryDialog.showModal();
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
            imagePreviewElement.style.display = "block";
        };
        img.onerror = () => alert("Could not read this image.");
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
});

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
        image: uploadedImage || validImageUrl(document.getElementById("image").value.trim()),
        type: document.getElementById("exchangeType").value,
        status: "Available",
        createdAt: Date.now(),
        isMine: true
    });

    saveData(LISTINGS_KEY, listings);
    form.reset();
    clearImagePreview();
    currentView = "all";
    renderListings();
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
        requester: document.getElementById("reqName").value.trim(),
        contact: document.getElementById("reqContact").value.trim(),
        message: document.getElementById("reqMessage").value.trim(),
        status: "Pending",
        createdAt: Date.now()
    });

    saveData(REQUESTS_KEY, requests);
    renderRequests();
    inquiryDialog.close();
    showToast("Request sent to the owner!");
});

document.getElementById("inquiryCancel").addEventListener("click", () => {
    inquiryDialog.close();
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
        renderListings();
        renderRequests();
    }
});

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
            renderListings();
        }
    } else {
        request.status = "Declined";
    }

    saveData(REQUESTS_KEY, requests);
    renderRequests();
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

seedSampleData();
renderListings();
renderRequests();

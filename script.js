"use strict";

/* ===== PASTE YOUR SUPABASE DETAILS BETWEEN THE QUOTES ===== */
const SUPABASE_URL = "https://qdngjrzrxpcorqhfhalf.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_h1CKpfjU7NLkk9wNcYlQfQ_43Ys7iy-";
/* ========================================================== */

const OWNER_KEY = "campusExchangeOwnerId";
const CACHE_KEY = "campusExchangeCache";
const STATUSES = ["Available", "Reserved", "Completed"];
const REFRESH_MS = 15000;

const $ = id => document.getElementById(id);

const listingsElement = $("listings");
const requestsElement = $("requests");
const searchElement = $("search");
const categoryElement = $("filterCategory");
const sortElement = $("sort");
const statsElement = $("stats");
const resultCountElement = $("resultCount");
const requestCountElement = $("requestCount");
const syncElement = $("syncStatus");
const requestTabElements = document.querySelectorAll("[data-rtab]");
const listingDialog = $("listingDialog");
const listingForm = $("listingForm");
const imageFileElement = $("imageFile");
const imagePreviewElement = $("imagePreview");
const inquiryDialog = $("inquiryDialog");
const inquiryForm = $("inquiryForm");
const inquiryTitle = $("inquiryTitle");
const inquirySubtitle = $("inquirySubtitle");

let db = null;
let currentView = "all";
let requestTab = "received";
let uploadedImage = "";
let activeListingId = null;
let loadFailed = false;
let listings = [];
let requests = [];

try {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (error) {
    console.error("Supabase is not configured correctly.", error);
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

function getOwnerId() {
    try {
        let id = localStorage.getItem(OWNER_KEY);
        if (!id) {
            id = window.crypto && crypto.randomUUID ? crypto.randomUUID() : makeId();
            localStorage.setItem(OWNER_KEY, id);
        }
        return id;
    } catch {
        return makeId();
    }
}

const OWNER_ID = getOwnerId();

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
    setTimeout(() => toast.remove(), 2800);
}

function setSync(state, text) {
    syncElement.textContent = text;
    syncElement.className =
        "pill" + (state === "live" ? " pill-live" : state === "error" ? " pill-error" : "");
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

/* ---------- Database: reading ---------- */

function fromListingRow(row) {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        condition: row.condition,
        price: Number(row.price),
        type: row.type,
        status: row.status,
        image: row.image || "",
        seller: row.seller || "Student",
        ownerId: row.owner_id,
        createdAt: new Date(row.created_at).getTime(),
        isMine: row.owner_id === OWNER_ID
    };
}

function fromRequestRow(row) {
    return {
        id: row.id,
        listingId: row.listing_id,
        title: row.listing_title,
        kind: row.kind,
        requester: row.requester,
        contact: row.contact,
        message: row.message,
        status: row.status,
        requesterId: row.requester_id,
        ownerId: row.owner_id,
        createdAt: new Date(row.created_at).getTime()
    };
}

function readCache() {
    try {
        const saved = JSON.parse(localStorage.getItem(CACHE_KEY));
        if (saved && Array.isArray(saved.listings) && Array.isArray(saved.requests)) {
            listings = saved.listings.map(item => ({ ...item, isMine: item.ownerId === OWNER_ID }));
            requests = saved.requests;
        }
    } catch {
        // No usable cache.
    }
}

function writeCache() {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ listings, requests }));
    } catch {
        // Cache is optional.
    }
}

async function loadAll(showErrors) {
    if (!db) {
        loadFailed = true;
        setSync("error", "Not connected");
        renderAll();
        return false;
    }

    try {
        const [listingResult, requestResult] = await Promise.all([
            db.from("listings").select("*").order("created_at", { ascending: false }),
            db.from("requests").select("*").order("created_at", { ascending: false })
        ]);

        if (listingResult.error) throw listingResult.error;
        if (requestResult.error) throw requestResult.error;

        listings = listingResult.data.map(fromListingRow);
        requests = requestResult.data.map(fromRequestRow);
        loadFailed = false;
        writeCache();
        setSync("live", "● Live");
        renderAll();
        return true;
    } catch (error) {
        console.error("Could not load data.", error);
        loadFailed = true;
        setSync("error", "Offline");
        if (showErrors) showToast("Could not reach the database. Showing saved data.");
        renderAll();
        return false;
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
    document.querySelectorAll(".tab[data-view]").forEach(tab => {
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
        const message = loadFailed && listings.length === 0
            ? "<strong>Could not load listings</strong>Check your internet connection and refresh the page."
            : "<strong>No listings found</strong>Try another search, or add an item of your own.";
        listingsElement.innerHTML = `<div class="empty">${message}</div>`;
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
    const received = requests.filter(request => request.ownerId === OWNER_ID);
    const sent = requests.filter(request => request.requesterId === OWNER_ID);
    const pending = received.filter(request => request.status === "Pending").length;

    requestCountElement.textContent = `${pending} pending`;

    requestTabElements.forEach(tab => {
        const isReceived = tab.dataset.rtab === "received";
        tab.textContent = `${isReceived ? "Received" : "Sent"} (${isReceived ? received.length : sent.length})`;
        tab.classList.toggle("active", tab.dataset.rtab === requestTab);
    });

    const shown = requestTab === "received" ? received : sent;

    if (shown.length === 0) {
        requestsElement.innerHTML = requestTab === "received"
            ? `<p class="empty">No requests yet. When someone sends an inquiry about an item you listed, it appears here.</p>`
            : `<p class="empty">You haven't sent any inquiries yet. Click Inquire on any item to send one.</p>`;
        return;
    }

    requestsElement.innerHTML = shown.map(request => {
        const isReceived = requestTab === "received";
        const who = isReceived ? request.requester : "You";
        const meta = isReceived
            ? `${escapeHTML(request.kind)} from ${escapeHTML(request.requester)} · ${escapeHTML(request.contact)} · ${escapeHTML(timeAgo(request.createdAt))}`
            : `Your ${escapeHTML(request.kind.toLowerCase())} · ${escapeHTML(timeAgo(request.createdAt))}`;

        let footer = "";
        if (isReceived && request.status === "Pending") {
            footer = `
                <div class="request-actions">
                    <button type="button" class="btn-primary btn-sm" data-accept-id="${escapeHTML(request.id)}">Accept</button>
                    <button type="button" class="btn-danger btn-sm" data-decline-id="${escapeHTML(request.id)}">Decline</button>
                </div>`;
        } else if (!isReceived && request.status === "Pending") {
            footer = `<p class="request-meta">Waiting for the owner to respond.</p>`;
        }

        return `
            <article class="request-card">
                <span class="avatar">${escapeHTML(initial(who))}</span>
                <div class="request-main">
                    <div class="request-top">
                        <span class="request-title">${escapeHTML(request.title)}</span>
                        <span class="pill pill-${escapeHTML(String(request.status).toLowerCase())}">${escapeHTML(request.status)}</span>
                    </div>
                    <div class="request-meta">${meta}</div>
                    <p class="request-msg">${escapeHTML(request.message)}</p>
                    ${footer}
                </div>
            </article>
        `;
    }).join("");
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

/* ---------- Database: writing ---------- */

listingForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!db) {
        showToast("Not connected to the database.");
        return;
    }

    const price = Number($("price").value);

    if (!Number.isFinite(price) || price < 0) {
        alert("Enter a valid price of 0 or more.");
        return;
    }

    const submitButton = listingForm.querySelector("[type=submit]");
    submitButton.disabled = true;
    submitButton.textContent = "Saving...";

    try {
        const { data, error } = await db.from("listings").insert({
            title: $("title").value.trim(),
            description: $("description").value.trim(),
            category: $("category").value,
            condition: $("condition").value,
            price,
            type: $("exchangeType").value,
            status: "Available",
            image: uploadedImage || validImageUrl($("image").value.trim()) || null,
            seller: $("seller").value.trim() || "Student",
            owner_id: OWNER_ID
        }).select().single();

        if (error) throw error;

        listings.unshift(fromListingRow(data));
        writeCache();
        listingForm.reset();
        clearImagePreview();
        listingDialog.close();
        currentView = "all";
        sortElement.value = "newest";
        renderAll();
        showToast("Listing added!");
    } catch (error) {
        console.error("Could not save listing.", error);
        showToast("Could not save the listing. Please try again.");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Add listing";
    }
});

inquiryForm.addEventListener("submit", async event => {
    event.preventDefault();

    const listing = listings.find(item => item.id === activeListingId);
    if (!db || !listing || listing.status !== "Available") {
        inquiryDialog.close();
        return;
    }

    const alreadySent = requests.some(request =>
        request.listingId === listing.id &&
        request.requesterId === OWNER_ID &&
        request.status === "Pending"
    );

    if (alreadySent) {
        inquiryDialog.close();
        showToast("You already sent a request for this item.");
        return;
    }

    const submitButton = inquiryForm.querySelector("[type=submit]");
    submitButton.disabled = true;
    submitButton.textContent = "Sending...";

    try {
        const { error } = await db.from("requests").insert({
            listing_id: listing.id,
            listing_title: listing.title,
            kind: listing.type === "Exchange" ? "Exchange request" : "Inquiry",
            requester: $("reqName").value.trim(),
            contact: $("reqContact").value.trim(),
            message: $("reqMessage").value.trim(),
            status: "Pending",
            requester_id: OWNER_ID,
            owner_id: listing.ownerId
        });

        if (error) throw error;

        inquiryDialog.close();
        requestTab = "sent";
        await loadAll(false);
        showToast("Request sent to the owner!");
    } catch (error) {
        console.error("Could not send request.", error);
        showToast("Could not send the request. Please try again.");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Send";
    }
});

async function respondToRequest(request, accept) {
    try {
        const { error } = await db
            .from("requests")
            .update({ status: accept ? "Accepted" : "Declined" })
            .eq("id", request.id);

        if (error) throw error;

        if (accept) {
            const { error: listingError } = await db
                .from("listings")
                .update({ status: "Reserved" })
                .eq("id", request.listingId)
                .eq("status", "Available");

            if (listingError) throw listingError;
        }

        await loadAll(false);
        showToast(accept ? "Request accepted. Item reserved." : "Request declined");
    } catch (error) {
        console.error("Could not update request.", error);
        showToast("Could not update the request. Please try again.");
    }
}

/* ---------- Events ---------- */

searchElement.addEventListener("input", renderListings);
categoryElement.addEventListener("change", renderListings);
sortElement.addEventListener("change", renderListings);

document.querySelectorAll(".tab[data-view]").forEach(tab => {
    tab.addEventListener("click", () => {
        currentView = tab.dataset.view;
        renderListings();
    });
});

requestTabElements.forEach(tab => {
    tab.addEventListener("click", () => {
        requestTab = tab.dataset.rtab;
        renderRequests();
    });
});

listingsElement.addEventListener("change", async event => {
    const listingId = event.target.dataset.statusId;
    if (!listingId || !db) return;

    const listing = listings.find(item => item.id === listingId);
    if (!listing || !listing.isMine) return;

    const newStatus = event.target.value;
    const { error } = await db.from("listings").update({ status: newStatus }).eq("id", listingId);

    if (error) {
        console.error("Could not update status.", error);
        showToast("Could not update the status.");
    } else {
        showToast(`Marked as ${newStatus}`);
    }

    await loadAll(false);
});

listingsElement.addEventListener("click", async event => {
    const requestButton = event.target.closest("[data-request-id]");
    if (requestButton) {
        const listing = listings.find(item => item.id === requestButton.dataset.requestId);
        if (listing && listing.status === "Available") openInquiry(listing);
        return;
    }

    const deleteButton = event.target.closest("[data-delete-id]");
    if (deleteButton && db) {
        const listing = listings.find(item => item.id === deleteButton.dataset.deleteId);
        if (!listing || !listing.isMine) return;
        if (!confirm(`Delete "${listing.title}"?`)) return;

        const { error } = await db.from("listings").delete().eq("id", listing.id);

        if (error) {
            console.error("Could not delete listing.", error);
            showToast("Could not delete the listing.");
        } else {
            showToast("Listing deleted");
        }

        await loadAll(false);
    }
});

requestsElement.addEventListener("click", event => {
    const acceptButton = event.target.closest("[data-accept-id]");
    const declineButton = event.target.closest("[data-decline-id]");
    const requestId = acceptButton?.dataset.acceptId || declineButton?.dataset.declineId;
    if (!requestId || !db) return;

    const request = requests.find(item => item.id === requestId);
    if (!request || request.ownerId !== OWNER_ID || request.status !== "Pending") return;

    respondToRequest(request, Boolean(acceptButton));
});

/* ---------- Start and auto-refresh ---------- */

readCache();
renderAll();

if (listings.length === 0) {
    listingsElement.innerHTML = `<div class="empty"><strong>Loading listings...</strong></div>`;
}

loadAll(true);

setInterval(() => {
    const busy =
        document.visibilityState !== "visible" ||
        listingDialog.open ||
        inquiryDialog.open ||
        document.activeElement?.tagName === "SELECT";
    if (!busy) loadAll(false);
}, REFRESH_MS);

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadAll(false);
});

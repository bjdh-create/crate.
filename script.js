
/* ==========================================
   CRATE — PERSONAL ALBUM COLLECTION
========================================== */

// HTML Elements

const addAlbumButton = document.getElementById("add-album");
const searchModal = document.getElementById("search-modal");
const closeModalButton = document.getElementById("close-modal");
const albumSearchInput = document.getElementById("album-search");
const searchButton = document.getElementById("search-button");
const searchResults = document.getElementById("search-results");

const ratingModal = document.getElementById("rating-modal");
const closeRatingButton = document.getElementById("close-rating");
const selectedAlbumDisplay = document.getElementById("selected-album");
const ratingInput = document.getElementById("album-rating");
const saveAlbumButton = document.getElementById("save-album");
const albumGrid = document.getElementById("album-grid");


// ==========================================
// COLLECTION STORAGE
// ==========================================

let collection = JSON.parse(
    localStorage.getItem("crateCollection") || "[]"
);

let selectedAlbum = null;
let hunt = JSON.parse(localStorage.getItem("crateHunt") || "[]");
let searchDestination = "collection";
let foundAlbumId = null;
function saveHunt() {
    localStorage.setItem("crateHunt", JSON.stringify(hunt));
    renderHunt();
}



// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getAlbumArtist(album) {
    return (album["artist-credit"] || [])
        .map(item => item.name || "")
        .join("") || "Unknown Artist";
}

function getAlbumCover(albumId) {
    return "https://coverartarchive.org/release-group/" +
        encodeURIComponent(albumId) +
        "/front-250";
}

function closeSearchModal() {
    searchModal.classList.add("hidden");
}

function closeRatingModal() {
    ratingModal.classList.add("hidden");
    foundAlbumId = null;
}


// ==========================================
// MODAL CONTROLS
// ==========================================

addAlbumButton.addEventListener("click", () => {
    searchDestination = "collection";
    document.getElementById("search-modal-title").textContent = "Add an Album";
    searchResults.innerHTML = "";
    searchModal.classList.remove("hidden");
    albumSearchInput.focus();
});

closeModalButton.addEventListener("click", closeSearchModal);

searchModal.addEventListener("click", (event) => {
    if (event.target === searchModal) {
        closeSearchModal();
    }
});

closeRatingButton.addEventListener("click", closeRatingModal);

ratingModal.addEventListener("click", (event) => {
    if (event.target === ratingModal) {
        closeRatingModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeSearchModal();
        closeRatingModal();
    }
});


// ==========================================
// ALBUM AND ARTIST SEARCH
// ==========================================

searchButton.addEventListener("click", searchAlbums);

albumSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        searchAlbums();
    }
});

async function fetchMusicBrainz(url) {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(
                    `MusicBrainz error: ${response.status}`
                );
            }

            return await response.json();

        } catch (error) {
            console.warn(
                `Search attempt ${attempt} failed:`,
                error
            );

            if (attempt === maxAttempts) {
                throw error;
            }

            // Wait longer before each retry
            await new Promise(resolve =>
                setTimeout(resolve, attempt * 1500)
            );
        }
    }
}

async function searchAlbums() {
    const query = albumSearchInput.value.trim();

    if (!query) {
        searchResults.textContent =
            "Please enter an artist or album.";
        return;
    }

    searchResults.textContent = "Searching...";
    searchButton.disabled = true;

    const cleanQuery = query.replace(/["\\]/g, " ");

    const albumQuery =
        `releasegroup:"${cleanQuery}" AND primarytype:album`;

    const artistQuery =
        `artist:"${cleanQuery}" AND primarytype:album`;

    const baseUrl =
        "https://musicbrainz.org/ws/2/release-group/";

    try {
        // Search by album title

         const albumData = await fetchMusicBrainz(
         baseUrl +
         "?query=" + encodeURIComponent(albumQuery) +
         "&fmt=json&limit=25"
         );


        // Wait to respect MusicBrainz API rate limits
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Search by artist
        
         const artistData = await fetchMusicBrainz(
         baseUrl +
         "?query=" + encodeURIComponent(artistQuery) +
         "&fmt=json&limit=100"
         );


        const allAlbums = [
            ...(albumData["release-groups"] || []),
            ...(artistData["release-groups"] || [])
        ];

        // Remove common alternate editions
        const unwantedEditions =
            /\b(deluxe|expanded|remaster(?:ed)?|anniversary|bonus|special edition)\b/i;

        const seenAlbums = new Set();

        const uniqueAlbums = allAlbums.filter(album => {
            if (unwantedEditions.test(album.title)) {
                return false;
            }

            const artistName = getAlbumArtist(album);

            const key =
                artistName.trim().toLowerCase() + "|" +
                album.title.trim().toLowerCase();

            if (seenAlbums.has(key)) {
                return false;
            }

            seenAlbums.add(key);
            return true;
        });

        // Prioritize title matches, then release year
        uniqueAlbums.sort((a, b) => {
            const aTitleMatch =
                a.title.toLowerCase().includes(query.toLowerCase());

            const bTitleMatch =
                b.title.toLowerCase().includes(query.toLowerCase());

            if (aTitleMatch !== bTitleMatch) {
                return Number(bTitleMatch) - Number(aTitleMatch);
            }

            const aYear = a["first-release-date"] || "9999";
            const bYear = b["first-release-date"] || "9999";

            return aYear.localeCompare(bYear);
        });

        displaySearchResults(uniqueAlbums);

    } catch (error) {
        console.error(error);
        searchResults.textContent =
            "Search failed. Please try again.";
    } finally {
        searchButton.disabled = false;
    }
}


// ==========================================
// DISPLAY SEARCH RESULTS
// ==========================================

function displaySearchResults(albums) {
    searchResults.innerHTML = "";

    if (albums.length === 0) {
        searchResults.textContent = "No albums found.";
        return;
    }

    albums.forEach((album) => {
        const result = document.createElement("div");
        result.className = "search-result";
        result.style.cursor = "pointer";
        result.setAttribute("role", "button");
        result.tabIndex = 0;

        const cover = document.createElement("img");
        cover.className = "search-cover";
        cover.src = getAlbumCover(album.id);
        cover.alt = album.title + " cover";
        cover.loading = "lazy";

        // Fallback when artwork is missing
        cover.onerror = () => {
            cover.onerror = null;
            cover.removeAttribute("src");
            cover.alt = "Artwork unavailable";
        };

        const info = document.createElement("div");
        info.className = "search-info";

        const title = document.createElement("h3");
        title.textContent = album.title;

        const artist = document.createElement("p");
        artist.textContent = getAlbumArtist(album);

        const year = document.createElement("p");
        year.textContent =
            album["first-release-date"]?.slice(0, 4) ||
            "Unknown Year";

        const arrow = document.createElement("span");
        arrow.className = "result-arrow";
        arrow.textContent = "›";

        info.append(title, artist, year);
        result.append(cover, info, arrow);

        result.addEventListener("click", () => {
            chooseSearchAlbum(album);
        });

        result.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                chooseSearchAlbum(album);
            }
        });

        searchResults.appendChild(result);
    });
}


// ==========================================
// SELECT AN ALBUM
// ==========================================

function chooseSearchAlbum(album) {
    if (searchDestination === "hunt") {
        if (hunt.some(item => item.id === album.id) || collection.some(item => item.id === album.id)) {
            alert("This album is already in your wishlist or collection.");
            return;
        }
        hunt.push({
            id: album.id,
            title: album.title,
            artist: getAlbumArtist(album),
            year: album["first-release-date"]?.slice(0, 4) || "Unknown",
            cover: getAlbumCover(album.id),
            priority: "Medium",
            targetPrice: ""
        });
        saveHunt();
        closeSearchModal();
        showCratePage("hunt");
        return;
    }
    foundAlbumId = null;
    selectAlbum(album);
}

function selectAlbum(album) {
    selectedAlbum = album;

    selectedAlbumDisplay.innerHTML = "";

    const title = document.createElement("h3");
    title.textContent = album.title;

    const artist = document.createElement("p");
    artist.textContent = getAlbumArtist(album);

    selectedAlbumDisplay.append(title, artist);

    ratingInput.value = "8";
    document.getElementById("new-album-favourite").checked = false;
document.querySelector(".add-favourite-heart").textContent = "♡";

// Reset vibes for each new album
document.querySelectorAll(
    ".album-vibe-options input[type='checkbox']"
).forEach(checkbox => {
    checkbox.checked = false;
});


    closeSearchModal();
    ratingModal.classList.remove("hidden");
}


// ==========================================
// SAVE ALBUM TO COLLECTION
// ==========================================

saveAlbumButton.addEventListener("click", () => {
    if (!selectedAlbum) return;

    const rating = Number(ratingInput.value);

    if (
        ratingInput.value.trim() === "" ||
        !Number.isFinite(rating) ||
        rating < 1 ||
        rating > 10
    ) {
        alert("Please enter a rating between 1 and 10.");
        return;
    }

    const alreadyExists = collection.some(
        album => album.id === selectedAlbum.id
    );

    if (alreadyExists) {
        alert("This album is already in your collection.");
        return;
    }

const selectedMoods = Array.from(
    document.querySelectorAll(
        ".album-vibe-options input[type='checkbox']:checked"
    )
).map(checkbox => checkbox.value);

const isFavourite = document.getElementById("new-album-favourite").checked;

const albumToSave = {
    id: selectedAlbum.id,
    title: selectedAlbum.title,
    artist: getAlbumArtist(selectedAlbum),
    year: selectedAlbum["first-release-date"]?.slice(0, 4) || "Unknown",
    genre: "Unknown",
    cover: getAlbumCover(selectedAlbum.id),
    rating: rating,
    moods: selectedMoods,
    favourite: isFavourite
};

    collection.push(albumToSave);

    localStorage.setItem(
        "crateCollection",
        JSON.stringify(collection)
    );

    if (foundAlbumId) {
        hunt = hunt.filter(item => item.id !== foundAlbumId);
        foundAlbumId = null;
        saveHunt();
        showCratePage("collection");
    }
    closeRatingModal();
    selectedAlbum = null;

    updateFilterOptions();
    applyCollectionFilters();
});


// ==========================================
// DISPLAY MY COLLECTION
// ==========================================


function renderCollection(albums = collection) {
    albumGrid.innerHTML = "";


    if (albums.length === 0) {
        const message = document.createElement("p");
        message.className = "empty-message";
        message.textContent = "Your collection is empty.";

        albumGrid.appendChild(message);
        return;
    }

    albums.forEach((album) => {
        const card = document.createElement("div");
        card.className = "album-card";

        const cover = document.createElement("img");
        cover.src = album.cover;
        cover.alt = album.title + " cover";
        cover.loading = "lazy";

        cover.onerror = () => {
            cover.onerror = null;
            cover.removeAttribute("src");
            cover.alt = "Artwork unavailable";
        };

        const title = document.createElement("h3");
        title.textContent = album.title;

        const artist = document.createElement("p");
        artist.textContent = album.artist;

        const year = document.createElement("p");
        year.textContent = album.year;

        const rating = document.createElement("p");
        rating.className = "album-card-rating";
        rating.textContent = "★ " + album.rating + "/10";
        
if (album.favourite) {
    rating.textContent += "  ♥";
}


        
        // Album options menu
        const optionsContainer = document.createElement("div");
        optionsContainer.className = "album-options";

        const optionsButton = document.createElement("button");
        optionsButton.className = "album-options-button";
        optionsButton.type = "button";
        optionsButton.textContent = "⋯";
        optionsButton.setAttribute("aria-label", "Album options");
        optionsButton.setAttribute("aria-expanded", "false");

        const optionsMenu = document.createElement("div");
        optionsMenu.className = "album-options-menu hidden";

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-album";

const editRatingButton = document.createElement("button");
editRatingButton.type = "button";
editRatingButton.className = "edit-rating";
editRatingButton.textContent = "★ Edit Rating";

editRatingButton.addEventListener("click", () => {
    const newRating = prompt(
        `Edit your rating for "${album.title}" (1–10):`,
        album.rating
    );

    // Cancel was clicked
    if (newRating === null) return;

    const rating = Number(newRating);

    if (
        newRating.trim() === "" ||
        !Number.isFinite(rating) ||
        rating < 1 ||
        rating > 10
    ) {
        alert("Please enter a rating between 1 and 10.");
        return;
    }

    album.rating = rating;

    localStorage.setItem(
        "crateCollection",
        JSON.stringify(collection)
    );

    applyCollectionFilters();
});
       
const favouriteButton = document.createElement("button");
favouriteButton.type = "button";
favouriteButton.className = "favourite-album";

favouriteButton.textContent = album.favourite
    ? "♥ Remove from Favourites"
    : "♡ Add to Favourites";

favouriteButton.addEventListener("click", () => {
    album.favourite = !album.favourite;

    localStorage.setItem(
        "crateCollection",
        JSON.stringify(collection)
    );

    applyCollectionFilters();
});

        removeButton.textContent = "Remove Album";

        optionsButton.addEventListener("click", (event) => {
            event.stopPropagation();

            // Close other album menus
            document.querySelectorAll(".album-options-menu")
                .forEach(menu => {
                    menu.classList.add("hidden");
                });

            document.querySelectorAll(".album-options-button")
                .forEach(button => {
                    button.setAttribute("aria-expanded", "false");
                });

            optionsMenu.classList.remove("hidden");
            optionsButton.setAttribute("aria-expanded", "true");
        });

        removeButton.addEventListener("click", () => {
            const confirmed = confirm(
                `Remove "${album.title}" by ${album.artist} from your collection?`
            );

            if (!confirmed) return;

            collection = collection.filter(item => item.id !== album.id);

            localStorage.setItem(
                "crateCollection",
                JSON.stringify(collection)
            );

            updateFilterOptions();
            applyCollectionFilters();
        });

        

const moodButton = document.createElement("button");
moodButton.type = "button";
moodButton.className = "edit-moods";
moodButton.textContent = "♫ Set Vibes";

moodButton.addEventListener("click", () => {
    const availableMoods = [
        "Melancholy",
        "Chill",
        "Energetic",
        "Dreamy",
        "Dark",
        "Feel Good"
    ];

    const currentMoods = album.moods || [];

    const answer = prompt(
        `Set vibes for "${album.title}"\n\n` +
        `Available: ${availableMoods.join(", ")}\n\n` +
        "Enter one or more vibes separated by commas:",
        currentMoods.join(", ")
    );

    if (answer === null) return;

    const enteredMoods = answer
        .split(",")
        .map(mood => mood.trim())
        .filter(Boolean);

    const invalidMoods = enteredMoods.filter(
        mood => !availableMoods.some(
            available =>
                available.toLowerCase() === mood.toLowerCase()
        )
    );

    if (invalidMoods.length > 0) {
        alert(
            "Unrecognized vibes: " + invalidMoods.join(", ") +
            "\nPlease use the available mood names."
        );
        return;
    }

    album.moods = [
        ...new Set(enteredMoods.map(mood =>
            availableMoods.find(
                available =>
                    available.toLowerCase() === mood.toLowerCase()
            )
        ))
    ];

    localStorage.setItem(
        "crateCollection",
        JSON.stringify(collection)
    );

    applyCollectionFilters();
});

optionsMenu.append(
    editRatingButton,
    favouriteButton,
    moodButton,
    removeButton
);


        optionsContainer.append(optionsButton, optionsMenu);

        card.append(cover, title, artist, year, rating, optionsContainer);
        albumGrid.appendChild(card);

    });
}


// ==========================================
// INITIALIZE CRATE
// ==========================================

renderCollection();


// ==========================================
// COLLECTION FILTERS
// ==========================================

const collectionSearch = document.getElementById("collection-search");
const genreFilter = document.getElementById("genre-filter");
const decadeFilter = document.getElementById("decade-filter");
const ratingFilter = document.getElementById("rating-filter");
const sortFilter = document.getElementById("sort-filter");
const clearFiltersButton = document.getElementById("clear-filters");
const collectionCount = document.getElementById("collection-count");
const favouritesFilter = document.getElementById("favourites-filter");

function updateFilterOptions() {
    const selectedGenre = genreFilter.value;
    const selectedDecade = decadeFilter.value;

    const genres = [...new Set(
        collection.map(album => album.genre || "Unknown")
    )].sort();

    genreFilter.innerHTML = '<option value="all">All Genres</option>';

    genres.forEach(genre => {
        const option = document.createElement("option");
        option.value = genre;
        option.textContent = genre;
        genreFilter.appendChild(option);
    });

    if (genres.includes(selectedGenre)) {
        genreFilter.value = selectedGenre;
    }

    const decades = [...new Set(
        collection
            .map(album => parseInt(album.year, 10))
            .filter(year => Number.isFinite(year) && year > 0)
            .map(year => Math.floor(year / 10) * 10)
    )].sort((a, b) => a - b);

    decadeFilter.innerHTML = '<option value="all">All Decades</option>';

    decades.forEach(decade => {
        const option = document.createElement("option");
        option.value = String(decade);
        option.textContent = decade + "s";
        decadeFilter.appendChild(option);
    });

    if (decades.map(String).includes(selectedDecade)) {
        decadeFilter.value = selectedDecade;
    }
}

function getFilteredAlbums() {
    const search = collectionSearch.value.trim().toLowerCase();

    const filtered = collection.filter(album => {
        const matchesSearch =
            album.title.toLowerCase().includes(search) ||
            album.artist.toLowerCase().includes(search);

        const matchesGenre =
            genreFilter.value === "all" ||
            (album.genre || "Unknown") === genreFilter.value;

        const year = parseInt(album.year, 10);
        const decade = Math.floor(year / 10) * 10;

        const matchesDecade =
            decadeFilter.value === "all" ||
            String(decade) === decadeFilter.value;

        const matchesRating =
            Number(album.rating) >= Number(ratingFilter.value);

const matchesFavourite =
    !favouritesFilter.checked || album.favourite === true;


        
return matchesSearch &&
       matchesGenre &&
       matchesDecade &&
       matchesRating &&
       matchesFavourite;

    });

    filtered.sort((a, b) => {
        switch (sortFilter.value) {
            case "artist":
                return a.artist.localeCompare(b.artist) ||
                       a.title.localeCompare(b.title);

            case "title":
                return a.title.localeCompare(b.title);

            case "newest":
                return (Number(b.year) || 0) - (Number(a.year) || 0);

            case "oldest":
                return (Number(a.year) || 9999) -
                       (Number(b.year) || 9999);

            case "highest":
                return Number(b.rating) - Number(a.rating);

            case "lowest":
                return Number(a.rating) - Number(b.rating);

            default:
                return 0;
        }
    });

    return filtered;
}

function applyCollectionFilters() {
    const albums = getFilteredAlbums();

    collectionCount.textContent =
        `Showing ${albums.length} of ${collection.length} albums`;

    renderCollection(albums);
}


[
    collectionSearch,
    genreFilter,
    decadeFilter,
    ratingFilter,
    sortFilter,
    favouritesFilter
].forEach(control => {
    control.addEventListener("input", applyCollectionFilters);
});


clearFiltersButton.addEventListener("click", () => {
    collectionSearch.value = "";
    genreFilter.value = "all";
    decadeFilter.value = "all";
    ratingFilter.value = "0";
    sortFilter.value = "artist";
    favouritesFilter.checked = false;

    applyCollectionFilters();
});

updateFilterOptions();
applyCollectionFilters();


// ==========================================
// EXPORT AND IMPORT COLLECTION
// ==========================================

const exportButton = document.getElementById("export-collection");
const importButton = document.getElementById("import-collection");
const importFileInput = document.getElementById("import-file");

// Export collection as a JSON backup
exportButton.addEventListener("click", () => {
    const backup = JSON.stringify(collection, null, 2);

    const blob = new Blob([backup], {
        type: "application/json"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download =
        "crate-backup-" +
        new Date().toISOString().slice(0, 10) +
        ".json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
});

// Open file picker
importButton.addEventListener("click", () => {
    importFileInput.click();
});

// Import collection from backup
importFileInput.addEventListener("change", async () => {
    const file = importFileInput.files[0];

    if (!file) return;

    try {
        const text = await file.text();
        const importedAlbums = JSON.parse(text);

        // Check basic backup structure
        if (
            !Array.isArray(importedAlbums) ||
            !importedAlbums.every(album =>
                album &&
                typeof album.id === "string" &&
                typeof album.title === "string" &&
                typeof album.artist === "string" &&
                typeof album.rating === "number" &&
                Number.isFinite(album.rating) &&
                album.rating >= 1 &&
                album.rating <= 10
            )
        ) {
            throw new Error("Invalid Crate backup format");
        }

        const confirmed = confirm(
            "Import " + importedAlbums.length +
            " albums?\n\n" +
            "This will REPLACE your current collection of " +
            collection.length + " albums.\n\n" +
            "Export your current collection first if you want to keep it."
        );

        if (!confirmed) return;

        // Save before updating the displayed collection
        localStorage.setItem(
            "crateCollection",
            JSON.stringify(importedAlbums)
        );

        collection = importedAlbums;

        updateFilterOptions();
        applyCollectionFilters();

        alert(
            "Import complete! " +
            collection.length +
            " albums restored."
        );

    } catch (error) {
        console.error(error);
        alert(
            "Could not import this file. " +
            "Please select a valid Crate JSON backup."
        );
    } finally {
        importFileInput.value = "";
    }
});


// ==========================================
// CRATE TOOLS DROPDOWN
// ==========================================

const toolsToggle = document.getElementById("tools-toggle");
const toolsMenu = document.getElementById("tools-menu");

toolsToggle.setAttribute("aria-expanded", "false");

toolsToggle.addEventListener("click", () => {
    const isHidden = toolsMenu.classList.toggle("hidden");
    toolsToggle.setAttribute("aria-expanded", String(!isHidden));
});

// Close when clicking outside
document.addEventListener("click", (event) => {
    if (!event.target.closest(".tools-dropdown")) {
        toolsMenu.classList.add("hidden");
        toolsToggle.setAttribute("aria-expanded", "false");
    }
});

// Close after selecting an option
toolsMenu.addEventListener("click", (event) => {
    if (event.target.closest("button")) {
        toolsMenu.classList.add("hidden");
        toolsToggle.setAttribute("aria-expanded", "false");
    }
});

// Close with Escape
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        toolsMenu.classList.add("hidden");
        toolsToggle.setAttribute("aria-expanded", "false");
    }
});


document.addEventListener("click", (event) => {
    if (!event.target.closest(".album-options")) {
        document.querySelectorAll(".album-options-menu")
            .forEach(menu => menu.classList.add("hidden"));

        document.querySelectorAll(".album-options-button")
            .forEach(button =>
                button.setAttribute("aria-expanded", "false")
            );
    }
});


// ==========================================
// THE LISTENING ROOM
// ==========================================

const collectionTab = document.getElementById("collection-tab");
const listeningTab = document.getElementById("listening-tab");
const collectionPage = document.getElementById("collection-page");
const listeningRoom = document.getElementById("listening-room");

const vibeButtons = document.querySelectorAll(".vibe-button");
const pickRecordButton = document.getElementById("pick-record");
const vibeResult = document.getElementById("vibe-result");

let selectedVibe = null;
let lastPickedAlbumId = null;

// Navigation
const huntTab = document.getElementById("hunt-tab");
const huntPage = document.getElementById("hunt-page");
function showCratePage(page) {
    collectionPage.classList.toggle("hidden", page !== "collection");
    listeningRoom.classList.toggle("hidden", page !== "listening");
    huntPage.classList.toggle("hidden", page !== "hunt");
    collectionTab.classList.toggle("active", page === "collection");
    listeningTab.classList.toggle("active", page === "listening");
    huntTab.classList.toggle("active", page === "hunt");
}
collectionTab.addEventListener("click", () => showCratePage("collection"));
listeningTab.addEventListener("click", () => showCratePage("listening"));
huntTab.addEventListener("click", () => showCratePage("hunt"));

document.getElementById("add-hunt").addEventListener("click", () => {
    searchDestination = "hunt";
    document.getElementById("search-modal-title").textContent = "Add to The Hunt";
    albumSearchInput.value = "";
    searchResults.innerHTML = "";
    searchModal.classList.remove("hidden");
    albumSearchInput.focus();
});
document.getElementById("hunt-search").addEventListener("input", renderHunt);

function renderHunt() {
    const grid = document.getElementById("hunt-grid");
    const query = document.getElementById("hunt-search").value.toLowerCase().trim();
    const visible = hunt.filter(a => (a.title + " " + a.artist).toLowerCase().includes(query));
    document.getElementById("hunt-count").textContent =
        `Showing ${visible.length} of ${hunt.length} wanted albums`;
    grid.replaceChildren();
    if (!visible.length) {
        const empty = document.createElement("p");
        empty.className = "empty-message";
        empty.textContent = hunt.length ? "No matching albums." : "Your hunt starts here. Add a record you want to find.";
        grid.append(empty);
        return;
    }
    visible.forEach(album => {
        const card = document.createElement("article");
        card.className = "hunt-card";
        const cover = document.createElement("img");
        cover.src = album.cover;
        cover.alt = album.title + " cover";
        cover.loading = "lazy";
        cover.onerror = () => { cover.onerror = null; cover.removeAttribute("src"); };
        const title = document.createElement("h3");
        title.textContent = album.title;
        const artist = document.createElement("p");
        artist.textContent = album.artist;
        const year = document.createElement("p");
        year.textContent = album.year;
        const priorityLabel = document.createElement("label");
        priorityLabel.textContent = "Priority";
        const priority = document.createElement("select");
        ["High", "Medium", "Low"].forEach(level => {
            const option = document.createElement("option");
            option.value = level;
            option.textContent = level;
            priority.append(option);
        });
        priority.value = album.priority || "Medium";
        priority.addEventListener("change", () => { album.priority = priority.value; saveHunt(); });
        priorityLabel.append(priority);
        const priceLabel = document.createElement("label");
        priceLabel.textContent = "Target price ($)";
        const price = document.createElement("input");
        price.type = "number";
        price.min = "0";
        price.step = "0.01";
        price.placeholder = "Optional";
        price.value = album.targetPrice ?? "";
        price.addEventListener("change", () => {
            album.targetPrice = price.value === "" ? "" : String(Math.max(0, Number(price.value) || 0));
            saveHunt();
        });
        priceLabel.append(price);
        const found = document.createElement("button");
        found.type = "button";
        found.textContent = "Found It!";
        found.addEventListener("click", () => {
            foundAlbumId = album.id;
            selectAlbum({
                id: album.id,
                title: album.title,
                "artist-credit": [{name: album.artist}],
                "first-release-date": album.year === "Unknown" ? "" : album.year
            });
        });
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "hunt-remove";
        remove.textContent = "Remove";
        remove.addEventListener("click", () => {
            if (!confirm(`Remove "${album.title}" from The Hunt?`)) return;
            hunt = hunt.filter(a => a.id !== album.id);
            saveHunt();
        });
        const actions = document.createElement("div");
        actions.className = "hunt-actions";
        actions.append(found, remove);
        card.append(cover, title, artist, year, priorityLabel, priceLabel, actions);
        grid.append(card);
    });
}
renderHunt();

// Select a mood
vibeButtons.forEach(button => {
    button.addEventListener("click", () => {
        selectedVibe = button.dataset.vibe;

        vibeButtons.forEach(item =>
            item.classList.remove("active")
        );

        button.classList.add("active");
        pickRecordButton.disabled = false;

        vibeResult.innerHTML = "";
        lastPickedAlbumId = null;
    });
});

// Pick an album from the collection
pickRecordButton.addEventListener("click", () => {
    if (!selectedVibe) return;

    const matchingAlbums = collection.filter(album =>
        Array.isArray(album.moods) &&
        album.moods.includes(selectedVibe)
    );

    vibeResult.innerHTML = "";

    if (matchingAlbums.length === 0) {
        const message = document.createElement("p");
        message.textContent =
            `No albums tagged "${selectedVibe}" yet. ` +
            "Go to My Collection and use ⋯ → Set Vibes.";

        vibeResult.appendChild(message);
        return;
    }

    // Avoid immediately repeating the same album when possible
    const choices = matchingAlbums.filter(
        album => album.id !== lastPickedAlbumId
    );

    const pool = choices.length > 0
        ? choices
        : matchingAlbums;

    const album = pool[Math.floor(Math.random() * pool.length)];

    lastPickedAlbumId = album.id;

    const card = document.createElement("div");
    card.className = "vibe-result-card";

    const cover = document.createElement("img");
    cover.src = album.cover;
    cover.alt = album.title + " cover";

    const info = document.createElement("div");

    const title = document.createElement("h3");
    title.textContent = album.title;

    const artist = document.createElement("p");
    artist.textContent = album.artist;

    const year = document.createElement("p");
    year.textContent = album.year || "Unknown Year";

    const rating = document.createElement("p");
    rating.className = "vibe-rating";
    rating.textContent = "★ " + album.rating + "/10";

    info.append(title, artist, year, rating);
    card.append(cover, info);

    vibeResult.appendChild(card);

    pickRecordButton.textContent = "Pick Again ↻";
});


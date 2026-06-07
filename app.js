/**
 * Gitā Jñāna - Bhagavad Gitā Vedāntic Explorer
 * Core Application Engine
 */

// Application State
const state = {
  currentScripture: "bhagavad-gita",
  currentChapter: 1,
  currentVerse: 1,
  scriptures: [],
  chaptersMeta: [],
  chapterVersesCache: {}, // Map of scripture_id -> chapter_number -> array of verse objects
  activeTranslators: new Set(["Swami Sivananda", "Swami Adidevananda", "Swami Gambirananda", "English Translation", "VedaPath English", "Standard English"]),
  activeCommentator: "",
  activeTab: "tabHeaderTranslations",
  theme: "dark",
  globalSearchCache: [], // Array of loaded verses for active scripture
  searchCacheLoaded: false,
  fontSizeScale: 1.0
};

// Author-to-School Map (Vedantic Context)
const schoolMap = {
  "Sri Shankaracharya": "Advaita (Non-Dualism)",
  "Sri Madhusudan Saraswati": "Advaita (Non-Dualism)",
  "Sri Anandgiri": "Advaita (Gloss)",
  "Sri Ramanujacharya": "Vishishtadvaita (Qualified Non-Dualism)",
  "Sri Vedantadeshikacharya Venkatanatha": "Vishishtadvaita (Gloss)",
  "Swami Adidevananda": "Vishishtadvaita (Translation)",
  "Sri Madhavacharya": "Dvaita (Dualism)",
  "Sri Jayatritha": "Dvaita (Gloss)",
  "Sri Sridhara Swami": "Suddhadvaita (Pure Non-Dualism)",
  "Sri Vallabhacharya": "Suddhadvaita (Pure Non-Dualism)",
  "Sri Purushottamji": "Suddhadvaita (Gloss)",
  "Sri Dhanpati": "Vedanta (General)",
  "Sri Neelkanth": "Vedanta (General)",
  "Sri Abhinavgupta": "Kashmir Shaivism",
  "Swami Ramsukhdas": "Bhakti / Karma Yoga",
  "Swami Chinmayananda": "Modern Vedanta",
  "Swami Sivananda": "Modern Vedanta",
  "Swami Tejomayananda": "Modern Vedanta"
};

// ==========================================================================
// DOM Elements Cache
// ==========================================================================
const DOM = {
  body: document.body,
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  themeIcon: document.getElementById("themeIcon"),
  scriptureSelect: document.getElementById("scriptureSelect"),
  chapterSelect: document.getElementById("chapterSelect"),
  summaryChapterName: document.getElementById("summaryChapterName"),
  summaryChapterText: document.getElementById("summaryChapterText"),
  verseGrid: document.getElementById("verseGrid"),
  currentCoordinates: document.getElementById("currentCoordinates"),
  prevVerseBtn: document.getElementById("prevVerseBtn"),
  nextVerseBtn: document.getElementById("nextVerseBtn"),
  copyShareBtn: document.getElementById("copyShareBtn"),
  decFontBtn: document.getElementById("decFontBtn"),
  incFontBtn: document.getElementById("incFontBtn"),
  sanskritText: document.getElementById("sanskritText"),
  transliterationText: document.getElementById("transliterationText"),
  translatorCheckboxes: document.getElementById("translatorCheckboxes"),
  translationComparisonGrid: document.getElementById("translationComparisonGrid"),
  wordBreakdownGrid: document.getElementById("wordBreakdownGrid"),
  commentatorSelect: document.getElementById("commentatorSelect"),
  commentaryAuthorName: document.getElementById("commentaryAuthorName"),
  commentaryLangTag: document.getElementById("commentaryLangTag"),
  commentaryBodyText: document.getElementById("commentaryBodyText"),
  faqsList: document.getElementById("faqsList"),
  
  // Tabs
  tabHeaders: document.querySelectorAll(".tab-header-btn"),
  tabPanels: document.querySelectorAll(".tab-content-panel"),
  
  // Search
  searchInput: document.getElementById("searchInput"),
  searchButton: document.getElementById("searchButton"),
  searchModal: document.getElementById("searchModal"),
  closeSearchBtn: document.getElementById("closeSearchBtn"),
  searchResultsBody: document.getElementById("searchResultsBody"),
  
  // Mobile Navigation Drawer & Search Triggers
  menuToggleBtn: document.getElementById("menuToggleBtn"),
  sidebarCloseBtn: document.getElementById("sidebarCloseBtn"),
  sidebarOverlay: document.getElementById("sidebarOverlay"),
  sidebarSection: document.getElementById("sidebarSection"),
  searchTriggerBtn: document.getElementById("searchTriggerBtn")
};

// ==========================================================================
// Initialization & Data Fetchers
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await loadScriptures();
  await loadChaptersMeta();
  const verses = await loadChapterData(state.currentChapter);
  renderVerseGrid();
  const firstVerseNum = verses && verses.length > 0 ? verses[0].metadata.verse_number : 1;
  selectVerse(firstVerseNum);
});

// Setup Action Listeners
function setupEventListeners() {
  // Theme toggle
  DOM.themeToggleBtn.addEventListener("click", toggleTheme);
  
  // Scripture change
  if (DOM.scriptureSelect) {
    DOM.scriptureSelect.addEventListener("change", (e) => {
      handleScriptureChange(e.target.value);
    });
  }
  
  // Chapter change
  DOM.chapterSelect.addEventListener("change", (e) => {
    handleChapterChange(parseInt(e.target.value));
  });
  
  // Tab change
  DOM.tabHeaders.forEach(header => {
    header.addEventListener("click", () => {
      switchTab(header.id);
    });
  });
  
  // Commentator dropdown select
  DOM.commentatorSelect.addEventListener("change", (e) => {
    state.activeCommentator = e.target.value;
    renderSelectedCommentary();
  });
  
  // Copy to Share button click
  DOM.copyShareBtn.addEventListener("click", copyVerseForSharing);

  // Prev / Next verse navigation
  if (DOM.prevVerseBtn) {
    DOM.prevVerseBtn.addEventListener("click", navigateToPrevVerse);
  }
  if (DOM.nextVerseBtn) {
    DOM.nextVerseBtn.addEventListener("click", navigateToNextVerse);
  }
  
  // Font Size adjustment buttons
  DOM.decFontBtn.addEventListener("click", () => adjustFontSize(-1));
  DOM.incFontBtn.addEventListener("click", () => adjustFontSize(1));
  
  // Search actions
  DOM.searchButton.addEventListener("click", performSearch);
  DOM.searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") performSearch();
  });
  DOM.searchInput.addEventListener("focus", () => {
    loadGlobalSearchCache();
  });
  DOM.closeSearchBtn.addEventListener("click", closeSearchModal);
  DOM.searchModal.addEventListener("click", (e) => {
    if (e.target === DOM.searchModal) closeSearchModal();
  });
  
  // Search Trigger Button (opens modal and focuses search input)
  if (DOM.searchTriggerBtn) {
    DOM.searchTriggerBtn.addEventListener("click", () => {
      DOM.searchModal.classList.add("active");
      DOM.searchModal.setAttribute("aria-hidden", "false");
      loadGlobalSearchCache();
      setTimeout(() => {
        if (DOM.searchInput) DOM.searchInput.focus();
      }, 150);
    });
  }

  // Mobile navigation drawer toggle and close listeners
  if (DOM.menuToggleBtn) {
    DOM.menuToggleBtn.addEventListener("click", toggleMobileSidebar);
  }
  if (DOM.sidebarCloseBtn) {
    DOM.sidebarCloseBtn.addEventListener("click", closeMobileSidebar);
  }
  if (DOM.sidebarOverlay) {
    DOM.sidebarOverlay.addEventListener("click", closeMobileSidebar);
  }
}

// Mobile navigation drawer handlers
function toggleMobileSidebar() {
  if (DOM.sidebarSection && DOM.sidebarOverlay) {
    DOM.sidebarSection.classList.toggle("open");
    DOM.sidebarOverlay.classList.toggle("active");
  }
}

// Make globally accessible if needed
window.closeMobileSidebar = function() {
  if (DOM.sidebarSection && DOM.sidebarOverlay) {
    DOM.sidebarSection.classList.remove("open");
    DOM.sidebarOverlay.classList.remove("active");
  }
};

function closeMobileSidebar() {
  window.closeMobileSidebar();
}

// Load Scriptures list
async function loadScriptures() {
  try {
    const response = await fetch("./data/scriptures.json");
    state.scriptures = await response.json();
    
    // Group scriptures by category
    const categories = {};
    state.scriptures.forEach(sc => {
      const cat = sc.category || "General";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(sc);
    });
    
    DOM.scriptureSelect.innerHTML = "";
    Object.keys(categories).forEach(cat => {
      const group = document.createElement("optgroup");
      group.label = cat;
      categories[cat].forEach(sc => {
        const option = document.createElement("option");
        option.value = sc.id;
        option.textContent = sc.name;
        group.appendChild(option);
      });
      DOM.scriptureSelect.appendChild(group);
    });
    
    DOM.scriptureSelect.value = state.currentScripture;
  } catch (error) {
    console.error("Failed to load scriptures index:", error);
  }
}

// Load Chapter Summaries for Sidebar
async function loadChaptersMeta() {
  try {
    const response = await fetch(`./data/${state.currentScripture}/summary.json`);
    state.chaptersMeta = await response.json();
    
    // Populate chapter select dropdown
    DOM.chapterSelect.innerHTML = "";
    state.chaptersMeta.forEach((ch) => {
      const option = document.createElement("option");
      option.value = ch.chapter_number;
      const chName = ch.name_translation || ch.name || `Chapter ${ch.chapter_number}`;
      option.textContent = `Ch ${ch.chapter_number}: ${chName}`;
      DOM.chapterSelect.appendChild(option);
    });
    
    updateChapterSummary();
  } catch (error) {
    console.error("Failed to load chapters summaries:", error);
  }
}

// Load full verses for a specific chapter
async function loadChapterData(chapterNum) {
  if (!state.chapterVersesCache[state.currentScripture]) {
    state.chapterVersesCache[state.currentScripture] = {};
  }
  
  if (state.chapterVersesCache[state.currentScripture][chapterNum]) {
    return state.chapterVersesCache[state.currentScripture][chapterNum];
  }
  
  try {
    const response = await fetch(`./data/${state.currentScripture}/chapters/chapter_${chapterNum}.json`);
    const verses = await response.json();
    state.chapterVersesCache[state.currentScripture][chapterNum] = verses;
    return verses;
  } catch (error) {
    console.error(`Failed to load verses for Chapter ${chapterNum} of ${state.currentScripture}:`, error);
    return [];
  }
}

// Handle scripture change
async function handleScriptureChange(scriptureId) {
  state.currentScripture = scriptureId;
  state.currentChapter = 1;
  state.searchCacheLoaded = false;
  state.globalSearchCache = [];
  
  await loadChaptersMeta();
  const verses = await loadChapterData(state.currentChapter);
  renderVerseGrid();
  const firstVerseNum = verses && verses.length > 0 ? verses[0].metadata.verse_number : 1;
  selectVerse(firstVerseNum);
}

// Background loading of remaining chapters for active scripture
async function loadGlobalSearchCache() {
  if (state.searchCacheLoaded) return;
  
  const scId = state.currentScripture;
  console.log(`Starting background loading of all chapters for ${scId}...`);
  const activeMeta = state.chaptersMeta;
  if (!activeMeta || activeMeta.length === 0) return;
  
  const promises = [];
  activeMeta.forEach(ch => {
    promises.push(loadChapterData(ch.chapter_number));
  });
  
  try {
    const allChapters = await Promise.all(promises);
    if (state.currentScripture === scId) {
      state.globalSearchCache = allChapters.flat();
      state.searchCacheLoaded = true;
      console.log(`Search cache for ${scId} fully ready: Indexed ${state.globalSearchCache.length} verses.`);
    }
  } catch (err) {
    console.error(`Failed background loading search cache for ${scId}`, err);
  }
}

// ==========================================================================
// UI Rendering & Navigation
// ==========================================================================

// Update Sidebar Chapter Summary Info
function updateChapterSummary() {
  const currentMeta = state.chaptersMeta.find(c => c.chapter_number === state.currentChapter);
  if (currentMeta) {
    const chName = currentMeta.name_translation || currentMeta.name || `Chapter ${state.currentChapter}`;
    const chTrans = currentMeta.name_transliterated || "";
    const nameSanskrit = currentMeta.name_sanskrit || "";
    
    if (chTrans) {
      DOM.summaryChapterName.textContent = `${currentMeta.chapter_number}. ${chName} (${chTrans})`;
    } else if (nameSanskrit) {
      DOM.summaryChapterName.textContent = `${currentMeta.chapter_number}. ${chName} (${nameSanskrit})`;
    } else {
      DOM.summaryChapterName.textContent = `${currentMeta.chapter_number}. ${chName}`;
    }
    
    DOM.summaryChapterText.textContent = currentMeta.chapter_summary || currentMeta.summary || "No summary available.";
  }
}

// Render verse grid buttons based on current chapter verses count
function renderVerseGrid() {
  const scCache = state.chapterVersesCache[state.currentScripture];
  const chapterVerses = scCache ? scCache[state.currentChapter] : null;
  if (!chapterVerses || chapterVerses.length === 0) {
    // Fallback if data is not loaded yet (should not happen since we await loadChapterData)
    const currentMeta = state.chaptersMeta.find(c => c.chapter_number === state.currentChapter);
    const count = currentMeta ? currentMeta.verses_count : 47;
    DOM.verseGrid.innerHTML = "";
    for (let i = 1; i <= count; i++) {
      const btn = document.createElement("button");
      btn.className = "verse-btn";
      btn.id = `verseBtn_${i}`;
      btn.textContent = i;
      btn.setAttribute("aria-label", `Jump to verse ${i}`);
      btn.addEventListener("click", () => {
        selectVerse(i);
      });
      DOM.verseGrid.appendChild(btn);
    }
    return;
  }
  
  DOM.verseGrid.innerHTML = "";
  chapterVerses.forEach(verse => {
    const vNum = verse.metadata.verse_number;
    const btn = document.createElement("button");
    btn.className = "verse-btn";
    btn.id = `verseBtn_${vNum}`;
    btn.textContent = vNum;
    btn.setAttribute("aria-label", `Jump to verse ${vNum}`);
    
    btn.addEventListener("click", () => {
      selectVerse(vNum);
    });
    
    DOM.verseGrid.appendChild(btn);
  });
}

// Handle switching of chapters
async function handleChapterChange(chapterNum, selectFirst = true) {
  state.currentChapter = chapterNum;
  const verses = await loadChapterData(chapterNum);
  updateChapterSummary();
  renderVerseGrid();
  if (selectFirst) {
    const firstVerseNum = verses && verses.length > 0 ? verses[0].metadata.verse_number : 1;
    selectVerse(firstVerseNum);
  }
}

// Select and load a specific verse
function selectVerse(verseNum) {
  state.currentVerse = verseNum;
  
  // Highlight active button in grid
  document.querySelectorAll(".verse-btn").forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.getElementById(`verseBtn_${verseNum}`);
  if (activeBtn) activeBtn.classList.add("active");
  
  const currentMeta = state.chaptersMeta.find(c => c.chapter_number === state.currentChapter);
  const chName = currentMeta ? (currentMeta.name_translation || currentMeta.name) : "Chapter";
  DOM.currentCoordinates.textContent = `${chName} • Verse ${verseNum}`;
  
  renderVerseDetails();
  
  // Auto-close sidebar on mobile screen size after selection
  if (window.innerWidth <= 960) {
    if (typeof window.closeMobileSidebar === 'function') {
      window.closeMobileSidebar();
    }
  }
}

// Render the details of the active verse
function renderVerseDetails() {
  const scCache = state.chapterVersesCache[state.currentScripture];
  const chapterVerses = scCache ? scCache[state.currentChapter] : null;
  if (!chapterVerses) return;
  
  const verse = chapterVerses.find(v => v.metadata.verse_number === state.currentVerse);
  if (!verse) return;
  
  // 1. Sanskrit and Transliteration
  DOM.sanskritText.textContent = verse.sanskrit_shloka;
  DOM.transliterationText.textContent = verse.transliteration || "";
  if (!verse.transliteration) {
    DOM.transliterationText.textContent = "";
  }
  updateFontSize();
  
  // 2. Tab: Translations Tab Rendering
  renderTranslationsTab(verse);
  
  // 3. Tab: Word Analysis Rendering
  renderWordAnalysisTab(verse);
  
  // 4. Tab: Commentaries Rendering
  renderCommentariesTab(verse);
  
  // 5. Tab: FAQs Rendering
  renderFaqsTab(verse);
}

// ==========================================================================
// Tabs Content Population
// ==========================================================================

// Render Comparative Translations
function renderTranslationsTab(verse) {
  // Populate Translator checkboxes if empty
  DOM.translatorCheckboxes.innerHTML = "";
  const allTranslators = verse.translations.map(t => t.author);
  
  // Ensure we have at least one active translator that is actually available for this verse
  const hasActive = allTranslators.some(author => state.activeTranslators.has(author));
  if (!hasActive && allTranslators.length > 0) {
    state.activeTranslators.add(allTranslators[0]);
  }
  
  allTranslators.forEach(author => {
    const label = document.createElement("label");
    label.className = "checkbox-label";
    
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = author;
    input.checked = state.activeTranslators.has(author);
    
    input.addEventListener("change", (e) => {
      if (e.target.checked) {
        state.activeTranslators.add(author);
      } else {
        if (state.activeTranslators.size > 1) {
          state.activeTranslators.delete(author);
        } else {
          e.target.checked = true; // Force keep at least one checked
        }
      }
      renderTranslationsComparison(verse);
    });
    
    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${author}`));
    DOM.translatorCheckboxes.appendChild(label);
  });
  
  renderTranslationsComparison(verse);
}

// Compare Selected Translations
function renderTranslationsComparison(verse) {
  DOM.translationComparisonGrid.innerHTML = "";
  
  const selectedTranslations = verse.translations.filter(t => state.activeTranslators.has(t.author));
  
  // Always include primary crawled translation in comparison if it's there
  if (verse.translation && !selectedTranslations.find(s => s.author === "VedaPath Primary")) {
    selectedTranslations.unshift({
      author: "VedaPath English (Primary)",
      language: "english",
      text: verse.translation
    });
  }
  
  selectedTranslations.forEach(t => {
    const card = document.createElement("div");
    card.className = "translator-card";
    
    const header = document.createElement("div");
    header.className = "translator-card-header";
    
    const name = document.createElement("span");
    name.className = "translator-name font-cinzel";
    name.textContent = t.author;
    
    const badge = document.createElement("span");
    badge.className = "language-badge font-inter";
    badge.textContent = t.language;
    
    const body = document.createElement("p");
    body.className = "translator-text font-lora";
    body.textContent = t.text;
    
    header.appendChild(name);
    header.appendChild(badge);
    card.appendChild(header);
    card.appendChild(body);
    
    DOM.translationComparisonGrid.appendChild(card);
  });
}

// Render Word by Word Accrodion Grid
function renderWordAnalysisTab(verse) {
  DOM.wordBreakdownGrid.innerHTML = "";
  
  if (!verse.word_by_word || verse.word_by_word.length === 0) {
    // If word by word is not available, check comparative notes (often contains synthesized breakdowns)
    const note = verse.comparative_note || "Word meanings breakdown is not available for this verse.";
    const card = document.createElement("div");
    card.className = "translator-card";
    card.style.gridColumn = "1 / -1";
    card.innerHTML = `<p class="translator-text font-lora">${note}</p>`;
    DOM.wordBreakdownGrid.appendChild(card);
    return;
  }
  
  verse.word_by_word.forEach(w => {
    const card = document.createElement("div");
    card.className = "word-card";
    
    const header = document.createElement("div");
    header.className = "word-header";
    
    const sans = document.createElement("span");
    sans.className = "sanskrit-word font-rozha";
    sans.textContent = w.word_sanskrit;
    
    const eng = document.createElement("span");
    eng.className = "english-meaning font-lora";
    eng.textContent = w.word_english;
    
    header.appendChild(sans);
    header.appendChild(eng);
    card.appendChild(header);
    
    // Add grammar roles
    if (w.grammar_role) {
      const gRow = document.createElement("div");
      gRow.className = "gram-row font-inter";
      gRow.innerHTML = `<span class="gram-label">Role:</span><span class="gram-val">${w.grammar_role}</span>`;
      card.appendChild(gRow);
    }
    
    // Add Sanskrit root grounding
    if (w.root) {
      const rRow = document.createElement("div");
      rRow.className = "gram-row font-inter";
      rRow.innerHTML = `<span class="gram-label">Root:</span><span class="gram-val">${w.root}</span>`;
      card.appendChild(rRow);
    }
    
    DOM.wordBreakdownGrid.appendChild(card);
  });
}

// Render Vedantic Commentary Explorer
function renderCommentariesTab(verse) {
  DOM.commentatorSelect.innerHTML = "";
  
  if (!verse.commentaries || verse.commentaries.length === 0) {
    DOM.commentatorSelect.style.display = "none";
    DOM.commentaryAuthorName.textContent = "No commentaries available";
    DOM.commentaryBodyText.textContent = "Commentary dataset is empty for this specific synthesized coordinates.";
    return;
  }
  
  DOM.commentatorSelect.style.display = "block";
  
  // Populate Commentators Select Menu
  verse.commentaries.forEach(c => {
    const option = document.createElement("option");
    option.value = c.author;
    const school = schoolMap[c.author] || "Vedanta";
    option.textContent = `${c.author} (${school})`;
    DOM.commentatorSelect.appendChild(option);
  });
  
  // Pick active commentator: if previous active is available in this verse, keep it; otherwise pick first
  const authorsList = verse.commentaries.map(c => c.author);
  if (!state.activeCommentator || !authorsList.includes(state.activeCommentator)) {
    state.activeCommentator = authorsList[0];
  }
  
  DOM.commentatorSelect.value = state.activeCommentator;
  renderSelectedCommentary();
}

// Render selected commentary details
function renderSelectedCommentary() {
  const scCache = state.chapterVersesCache[state.currentScripture];
  const chapterVerses = scCache ? scCache[state.currentChapter] : null;
  if (!chapterVerses) return;
  const verse = chapterVerses.find(v => v.metadata.verse_number === state.currentVerse);
  if (!verse || !verse.commentaries) return;
  
  const comm = verse.commentaries.find(c => c.author === state.activeCommentator);
  if (comm) {
    DOM.commentaryAuthorName.textContent = `${comm.author} — ${schoolMap[comm.author] || "Vedanta"}`;
    DOM.commentaryLangTag.textContent = comm.language;
    DOM.commentaryBodyText.textContent = comm.text;
  }
}

// Render FAQs panel
function renderFaqsTab(verse) {
  DOM.faqsList.innerHTML = "";
  
  if (!verse.commentary_faqs || verse.commentary_faqs.length === 0) {
    DOM.faqsList.innerHTML = `
      <div class="faq-card">
        <p class="faq-answer font-lora">No specific commentary FAQs are defined for this verse. Explore the Commentaries tab for detailed non-dualistic analysis.</p>
      </div>`;
    return;
  }
  
  verse.commentary_faqs.forEach(faq => {
    const card = document.createElement("div");
    card.className = "faq-card";
    
    const q = document.createElement("h4");
    q.className = "faq-question font-cinzel";
    q.textContent = `Q: ${faq.question}`;
    
    const a = document.createElement("p");
    a.className = "faq-answer font-lora";
    a.textContent = faq.answer;
    
    card.appendChild(q);
    card.appendChild(a);
    DOM.faqsList.appendChild(card);
  });
}

// Handle tab navigation selection
function switchTab(tabId) {
  state.activeTab = tabId;
  
  DOM.tabHeaders.forEach(header => {
    if (header.id === tabId) {
      header.classList.add("active");
      header.setAttribute("aria-selected", "true");
    } else {
      header.classList.remove("active");
      header.setAttribute("aria-selected", "false");
    }
  });
  
  DOM.tabPanels.forEach(panel => {
    const controlledBy = panel.getAttribute("aria-labelledby");
    if (controlledBy === tabId) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });
}

// ==========================================================================
// Theme Engine (Sattvic Ivory vs Cosmic Slate)
// ==========================================================================
function toggleTheme() {
  if (state.theme === "dark") {
    state.theme = "light";
    DOM.body.classList.remove("dark-theme");
    DOM.body.classList.add("light-theme");
    DOM.themeIcon.textContent = "🌙";
  } else {
    state.theme = "dark";
    DOM.body.classList.remove("light-theme");
    DOM.body.classList.add("dark-theme");
    DOM.themeIcon.textContent = "☀️";
  }
}

// ==========================================================================
// Global Clientside Search Engine
// ==========================================================================
async function performSearch() {
  const query = DOM.searchInput.value.trim().toLowerCase();
  if (!query) return;
  
  // Show Loading indicator inside Modal
  const currentMeta = state.scriptures.find(s => s.id === state.currentScripture);
  const scriptureName = currentMeta ? currentMeta.name : "scripture";
  DOM.searchResultsBody.innerHTML = `
    <div style="text-align:center; padding: 2rem;">
      <p class="font-cinzel" style="color: var(--saffron);">Searching all verses of ${scriptureName}...</p>
      <div style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">Indexing coordinates...</div>
    </div>`;
  DOM.searchModal.classList.add("active");
  DOM.searchModal.setAttribute("aria-hidden", "false");
  
  // Make sure search cache is populated. If not, wait for background load or load instantly
  if (!state.searchCacheLoaded) {
    await loadGlobalSearchCache();
  }
  
  const results = [];
  
  state.globalSearchCache.forEach(v => {
    let score = 0;
    
    // Exact Sanskrit Match
    if (v.sanskrit_shloka.toLowerCase().includes(query)) {
      score += 15;
    }
    // Transliteration Match
    if (v.transliteration.toLowerCase().includes(query)) {
      score += 10;
    }
    // Primary Translation Match
    if (v.translation.toLowerCase().includes(query)) {
      score += 8;
    }
    // Word Breakdown groundings (Roots matches)
    v.word_by_word.forEach(w => {
      if (w.word_sanskrit.toLowerCase().includes(query)) score += 5;
      if (w.word_english.toLowerCase().includes(query)) score += 4;
      if (w.root && w.root.toLowerCase().includes(query)) score += 6; // root matches
    });
    
    // Commentary texts match
    v.commentaries.forEach(c => {
      if (c.text.toLowerCase().includes(query)) {
        score += 2; // minor score bump
      }
    });
    
    if (score > 0) {
      results.push({ verse: v, score });
    }
  });
  
  // Sort results by search score descending
  results.sort((a, b) => b.score - a.score);
  
  renderSearchResults(results, query);
}

// Render matches inside modal overlay
function renderSearchResults(results, query) {
  DOM.searchResultsBody.innerHTML = "";
  
  if (results.length === 0) {
    DOM.searchResultsBody.innerHTML = `
      <div style="text-align:center; padding: 2rem; color: var(--text-muted);" class="font-lora">
        No matching verses, translations or commentary text found for query "${query}".
      </div>`;
    return;
  }
  
  results.slice(0, 40).forEach(r => {
    const item = document.createElement("div");
    item.className = "search-result-item";
    
    const coords = document.createElement("span");
    coords.className = "search-result-coords font-cinzel";
    coords.textContent = `${r.verse.metadata.scripture_name} • Ch ${r.verse.metadata.chapter_number} • Verse ${r.verse.metadata.verse_number} (${r.verse.metadata.chapter_name})`;
    
    const text = document.createElement("p");
    text.className = "search-result-text font-lora";
    text.textContent = r.verse.translation.length > 150 ? r.verse.translation.slice(0, 150) + "..." : r.verse.translation;
    
    item.appendChild(coords);
    item.appendChild(text);
    
    item.addEventListener("click", () => {
      closeSearchModal();
      jumpToVerseCoordinates(r.verse.metadata.scripture_slug, r.verse.metadata.chapter_number, r.verse.metadata.verse_number);
    });
    
    DOM.searchResultsBody.appendChild(item);
  });
  
  if (results.length > 40) {
    const more = document.createElement("div");
    more.style.textAlign = "center";
    more.style.padding = "1rem";
    more.style.color = "var(--text-muted)";
    more.className = "font-inter";
    more.textContent = `... and ${results.length - 40} more matches. Narrow search term for precise grounding.`;
    DOM.searchResultsBody.appendChild(more);
  }
}

// Jump directly to scripture, chapter and verse from search result click
async function jumpToVerseCoordinates(scriptureId, chapterNum, verseNum) {
  if (scriptureId && state.currentScripture !== scriptureId) {
    DOM.scriptureSelect.value = scriptureId;
    state.currentScripture = scriptureId;
    state.currentChapter = chapterNum;
    state.searchCacheLoaded = false;
    state.globalSearchCache = [];
    await loadChaptersMeta();
  }
  DOM.chapterSelect.value = chapterNum;
  await handleChapterChange(chapterNum, false);
  selectVerse(verseNum);
}

function closeSearchModal() {
  DOM.searchModal.classList.remove("active");
  DOM.searchModal.setAttribute("aria-hidden", "true");
}

// Copy current verse details beautifully to clipboard for social sharing
async function copyVerseForSharing() {
  const scCache = state.chapterVersesCache[state.currentScripture];
  const chapterVerses = scCache ? scCache[state.currentChapter] : null;
  if (!chapterVerses) return;
  
  const verse = chapterVerses.find(v => v.metadata.verse_number === state.currentVerse);
  if (!verse) return;
  
  const currentMeta = state.chaptersMeta.find(c => c.chapter_number === state.currentChapter);
  const chName = currentMeta ? (currentMeta.name_translation || currentMeta.name) : "Chapter";
  
  // Format word breakdowns nicely
  let wordBreakdowns = "";
  if (verse.word_by_word && verse.word_by_word.length > 0) {
    wordBreakdowns = "\nWord-by-Word Meaning Breakdown:\n" + 
      verse.word_by_word.map(w => `  * ${w.word_sanskrit} (${w.word_english})` + (w.grammar_role ? ` [Role: ${w.grammar_role}]` : "")).join("\n") + "\n";
  } else if (verse.comparative_note) {
    wordBreakdowns = `\nWord Breakdowns / Notes:\n  ${verse.comparative_note}\n`;
  }
  
  // Format current active commentary
  let commentaryText = "";
  const activeComm = verse.commentaries.find(c => c.author === state.activeCommentator);
  if (activeComm) {
    commentaryText = `\nVedāntic Commentary (${activeComm.author} — ${schoolMap[activeComm.author] || "Vedānta"}):\n${activeComm.text.trim()}\n`;
  }
  
  // Construct final formatted text
  const shareText = `🕉️ Bhagavad Gītā — Chapter ${state.currentChapter}: ${chName} • Verse ${state.currentVerse} 🕉️

Sanskrit Shloka:
${verse.sanskrit_shloka}

Transliteration:
${verse.transliteration}

Translation (Primary):
"${verse.translation}"
${wordBreakdowns}${commentaryText}
Shared via Gitā Jñāna 🕉️`;

  try {
    await navigator.clipboard.writeText(shareText);
    showToast("🕉️ Verse successfully copied to clipboard for sharing!");
  } catch (error) {
    console.error("Clipboard copy failed, using fallback:", error);
    const textarea = document.createElement("textarea");
    textarea.value = shareText;
    textarea.style.position = "fixed";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      showToast("🕉️ Verse successfully copied to clipboard!");
    } catch (err) {
      showToast("❌ Clipboard access denied. Copy manually.");
    }
    document.body.removeChild(textarea);
  }
}

// Display a beautiful Saffron Toast notification
function showToast(message) {
  const existing = document.querySelector(".gita-toast");
  if (existing) existing.remove();
  
  const toast = document.createElement("div");
  toast.className = "gita-toast";
  toast.setAttribute("role", "status");
  
  toast.innerHTML = `
    <span class="toast-icon">🕉️</span>
    <span class="toast-message font-inter">${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => {
      toast.remove();
    }, 350);
  }, 3500);
}

// Adjust font size scale (direction: +1 to increase, -1 to decrease)
function adjustFontSize(direction) {
  const step = 0.1;
  const minScale = 0.8;
  const maxScale = 1.6;
  
  let newScale = state.fontSizeScale + (direction * step);
  newScale = Math.max(minScale, Math.min(maxScale, newScale));
  
  if (newScale !== state.fontSizeScale) {
    state.fontSizeScale = newScale;
    updateFontSize();
    showToast(`Font size: ${Math.round(state.fontSizeScale * 100)}%`);
  }
}

// Update font sizes globally on responsive reading elements
function updateFontSize() {
  const scale = state.fontSizeScale;
  
  // Sanskrit Shloka and Transliteration
  if (DOM.sanskritText) {
    DOM.sanskritText.style.fontSize = `${1.7 * scale}rem`;
    DOM.sanskritText.style.lineHeight = `${2.2 * scale}rem`;
  }
  if (DOM.transliterationText) {
    DOM.transliterationText.style.fontSize = `${1.0 * scale}rem`;
    DOM.transliterationText.style.lineHeight = `${1.4 * scale}rem`;
  }
  
  // Translation text cards
  document.querySelectorAll(".translator-text").forEach(el => {
    el.style.fontSize = `${0.95 * scale}rem`;
  });
  
  // Commentary Body text
  if (DOM.commentaryBodyText) {
    DOM.commentaryBodyText.style.fontSize = `${1.05 * scale}rem`;
  }
}

// Navigate to previous verse (handles cross-chapter navigation)
async function navigateToPrevVerse() {
  const scCache = state.chapterVersesCache[state.currentScripture];
  const chapterVerses = scCache ? scCache[state.currentChapter] : null;
  if (!chapterVerses || chapterVerses.length === 0) return;
  
  const idx = chapterVerses.findIndex(v => v.metadata.verse_number === state.currentVerse);
  if (idx > 0) {
    selectVerse(chapterVerses[idx - 1].metadata.verse_number);
  } else if (state.currentChapter > 1) {
    const prevChNum = state.currentChapter - 1;
    await handleChapterChange(prevChNum, false);
    DOM.chapterSelect.value = prevChNum;
    const prevVerses = state.chapterVersesCache[state.currentScripture][prevChNum];
    if (prevVerses && prevVerses.length > 0) {
      selectVerse(prevVerses[prevVerses.length - 1].metadata.verse_number);
    }
  } else {
    showToast("🕉️ You are at the first verse of the scripture.");
  }
}

// Navigate to next verse (handles cross-chapter navigation)
async function navigateToNextVerse() {
  const scCache = state.chapterVersesCache[state.currentScripture];
  const chapterVerses = scCache ? scCache[state.currentChapter] : null;
  if (!chapterVerses || chapterVerses.length === 0) return;
  
  const idx = chapterVerses.findIndex(v => v.metadata.verse_number === state.currentVerse);
  if (idx !== -1 && idx < chapterVerses.length - 1) {
    selectVerse(chapterVerses[idx + 1].metadata.verse_number);
  } else if (state.currentChapter < state.chaptersMeta.length) {
    const nextChNum = state.currentChapter + 1;
    await handleChapterChange(nextChNum, false);
    DOM.chapterSelect.value = nextChNum;
    const nextVerses = state.chapterVersesCache[state.currentScripture][nextChNum];
    if (nextVerses && nextVerses.length > 0) {
      selectVerse(nextVerses[0].metadata.verse_number);
    }
  } else {
    showToast("🕉️ You are at the last verse of the scripture.");
  }
}

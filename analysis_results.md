# Scripture Data Integration and Optimization Report

This document outlines the analysis, splitting strategy, and frontend integration of the new scripture datasets into the Gitā Jñāna site.

---

## 1. JSON Structure Analysis vs. Website Structure

The website originally supported only the **Bhagavad Gita** using a specific schema:
* A summary file (`chapters_summary.json`) listing metadata for all chapters (number, name, translation, summary, verses count).
* Dynamic chapter files (`chapters/chapter_X.json`) containing an array of verse objects. Each verse object contained:
  * `sanskrit_shloka`, `transliteration`, `translation`
  * `word_by_word` (array of detailed word-meaning objects)
  * `translations` (array of alternative translators)
  * `commentaries` (array of commentators)
  * `commentary_faqs` (array of FAQs)

The new datasets had the following structure variations:

### A. Sringeri Upanishads (`Sringeri with translation/*.json`)
* **Format**: A single JSON file per Upanishad containing a large `Verses` object with keys formatted as string integers (e.g., `"1"`) or dotted strings (e.g., `"2.10"`), representing chapter and verse.
* **Fields**: `shloka`, `iast`, `translation`, `commentary`, `commentary_translation`, `wisdomlib_url`.
* **Mapping**: 
  * Dotted keys are split into chapter and verse.
  * `iast` is mapped to `transliteration`.
  * `commentary` (Sanskrit) and `commentary_translation` (English) are mapped as commentator entries under the authorship of Adi Shankaracharya.

### B. Advaita Prakarana Texts (`advaita-prakarana/*.json`)
* **Format**: A single JSON file per text containing a flat `Verses` object.
* **Fields**: Varies; some contain `commentary`, some `word_meanings`, some only `shloka` and `translation`.
* **Mapping**: 
  * `word_meanings` are parsed line-by-line using a regex/split parser that extracts Sanskrit words, transliterations, and English meanings.
  * Since texts range from 5 to 580 verses, they are chunked into smaller files (split sizes of 10 for the massive commentated *Nyayarakshamani*, and 50 for all other texts) to ensure fast fetching.

### C. Patanjali Yoga Sutras (`yogasutras_combined.json`)
* **Format**: A single 2.1MB JSON file containing 205 sutras keyed by `"sutraX.Y"`.
* **Fields**: `shloka`, `vyasabhasya`, `rajamartanda`, `tattvavaisharadi`, `yogasudhakara`, `english` (with translation and word breakdown), `hindi`, `italian`, `spanish`, `hebrew` translations, and `vivekananda` commentary.
* **Mapping**:
  * Splitted into 4 chapters matching the 4 Padas (Samadhi, Sadhana, Vibhuti, Kaivalya).
  * Multilingual translations (`english`, `hindi`, etc.) are mapped to the translations list.
  * Five classic commentaries (`vyasabhasya`, `rajamartanda`, `tattvavaisharadi`, `yogasudhakara`, `vivekananda`) are mapped to the commentaries list.

### D. Sri Rudram (`rudram_with_meanings.json`)
* **Format**: A single 68KB JSON file with a list of 80 verses.
* **Mapping**: Maps to 1 chapter containing all 80 verses. Sayana Acharya's annotations are preserved under commentaries.

---

## 2. Scripture directory structure (Optimized for Fast Fetching)

To make JSON loading instantaneous and avoid fetching multi-megabyte files (such as the 2.1MB Yoga Sutras or 1.1MB Brhadaranyaka Upanishad), all datasets have been split and structured under `data/`:

```
data/
├── scriptures.json (Central index of all 29 scriptures)
├── bhagavad-gita/
│   ├── summary.json
│   └── chapters/
│       ├── chapter_1.json
│       └── ...
├── yogasutras/
│   ├── summary.json
│   └── chapters/
│       ├── chapter_1.json (Samadhi Pada)
│       └── ... (up to chapter_4.json)
├── rudram/
│   ├── summary.json
│   └── chapters/
│       └── chapter_1.json
├── upanishad-brha/
│   ├── summary.json
│   └── chapters/
│       ├── chapter_1.json
│       └── ... (up to chapter_6.json)
├── prakarana-vivekachudamani/
│   ├── summary.json
│   └── chapters/
│       ├── chapter_1.json (Verses 1-50)
│       └── ... (up to chapter_12.json)
└── [Other Upanishad and Prakarana directories...]
```

---

## 3. Frontend Integration Summary

1. **Scripture Selection**: Added a styled `<select id="scriptureSelect">` dropdown to `index.html` right above the chapter selector, grouping all 29 scriptures into "Core Scriptures", "Sringeri Upanishads", and "Advaita Prakarana Texts" using `<optgroup>`.
2. **Unified State & Cache Manager**: Updated `app.js` to index the state by both `currentScripture` and `currentChapter`, dynamically caching fetched JSON chapters to eliminate duplicate network requests.
3. **Smart Translation Toggle**: Added logic to automatically adapt the translator checkboxes on the fly when switching between scriptures, ensuring that if a translator is not available in a new text, it defaults to the first available author.
4. **Dynamic Global Search**: Search is scoped to the selected active scripture, loading all its chapters in the background when the scripture is opened. Search results correctly show the scripture name and let you jump directly to any verse coordinates.

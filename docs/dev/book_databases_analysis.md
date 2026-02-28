# Book Database Analysis: "Series" Support

This document analyzes various book databases to determine the best provider for "Series" metadata (equivalent to the "Franchises" feature developed for Video Games).

## Comparison Summary

| Service | Series Quality | Search Type | Verdict |
| :--- | :--- | :--- | :--- |
| **Open Library** | ⚠️ Low / Tag-based | Subject Search | Good for individual books, but lacks a strict "Series" entity. Series are often just subjects/tags. |
| **Google Books** | 🟠 Medium | Volume Search | Massive coverage. Has a `series:` search prefix, but `seriesInfo` is inconsistent and often hidden in the public API. |
| **Hardcover.app** | ✅ **Excellent** | **First-Class Entity** | The "IGDB for Books". It has dedicated `Series` objects with their own descriptions, slugs, and book lists. |
| **BookBrainz** | ✅ Structural | Entity Search | Excellent data model (MusicBrainz style), but the API is currently in alpha and prone to timeouts/errors. |

---

## Detailed Findings

### 1. Open Library (Current)
Open Library is our baseline for books. While it is completely open and key-less, it treats "Series" as a metadata tag (`subject`) rather than a first-class object.
- **Pros**: No API key, completely free, huge database.
- **Cons**: You can't "search for a series" reliably. A search for "Harry Potter" returns 500 editions of books, but no single "Harry Potter Series" result to rank.

### 2. Google Books
Google Books is the most comprehensive database but its API is "Volume-centric".
- **Search Logic**: Use `q=series:"name"`.
- **Data Quality**: It returns books belonging to the series, but getting information *about* the series itself (like a total book count or series description) is difficult to do in a single search request.
- **Rate Limits**: Very restrictive without an API key.

### 3. Hardcover.app (Recommended)
Hardcover is a modern, social-focused book database and acts as the "IGDB of the book world".
- **Feature**: It has a dedicated GraphQL API where `Series` is a top-level entity.
- **Search Logic**: You can search specifically for series and get a list of series objects.
- **Rich Metadata**: Provides series-specific descriptions, cover collages, and clear book positions (Book 1, Book 2, etc.).
- **Requirement**: Requires a free developer account/API key.

### 4. BookBrainz (MetaBrainz)
Part of the MetaBrainz foundation (MusicBrainz).
- **Pro**: Highest data integrity and structural correctness.
- **Con**: The API is currently very unstable (frequent 502/503 errors and incomplete search implementation). It is not currently suitable for a production-like feature.

## Final Recommendation
For a high-quality "Series" ranking feature, **Hardcover.app** is the best technical choice. It provides the most predictable and reliable "Series" entity for our Search UI.

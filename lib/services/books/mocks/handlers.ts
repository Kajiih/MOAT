/**
 * @file handlers.ts
 * @description MSW handlers for Open Library API mock.
 */

import { http, HttpResponse } from 'msw';

const OL_BASE = 'https://openlibrary.org';

interface MockBook {
  key: string;
  title: string;
  author_name: string[];
  first_publish_year: number;
  language: string[];
  publisher: string[];
}

/**
 * Helper to check if a book matches a Lucene author filter.
 * @param query - The Lucene query string.
 * @param book - The book to check.
 * @returns True if it matches the author filter or if no filter is present.
 */
function matchesAuthor(query: string, book: MockBook): boolean {
  if (!query.includes('author:')) return true;
  const authorMatch = query.match(/author:"([^"]+)"/);
  if (!authorMatch) return true;
  const targetAuthor = authorMatch[1].toLowerCase();
  return book.author_name.some(name => name.toLowerCase().includes(targetAuthor));
}

/**
 * Helper to check if a book matches a Lucene year range filter.
 * @param query - The Lucene query string.
 * @param book - The book to check.
 * @returns True if it matches the year range or if no filter is present.
 */
function matchesYear(query: string, book: MockBook): boolean {
  if (!query.includes('first_publish_year:')) return true;
  const yearMatch = query.match(/first_publish_year:\[(\d+|\*) TO (\d+|\*)\]/);
  if (!yearMatch) return true;
  const min = yearMatch[1] === '*' ? 0 : Number.parseInt(yearMatch[1], 10);
  const max = yearMatch[2] === '*' ? 9999 : Number.parseInt(yearMatch[2], 10);
  return book.first_publish_year >= min && book.first_publish_year <= max;
}

/**
 * Helper to check if a book matches a Lucene publisher filter.
 * @param query - The Lucene query string.
 * @param book - The book to check.
 * @returns True if it matches the publisher filter or if no filter is present.
 */
function matchesPublisher(query: string, book: MockBook): boolean {
  if (!query.includes('publisher:')) return true;
  const pubMatch = query.match(/publisher:"([^"]+)"/);
  if (!pubMatch) return true;
  const targetPub = pubMatch[1].toLowerCase();
  return book.publisher.some(p => p.toLowerCase().includes(targetPub));
}

/**
 * Helper to check if a book matches the basic text search part of the query.
 * @param query - The Lucene query string.
 * @param book - The book to check.
 * @returns True if it matches the basic text search or if no search text is present.
 */
function matchesTitleSearch(query: string, book: MockBook): boolean {
  const queryWithoutFields = query
    .replaceAll(/(author|first_publish_year|publisher|language|subject|person|place):"?[^"\]\s]+"?( TO [^"\]\s]+)?/g, '')
    .replaceAll('AND', '')
    .trim()
    .toLowerCase();
  
  if (!queryWithoutFields) return true;
  
  const queryWords = queryWithoutFields.split(/\s+/);
  return queryWords.some(word => book.title.toLowerCase().includes(word));
}

/**
 * Mock Open Library Handlers.
 */
export const handlers = [
  // Intercept GET requests to Open Library search
  http.get(`${OL_BASE}/search.json`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';

    // Simulate "Fake Book Database"
    const fakeBooks: MockBook[] = [
      { key: '/works/OL1W', title: 'The Fellowship of the Ring', author_name: ['J.R.R. Tolkien'], first_publish_year: 1954, language: ['eng'], publisher: ['George Allen & Unwin'] },
      { key: '/works/OL2W', title: 'Harry Potter and the Philosopher\'s Stone', author_name: ['J.K. Rowling'], first_publish_year: 1997, language: ['eng'], publisher: ['Bloomsbury'] },
    ];

    const matches = fakeBooks.filter((book) => {
      return (
        matchesAuthor(query, book) &&
        matchesYear(query, book) &&
        matchesPublisher(query, book) &&
        matchesTitleSearch(query, book)
      );
    });

    return HttpResponse.json({
      numFound: matches.length,
      docs: matches.map(m => ({
        key: m.key,
        title: m.title,
        author_name: m.author_name,
        first_publish_year: m.first_publish_year,
        language: m.language,
        publisher: m.publisher,
        cover_i: 12_345,
        ratings_average: 4.5,
        review_count: 100
      }))
    });
  }),

  // Mock Author Search
  http.get(`${OL_BASE}/search/authors.json`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';

    const fakeAuthors = [
      { key: 'OL26320A', name: 'J.R.R. Tolkien', birth_date: '3 January 1892' },
      { key: 'OL23919A', name: 'J.K. Rowling', birth_date: '31 July 1965' },
    ];

    const matches = fakeAuthors.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));

    return HttpResponse.json({
      numFound: matches.length,
      docs: matches.map(m => ({
        key: m.key,
        name: m.name,
        birth_date: m.birth_date
      }))
    });
  }),

  // Mock Work Details
  http.get(`${OL_BASE}/works/:id.json`, ({ params }) => {
    if (params.id === 'OL1W') {
      return HttpResponse.json({
        key: '/works/OL1W',
        title: 'The Fellowship of the Ring',
        covers: [123456],
        description: 'A great journey begins.',
        subjects: ['Fantasy', 'Adventure'],
        first_publish_date: 'July 29, 1954'
      });
    }
    return new HttpResponse(null, { status: 404 });
  })
];



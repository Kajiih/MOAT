/**
 * @file handlers.ts
 * @description MSW handlers for Open Library API mock using faker and lucene evaluator.
 */

import { faker } from '@faker-js/faker';
import { http, HttpResponse } from 'msw';

import { matchesQuery } from '@/lib/test/lucene-evaluator';

const OL_BASE = 'https://openlibrary.org';

// 1. Generate Realistic Data
const SEED = 456;
faker.seed(SEED);

const fakeBooks = Array.from({ length: 20 }, () => ({
  key: `/works/${faker.string.alphanumeric(6)}`,
  title: faker.commerce.productName(),
  author_name: [faker.person.fullName()],
  first_publish_year: faker.date.past({ years: 100 }).getFullYear(),
  language: ['eng'],
  publisher: [faker.company.name()],
}));

const staticBooks = [
  {
    key: '/works/OL1W',
    title: 'The Fellowship of the Ring',
    author_name: ['J.R.R. Tolkien'],
    first_publish_year: 1954,
    language: ['eng'],
    publisher: ['George Allen & Unwin'],
  },
  {
    key: '/works/OL2W',
    title: "Harry Potter and the Philosopher's Stone",
    author_name: ['J.K. Rowling'],
    first_publish_year: 1997,
    language: ['eng'],
    publisher: ['Bloomsbury'],
  },
];

const allBooks = [...staticBooks, ...fakeBooks];

/**
 * Mock Open Library Handlers.
 */
export const handlers = [
  http.get(`${OL_BASE}/search.json`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';

    const matches = allBooks.filter((book) => {
      // Map Open Library Fields
      return matchesQuery(query, book, {
        author: 'author_name',
        first_publish_year: 'first_publish_year',
        publisher: 'publisher',
      });
    });

    const sort = url.searchParams.get('sort');
    if (sort === 'new') {
      matches.sort((a, b) => (b.first_publish_year || 0) - (a.first_publish_year || 0));
    } else if (sort === 'old') {
      matches.sort((a, b) => (a.first_publish_year || 0) - (b.first_publish_year || 0));
    }

    return HttpResponse.json({
      numFound: matches.length,
      docs: matches.map((m) => ({
        key: m.key,
        title: m.title,
        author_name: m.author_name,
        first_publish_year: m.first_publish_year,
        language: m.language,
        publisher: m.publisher,
        cover_i: 12_345,
        ratings_average: 4.5,
        review_count: 100,
      })),
    });
  }),

  http.get(`${OL_BASE}/search/authors.json`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';

    const fakeAuthors = [
      { key: 'OL26320A', name: 'J.R.R. Tolkien', birth_date: '3 January 1892' },
      { key: 'OL23919A', name: 'J.K. Rowling', birth_date: '31 July 1965' },
    ];

    const matches = fakeAuthors.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

    return HttpResponse.json({
      numFound: matches.length,
      docs: matches.map((m) => ({
        key: m.key,
        name: m.name,
        birth_date: m.birth_date,
      })),
    });
  }),

  http.get(`${OL_BASE}/works/:id.json`, ({ params }) => {
    const book = allBooks.find((b) => b.key.endsWith(params.id as string));

    if (book) {
      return HttpResponse.json({
        key: book.key,
        title: book.title,
        covers: [123_456],
        description: 'Mock description for ' + book.title,
        subjects: ['Fantasy', 'Adventure'],
        first_publish_date: book.first_publish_year.toString(),
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),
];

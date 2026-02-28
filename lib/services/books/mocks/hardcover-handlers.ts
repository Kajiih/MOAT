/**
 * @file hardcover-handlers.ts
 * @description MSW handlers for Hardcover.app GraphQL API.
 */
import { http, HttpResponse } from 'msw';

export const hardcoverHandlers = [
  http.post('https://api.hardcover.app/v1/graphql', async ({ request }) => {
    const body = (await request.json()) as { query: string; variables: Record<string, string> };
    const { query, variables } = body;

    // Unified Search Mock (Typesense-backed)
    if (query.includes('query Search')) {
      const { query: searchTerm, query_type: type, page = 1, per_page = 20 } = variables;

      if (type === 'Series' && searchTerm.includes('Witcher')) {
        return HttpResponse.json({
          data: {
            search: {
              results: {
                found: 1,
                page,
                hits: [
                  {
                    document: {
                      id: 1,
                      name: 'The Witcher',
                      slug: 'the-witcher',
                      books_count: 8,
                      image: { url: 'https://images.hardcover.app/series/1.jpg' },
                    },
                  },
                ],
              },
            },
          },
        });
      }

      if (type === 'Book' && searchTerm.includes('Harry Potter')) {
        return HttpResponse.json({
          data: {
            search: {
              results: {
                found: 2,
                page,
                hits: [
                  {
                    document: {
                      id: 101,
                      title: 'Harry Potter and the Philosopher Stone',
                      author_names: ['J.K. Rowling'],
                      release_year: 1997,
                      image_url: 'https://hardcover.app/books/hp1',
                    },
                  },
                  {
                    document: {
                      id: 102,
                      title: 'Harry Potter and the Chamber of Secrets',
                      author_names: ['J.K. Rowling'],
                      release_year: 1998,
                      image_url: 'https://hardcover.app/books/hp2',
                    },
                  },
                ],
              },
            },
          },
        });
      }

      if (type === 'Book' && searchTerm.includes('Fellowship')) {
        return HttpResponse.json({
          data: {
            search: {
              results: {
                found: 2,
                page,
                hits: [
                  {
                    document: {
                      id: 201,
                      title: 'The Fellowship of the Ring',
                      author_names: ['J.R.R. Tolkien'],
                      author_ids: [201],
                      author_url: 'https://hardcover.app/authors/jrr-tolkien',
                      release_year: 1954,
                    },
                  },
                  {
                    document: {
                      id: 202,
                      title: 'The Fellowship of the Ring (Special Edition)',
                      author_names: ['J.R.R. Tolkien'],
                      author_ids: [201],
                      release_year: 2004,
                      compilation: true,
                    },
                  },
                ],
              },
            },
          },
        });
      }

      if (type === 'Author' && searchTerm.includes('Tolkien')) {
        return HttpResponse.json({
          data: {
            search: {
              results: {
                found: 1,
                page,
                hits: [
                  {
                    document: {
                      id: 201,
                      name: 'J.R.R. Tolkien',
                      slug: 'jrr-tolkien',
                      image: { url: 'https://images.hardcover.app/author/201.jpg' },
                    },
                  },
                ],
              },
            },
          },
        });
      }
    }

    // Book Series Images Mock
    if (query.includes('query GetSeriesBooks')) {
      const { ids } = variables as unknown as { ids: number[] };
      const book_series: any[] = [];
      
      if (ids.includes(1)) {
        book_series.push({
          series_id: 1,
          book: {
            image: { url: 'https://images.hardcover.app/book/witcher-cover.jpg' }
          }
        });
      }
      
      return HttpResponse.json({
        data: {
          book_series
        }
      });
    }

    return HttpResponse.json({ data: { series: [], books: [], authors: [] } });
  }),
];

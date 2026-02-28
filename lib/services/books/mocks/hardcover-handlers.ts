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
      const { query: searchTerm, type } = variables;

      if (type === 'Series' && searchTerm.includes('Witcher')) {
        return HttpResponse.json({
          data: {
            search: {
              results: {
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

      if (type === 'Book' && searchTerm.includes('Fellowship')) {
        return HttpResponse.json({
          data: {
            search: {
              results: {
                hits: [
                  {
                    document: {
                      id: 101,
                      title: 'The Fellowship of the Ring',
                      release_year: 1954,
                      image: { url: 'https://images.hardcover.app/book/101.jpg' },
                      rating: 4.8,
                      ratings_count: 1500,
                      author_names: ['J.R.R. Tolkien'],
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

    return HttpResponse.json({ data: { series: [], books: [], authors: [] } });
  }),
];

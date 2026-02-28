import { GraphQLClient } from 'graphql-request';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const HARDCOVER_API_URL = 'https://api.hardcover.app/v1/graphql';
const token = process.env.HARDCOVER_TOKEN || '';

const client = new GraphQLClient(HARDCOVER_API_URL, {
  headers: { Authorization: `Bearer ${token}` }
});

async function run() {
  const gql = `
    query SearchBooks($query: String!) {
      search(query: $query, query_type: "Book", per_page: 5) {
        results
      }
    }
  `;
  try {
    const term = "tolkien";
    console.log("Searching for:", term);
    const data = await client.request(gql, { query: term });
    const hits = JSON.parse(data.search.results).hits;
    console.log("Hits:", hits.length);
    if (hits.length > 0) {
        console.log("First hit title:", hits[0].document.title);
        console.log("First hit author:", hits[0].document.author_names);
    }
  } catch (e) {
    console.error("Empty query failed:", e.message);
  }
}

run().catch(console.error);

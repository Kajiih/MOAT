# `/e2e` - End-to-End Testing

This domain houses the Playwright End-to-End (E2E) testing suite. It operates functionally as a black-box tester, interacting with the application via simulated browser events rather than internal React internals.

## Critical User Journeys (CUJs)

The automated tests within this directory aim to perfectly replicate the following critical human paths securely across Chromium and Firefox:

- Open the app and see the default board

## General

- Clear a tier list with items in it
- Rename a tier list

## Board management

- Add a tier
- Remove a tier
- Reorder tiers
- Rename a tier
- Change a tier color
- Randomize tier colors
- Reset items to unranked

## Search

- Search an item
- Search an item using the specific filters for the current tab (e.g. developer filter for games search or author for books)
- See different pages of results
- Hide and show already added items
- Change the search tab (games, developers, franchises, etc.)
- Drag and drop an item from the search results to a tier

## Item management

- Drag and drop an item to a different tier
- Reorder items in a tier
- Open the details of an item
- Remove an item from a tier
- Unrank an item by moving it from a tier dropzone to the search list
- Move and reorder items securely via Keyboard

### Item notes

- Add a note to an item
- Edit an existing note

## Import/Export/Share

- Import a tier list
- Export a tier list
- Share a tier list
- Save as image

## Dashboard

- Open the dashboard from a tier list page
- Create a new tier list
- Delete a tier list
- Open a tier list
- Open a tier list, modify it, go back to dashboard and see the changes

## Visual

- Header logo, footer logo and favicon should change colors when reordering tiers

# `/search` - The Discovery Engine

The **Search** domain encompasses the user-facing tools required to query and filter external generic Providers.

## Core Components

- **`SearchPanel`**: The primary interaction sidebar.
- **`SearchTab`**: Generic tab handling pagination (`limit: DEFAULT_PAGE_LIMIT`) and passing query overrides back to the active Provider entity.
- **Filters (`SortDropdown`, `SearchFilters`)**: UI primitives built to parse generic Entity properties.

## Guidelines

- Search logic isolates the user explicitly from the active API layer. It consumes `Registry` queries and formats user parameters into strict `SearchParams` requests.

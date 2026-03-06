---
description: How to migrate a legacy V1 service to the V2 architecture
---

1. **Locate Source**: Find the V1 service in `v1/lib/services/`.
2. **Review API**: Check the API endpoints, parameters, and response handlers.
3. **Scaffold V2 Provider**: Create a new file in `lib/services/v2/`.
4. **Implement Factory**: Define `DatabaseEntity` objects for each media type.
5. **Port Logic**:
    - Move API call logic to the `search()` method.
    - Implement the `getDetails()` method.
    - Use `ItemSchema.parse()` for validation.
6. **Apply Branding**: Select appropriate icons and color classes.
7. **Register**: Add the provider to `lib/database/registry.ts`.
8. **Test**: Use the `SearchPanelV2` to verify the service is functional.
9. **Deprecate**: Once verified, mark the V1 service as deprecated (or remove if no longer needed).

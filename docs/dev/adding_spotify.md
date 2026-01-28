Currently, it is not yet possible to directly sync with Spotify, but it is a highly feasible and valuable feature to add to Moat's roadmap.

At the moment, the application is built around the MusicBrainz metadata pipeline. This ensures that every item on your board has rich, standardized data (tracklists, deep history, high-res fallback images) independently of any specific streaming service.

How this would work
Because of Moat's modular architecture, adding Spotify integration would involve a few clear steps:

Spotify Authentication: We would need to implement an OAuth flow to allow Moat to access your Spotify account (to read your playlists and create new ones).
Spotify ↔ MusicBrainz Mapping:
Tier List → Spotify: We would use the metadata already on your board (Title, Artist, and ideally ISRC/MBID) to search Spotify's catalog and find the matching track IDs to add to a new playlist.
Spotify → Tier List: We would fetch the tracks from a Spotify playlist and then "enrich" them by finding their corresponding entries in MusicBrainz to populate your board with the app's full metadata suite.
New Service Layer: I would implement a SpotifyService (similar to the existing MusicBrainzService) to handle these API interactions.

// TMDB API Types

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface SearchResult {
  id: number;
  name?: string; // TV
  title?: string; // Movie
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date?: string; // TV
  release_date?: string; // Movie
  vote_average: number;
  media_type: 'tv' | 'movie' | 'person';
}

export interface TVShowDetail {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date: string;
  vote_average: number;
  number_of_seasons: number;
  seasons: SeasonSummary[];
  status: string;
  genres: { id: number; name: string }[];
  external_ids?: { imdb_id?: string };
}

export interface MovieDetail {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  runtime: number;
  genres: { id: number; name: string }[];
  status: string;
  imdb_id?: string;
}

export interface SeasonSummary {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
}

export interface SeasonDetail extends SeasonSummary {
  episodes: Episode[];
}

export interface Episode {
  air_date: string;
  episode_number: number;
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  vote_average: number;
  season_number: number;
  runtime?: number;
}

export interface CreditPerson {
  id: number;
  name: string;
  character?: string;
  profile_path: string | null;
  job?: string;
  department?: string;
}

export interface EpisodeDetailData extends Episode {
  vote_count?: number;
  crew?: CreditPerson[];
  guest_stars?: CreditPerson[];
  credits?: {
    cast: CreditPerson[];
    crew: CreditPerson[];
  };
  images?: {
    stills: { file_path: string; width: number; height: number }[];
  };
}

// User Data / Storage Types

export interface WatchedEpisode {
  episodeId: number;
  seriesId: number;
  seriesName?: string;
  episodeName?: string;
  stillPath?: string | null;
  seasonNumber: number;
  episodeNumber: number;
  rating: number; // 0-5 stars (supports half: 0.5, 1, 1.5, ...)
  watchedDate: string; // ISO String
  liked?: boolean;
  review?: string;
  tags?: string[];
  rewatch?: boolean;
  noSpoilers?: boolean;
}

export interface QueuedItem {
  seriesId: number;
  name: string;
  posterPath: string | null;
  addedDate: string;
  itemType: 'tv' | 'movie';
}

// Watched Movie (for History)
export interface WatchedMovie {
  movieId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  rating: number; // 1-10
  watchedDate: string; // ISO String
  runtime: number;
  releaseDate: string;
  genres: string[];
  overview: string;
}

export interface FavoriteMovie {
  movieId: number;
  title: string;
  posterPath: string | null;
  addedDate: string;
}

export interface UserProgress {
  watchedEpisodes: Record<number, WatchedEpisode>; // Keyed by episodeId
  favorites: Record<number, boolean>; // Keyed by episodeId (or seriesId depending on reqs, assuming episodes based on prompt)
  watchlist: Record<number, QueuedItem>; // Keyed by seriesId
}

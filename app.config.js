import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      omdbApiKey: process.env.OMDB_API_KEY || process.env.EXPO_PUBLIC_OMDB_API_KEY,
      tmdbBaseUrl: 'https://api.themoviedb.org/3',
      imdbGraphqlUrl: 'https://graphql.imdb.com',
    },
  };
};

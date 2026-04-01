import { dataEvents } from '../DataEvents';

describe('DataEvents', () => {
  afterEach(() => {
    // Clean up all listeners between tests by subscribing and immediately unsubscribing
    // This is a lightweight reset approach for the module-level Map
  });

  it('subscribe + emit calls the listener', () => {
    const listener = jest.fn();
    const unsub = dataEvents.subscribe('watchedEpisodes', listener);

    dataEvents.emit('watchedEpisodes');

    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('unsubscribe stops delivery', () => {
    const listener = jest.fn();
    const unsub = dataEvents.subscribe('watchedMovies', listener);

    dataEvents.emit('watchedMovies');
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    dataEvents.emit('watchedMovies');
    expect(listener).toHaveBeenCalledTimes(1); // no additional call
  });

  it('listener errors are swallowed — no propagation', () => {
    const badListener = jest.fn(() => {
      throw new Error('kaboom');
    });
    const goodListener = jest.fn();

    const unsub1 = dataEvents.subscribe('favorites', badListener);
    const unsub2 = dataEvents.subscribe('favorites', goodListener);

    // Should not throw
    expect(() => dataEvents.emit('favorites')).not.toThrow();
    expect(badListener).toHaveBeenCalled();
    expect(goodListener).toHaveBeenCalled();

    unsub1();
    unsub2();
  });

  it('channels are independent', () => {
    const episodeListener = jest.fn();
    const movieListener = jest.fn();

    const unsub1 = dataEvents.subscribe('watchedEpisodes', episodeListener);
    const unsub2 = dataEvents.subscribe('watchedMovies', movieListener);

    dataEvents.emit('watchedEpisodes');

    expect(episodeListener).toHaveBeenCalledTimes(1);
    expect(movieListener).toHaveBeenCalledTimes(0);

    unsub1();
    unsub2();
  });

  it('emitting on a channel with no listeners does not throw', () => {
    expect(() => dataEvents.emit('currentlyWatching')).not.toThrow();
  });

  it('multiple listeners on the same channel all fire', () => {
    const a = jest.fn();
    const b = jest.fn();
    const c = jest.fn();

    const unsubs = [
      dataEvents.subscribe('watchlist', a),
      dataEvents.subscribe('watchlist', b),
      dataEvents.subscribe('watchlist', c),
    ];

    dataEvents.emit('watchlist');

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(c).toHaveBeenCalledTimes(1);

    unsubs.forEach(u => u());
  });
});

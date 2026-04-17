const IS_DEV =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.search.includes('debug=1') ||
    process.env.NEXT_PUBLIC_DEBUG === 'true');

export const debug = (...args: unknown[]) => {
  if (IS_DEV) console.log(...args);
};

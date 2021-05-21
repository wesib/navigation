/**
 * Extracts URL contained in the hash of another URL.
 *
 * Extracted hash URL is based on origin of the original URL. Still, it may be absolute one.
 *
 * Input URL is never altered.
 *
 * @param url - An URL to extract hash from.
 *
 * @returns URL extracted from hash.
 */
export function getHashURL(url: URL): URL {
  return new URL(url.hash.substring(1), url.origin);
}

/**
 * Creates an URL based on original one, but with hash substituted by the given hash URL.
 *
 * The hash URL is substituted as following:
 *
 * 1. If the hash URL's origin is not the same as the one of the base one, or if it contains a username,
 *    then absolute hash URL is substituted:
 * 2. Otherwise:
 *    - pathname is substituted, unless it is equal to `/` and no hash and search parameters present,
 *    - search parameters are substituted when at least one present,
 *    - hash is substituted only when present.
 *
 * Input URLs are never altered.
 *
 * @param url - Base URL.
 * @param hashURL - Hash URL to substitute.
 *
 * @returns URL with updated hash.
 */
export function setHashURL(url: URL, hashURL: URL): URL {
  if (hashURL.origin !== url.origin || hashURL.username) {
    return new URL(`#${hashURL}`, url);
  }

  const { pathname, search, hash } = hashURL;
  const result = new URL('', url);

  result.hash = (search || hash || pathname.length > 1) ? (pathname + search + hash) : (search + hash);

  return result;
}

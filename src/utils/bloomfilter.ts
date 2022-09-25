// Modified code from https://github.com/shinigami-eyes/shinigami-eyes/blob/master/extension/bloomfilter.js under MIT license
var typedArrays = typeof ArrayBuffer !== 'undefined';

// Creates a new bloom filter.  If *m* is an array-like object, with a length
// property, then the bloom filter is loaded with data from the array, where
// each element is a 32-bit integer.  Otherwise, *m* should specify the
// number of bits.  Note that *m* is rounded up to the nearest multiple of
// 32.  *k* specifies the number of hashing functions.
export class BloomFilter {
  m: number;
  k: number;
  buckets: Array<any> | Int32Array;
  _locations: Array<any> | Uint8Array | Uint16Array | Uint32Array;

  constructor(m: number | Uint32Array, k: number) {
    var a: any;
    if (typeof m !== 'number') (a = m), (m = a.length * 32);

    var n = Math.ceil(m / 32),
      i = -1;
    this.m = m = n * 32;
    this.k = k;

    let tbuckets: Array<any> | Int32Array;
    if (typedArrays) {
      var kbytes =
          1 <<
          Math.ceil(Math.log(Math.ceil(Math.log(m) / Math.LN2 / 8)) / Math.LN2),
        array =
          kbytes === 1 ? Uint8Array : kbytes === 2 ? Uint16Array : Uint32Array,
        kbuffer = new ArrayBuffer(kbytes * k);
      tbuckets = this.buckets = new Int32Array(n);
      if (a) while (++i < n) tbuckets[i] = a[i];
      this._locations = new array(kbuffer);
    } else {
      tbuckets = this.buckets = [];
      if (a) while (++i < n) tbuckets[i] = a[i];
      else while (++i < n) tbuckets[i] = 0;
      this._locations = [];
    }
  }
  // See http://willwhim.wpengine.com/2011/09/03/producing-n-hash-functions-by-hashing-only-once/
  locations(v: string) {
    var k = this.k,
      m = this.m,
      r = this._locations,
      a = fnv_1a(v),
      b = fnv_1a(v, 1576284489), // The seed value is chosen randomly
      x = a % m;
    for (var i = 0; i < k; ++i) {
      r[i] = x < 0 ? x + m : x;
      x = (x + b) % m;
    }
    return r;
  }
  add(v: string) {
    var l = this.locations(v + ''),
      k = this.k,
      buckets = this.buckets;
    for (var i = 0; i < k; ++i)
      buckets[Math.floor(l[i] / 32)] |= 1 << l[i] % 32;
  }
  test(v: string) {
    var l = this.locations(v + ''),
      k = this.k,
      buckets = this.buckets;
    for (var i = 0; i < k; ++i) {
      var b = l[i];
      if ((buckets[Math.floor(b / 32)] & (1 << b % 32)) === 0) {
        return false;
      }
    }
    return true;
  }
  // Estimated cardinality.
  size() {
    var buckets = this.buckets,
      bits = 0;
    for (var i = 0, n = buckets.length; i < n; ++i) bits += popcnt(buckets[i]);
    return (-this.m * Math.log(1 - bits / this.m)) / this.k;
  }
}

// http://graphics.stanford.edu/~seander/bithacks.html#CountBitsSetParallel
function popcnt(v: number) {
  v -= (v >> 1) & 0x55555555;
  v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
  return (((v + (v >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24;
}

// Fowler/Noll/Vo hashing.
// Nonstandard variation: this function optionally takes a seed value that is incorporated
// into the offset basis. According to http://www.isthe.com/chongo/tech/comp/fnv/index.html
// "almost any offset_basis will serve so long as it is non-zero".
export function fnv_1a(v: string, seed?: number | undefined) {
  var a = 2166136261 ^ (seed || 0);
  for (var i = 0, n = v.length; i < n; ++i) {
    var c = v.charCodeAt(i),
      d = c & 0xff00;
    if (d) a = fnv_multiply(a ^ (d >> 8));
    a = fnv_multiply(a ^ (c & 0xff));
  }
  return fnv_mix(a);
}

// a * 16777619 mod 2**32
function fnv_multiply(a: number) {
  return a + (a << 1) + (a << 4) + (a << 7) + (a << 8) + (a << 24);
}

// See https://web.archive.org/web/20131019013225/http://home.comcast.net/~bretm/hash/6.html
function fnv_mix(a: number) {
  a += a << 13;
  a ^= a >>> 7;
  a += a << 3;
  a ^= a >>> 17;
  a += a << 5;
  return a & 0xffffffff;
}

function domainIs(host: string, baseDomain: string) {
  if (baseDomain.length > host.length) return false;
  if (baseDomain.length == host.length) return baseDomain == host;
  var k = host.charCodeAt(host.length - baseDomain.length - 1);
  if (k == 0x2e /* . */) return host.endsWith(baseDomain);
  else return false;
}

function tryParseURL(urlstr: string) {
  if (!urlstr) return null;
  try {
    const url = new URL(urlstr);
    if (url.protocol != 'http:' && url.protocol != 'https:') return null;
    return url;
  } catch (e) {
    return null;
  }
}

function tryUnwrapNestedURL(url: URL): URL | null {
  if (!url) return null;
  if (domainIs(url.host, 'youtube.com') && url.pathname == '/redirect') {
    const q = url.searchParams.get('q');
    if (
      q &&
      !q.startsWith('http:') &&
      !q.startsWith('https:') &&
      q.includes('.')
    )
      return tryParseURL('http://' + q);
  }
  if (url.href.indexOf('http', 1) != -1) {
    if (url.pathname.startsWith('/intl/')) return null; // facebook language switch links

    // const values = url.searchParams.values()
    // HACK: values(...) is not iterable on facebook (babel polyfill?)
    const values = url.search.split('&').map((x) => {
      if (x.startsWith('ref_url=')) return '';
      const eq = x.indexOf('=');
      return eq == -1 ? '' : decodeURIComponent(x.substr(eq + 1));
    });

    for (const value of values) {
      if (value.startsWith('http:') || value.startsWith('https:')) {
        return tryParseURL(value);
      }
    }
    const newurl = tryParseURL(url.href.substring(url.href.indexOf('http', 1)));
    if (newurl) return newurl;
  }
  return null;
}

function captureRegex(str: string, regex: RegExp) {
  if (!str) return null;
  var match = str.match(regex);
  if (match && match[1]) return match[1];
  return null;
}

function getPartialPath(path: string, num: number) {
  var m = path.split('/');
  m = m.slice(1, 1 + num);
  if (m.length && !m[m.length - 1]) m.length--;
  if (m.length != num) return '!!';
  return '/' + m.join('/');
}

function getPathPart(path: string, index: number) {
  return path.split('/')[index + 1] || null;
}

export function getIdentifier(link: string, originalTarget?: HTMLElement) {
  try {
    var k = getIdentifierFromURLImpl(tryParseURL(link));
    if (!k || k.indexOf('!') != -1) return null;
    return k.toLowerCase();
  } catch (e) {
    console.warn('Unable to get identifier for ' + link);
    return null;
  }
}

export function getIdentifierFromURLImpl(url: URL | null): string | null {
  if (!url) return null;

  // nested urls
  const nested = tryUnwrapNestedURL(url);
  if (nested) {
    return getIdentifierFromURLImpl(nested);
  }

  // fb group member badge
  if (url.pathname.includes('/badge_member_list/')) return null;

  let host = url.hostname;
  const searchParams = url.searchParams;
  if (domainIs(host, 'web.archive.org')) {
    const match = captureRegex(url.href, /\/web\/\w+\/(.*)/);
    if (!match) return null;
    return getIdentifierFromURLImpl(tryParseURL('http://' + match));
  }

  if (host.startsWith('www.')) host = host.substring(4);

  const pathArray = url.pathname.split('/');

  if (domainIs(host, 'facebook.com')) {
    if (searchParams.get('story_fbid')) return null;
    const fbId = searchParams.get('id');
    const p = url.pathname.replace('/pg/', '/');
    const isGroup = p.startsWith('/groups/');
    if (isGroup && p.includes('/user/')) return 'facebook.com/' + pathArray[4]; // fb.com/groups/.../user/...
    return (
      'facebook.com/' +
      (fbId || getPartialPath(p, isGroup ? 2 : 1).substring(1))
    );
  } else if (domainIs(host, 'reddit.com')) {
    const pathname = url.pathname.replace('/u/', '/user/');
    if (!pathname.startsWith('/user/') && !pathname.startsWith('/r/'))
      return null;
    if (pathname.includes('/comments/') && host == 'reddit.com') return null;
    return 'reddit.com' + getPartialPath(pathname, 2);
  } else if (domainIs(host, 'twitter.com')) {
    return 'twitter.com' + getPartialPath(url.pathname, 1);
  } else if (domainIs(host, 'youtube.com')) {
    const pathname = url.pathname;
    if (
      pathname.startsWith('/user/') ||
      pathname.startsWith('/c/') ||
      pathname.startsWith('/channel/')
    )
      return 'youtube.com' + getPartialPath(pathname, 2);
    return 'youtube.com' + getPartialPath(pathname, 1);
  } else if (domainIs(host, 'disqus.com') && url.pathname.startsWith('/by/')) {
    return 'disqus.com' + getPartialPath(url.pathname, 2);
  } else if (domainIs(host, 'medium.com')) {
    const hostParts = host.split('.');
    if (hostParts.length == 3 && hostParts[0] != 'www') {
      return host;
    }
    return 'medium.com' + getPartialPath(url.pathname.replace('/t/', '/'), 1);
  } else if (domainIs(host, 'tumblr.com')) {
    if (url.pathname.startsWith('/register/follow/')) {
      const name = getPathPart(url.pathname, 2);
      return name ? name + '.tumblr.com' : null;
    }
    if (
      host != 'www.tumblr.com' &&
      host != 'assets.tumblr.com' &&
      host.indexOf('.media.') == -1
    ) {
      if (!url.pathname.startsWith('/tagged/')) return url.host;
    }
    return null;
  } else if (
    domainIs(host, 'wikipedia.org') ||
    domainIs(host, 'rationalwiki.org')
  ) {
    const pathname = url.pathname;
    if (url.hash) return null;
    if (pathname == '/w/index.php' && searchParams.get('action') == 'edit') {
      const title = searchParams.get('title');
      if (title && title.startsWith('User:')) {
        return 'wikipedia.org/wiki/' + title;
      }
    }
    if (
      pathname.startsWith('/wiki/Special:Contributions/') &&
      url.href == window.location.href
    )
      return 'wikipedia.org/wiki/User:' + pathArray[3];
    if (pathname.startsWith('/wiki/User:'))
      return 'wikipedia.org/wiki/User:' + pathArray[2].split(':')[1];
    if (pathname.includes(':')) return null;
    if (pathname.startsWith('/wiki/'))
      return 'wikipedia.org' + decodeURIComponent(getPartialPath(pathname, 2));
    else return null;
  } else if (host.indexOf('.blogspot.') != -1) {
    const m = captureRegex(host, /([a-zA-Z0-9\-]*)\.blogspot/);
    if (m) return m + '.blogspot.com';
    else return null;
  } else if (host.includes('google.')) {
    if (
      url.pathname == '/search' &&
      searchParams.get('stick') &&
      !searchParams.get('tbm') &&
      !searchParams.get('start')
    ) {
      const q = searchParams.get('q');
      if (q) return 'wikipedia.org/wiki/' + q.replace(/\s/g, '_');
    }
    return null;
  } else {
    if (host.startsWith('m.')) host = host.substr(2);
    return host;
  }
}

function getIdentifierFromElementImpl(
  element: HTMLAnchorElement,
  originalTarget?: HTMLElement,
): string | null {
  if (!element) return null;

  if (element.classList.contains('tumblelog'))
    return element.textContent!.replace('@', '') + '.tumblr.com';

  const href = element.href;
  if (href && (!href.endsWith('#') || href.includes('&stick=')))
    return getIdentifierFromURLImpl(tryParseURL(href));
  return null;
}

export function getURLIdent(url: string) {
  return getIdentifierFromURLImpl(tryParseURL(url));
}

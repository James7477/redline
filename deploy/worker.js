/**
 * Static asset Worker for REDLINE.
 * Serves the Vite build with a single-page-app fallback and sane headers.
 */
export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { allow: 'GET, HEAD' },
      });
    }

    const url = new URL(request.url);
    let response = await env.ASSETS.fetch(request);

    // Unknown routes fall back to the app shell (single-page app).
    if (response.status === 404 && !url.pathname.startsWith('/assets/')) {
      response = await env.ASSETS.fetch(
        new Request(new URL('/index.html', url), { headers: request.headers }),
      );
    }

    const headers = new Headers(response.headers);
    headers.set('x-content-type-options', 'nosniff');
    headers.set('referrer-policy', 'no-referrer');
    headers.set('x-frame-options', 'SAMEORIGIN');
    headers.set(
      'cache-control',
      url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    );

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

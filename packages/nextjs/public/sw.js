if (!self.define) {
  let e,
    s = {};
  const t = (t, n) => (
    (t = new URL(t + ".js", n).href),
    s[t] ||
      new Promise((s) => {
        if ("document" in self) {
          const e = document.createElement("script");
          ((e.src = t), (e.onload = s), document.head.appendChild(e));
        } else ((e = t), importScripts(t), s());
      }).then(() => {
        let e = s[t];
        if (!e) throw new Error(`Module ${t} didn’t register its module`);
        return e;
      })
  );
  self.define = (n, a) => {
    const i =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (s[i]) return;
    let c = {};
    const r = (e) => t(e, i),
      u = { module: { uri: i }, exports: c, require: r };
    s[i] = Promise.all(n.map((e) => u[e] || r(e))).then((e) => (a(...e), c));
  };
}
define(["./workbox-4754cb34"], function (e) {
  "use strict";
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: "/_next/app-build-manifest.json",
          revision: "8df63261fb6a08d0ab02427125af14ee",
        },
        {
          url: "/_next/static/chunks/1395.88a9dd282256831e.js",
          revision: "88a9dd282256831e",
        },
        {
          url: "/_next/static/chunks/1498-87b88e1eaf51e401.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/1684-91780c2372310fd9.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/19-1319e52fa770c8d0.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/1f46b9a0-e2290d6982019089.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/2332-bc1f35066cfc5043.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/2634-c8485bd86084a035.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/2798-38ec1e17e7b931c6.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/2f0b94e8-009c4fe7d09feb3b.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/3068-c0ae68a118def30a.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/3728.e3c0ad52abb81236.js",
          revision: "e3c0ad52abb81236",
        },
        {
          url: "/_next/static/chunks/4263-de912c451b7f6eb0.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/4346.8215a2f3e4afc22c.js",
          revision: "8215a2f3e4afc22c",
        },
        {
          url: "/_next/static/chunks/4478-e8c24cf6f24d3df7.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/473f56c0.90ccb7e88d990aaf.js",
          revision: "90ccb7e88d990aaf",
        },
        {
          url: "/_next/static/chunks/4816-2fd61d4c42ac841b.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/4bd1b696-8ea7dafe061f61e2.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/5265.7d690db7c1af79a0.js",
          revision: "7d690db7c1af79a0",
        },
        {
          url: "/_next/static/chunks/5393-8bfee8e5223faf64.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/6264-3508de657901939a.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/6498-682a0e67868cbbe6.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/6671-3daf0179d2b601e8.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/6874-d3b7cd77c749d568.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/6985-73ae226cf555e0ad.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/70646a03.11d52171c91d67d1.js",
          revision: "11d52171c91d67d1",
        },
        {
          url: "/_next/static/chunks/7673-457c969cda8afcfb.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/7899-a55d9733de2ff011.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/8088-ec17849eca57ec47.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/9126-a0e0df31a07b2206.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/9300-6f2fd1ec9405364e.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/9389.ae254dfb2deddcbc.js",
          revision: "ae254dfb2deddcbc",
        },
        {
          url: "/_next/static/chunks/972.2c2e09fd7575551a.js",
          revision: "2c2e09fd7575551a",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-8a37464a9cbed69e.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/app/api/price/route-990ea44be416239d.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/app/blockexplorer/address/%5Baddress%5D/page-f564aa0757e407f5.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/app/blockexplorer/page-b52446204bebf0f8.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/app/blockexplorer/tx/%5Bhash%5D/page-d7ceb36a538059f2.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/app/configure/page-b9bd759c385cfe92.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/app/create-vault/page-54e8aea99c9f4b79.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/app/dashboard/page-0b840cbe23dc5a61.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/app/debug/page-ad53e962d2536c6d.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/app/deposit/page-96576eb9f5af8624.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/app/layout-fe8c3974e17890eb.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/app/page-3af527830962828d.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/app/settings/page-e489516473f8b1ac.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/app/transactions/page-f593d9dc819aebfc.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/app/yield/page-b0253838a9d60020.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/e6909d18-f8c85b159c111899.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/framework-8da4834fc3ca97c7.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/main-app-090b6ca62cd553d3.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/main-fbff72945b816763.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/pages/_app-5d1abe03d322390c.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/pages/_error-3b2a1d523de49635.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-5b5b8c57c3d810ba.js",
          revision: "wrX4t1Nb_qjudtLxAwnJe",
        },
        {
          url: "/_next/static/css/addd3d68938d0e34.css",
          revision: "addd3d68938d0e34",
        },
        {
          url: "/_next/static/wrX4t1Nb_qjudtLxAwnJe/_buildManifest.js",
          revision: "352dd3f35b7611d8b9e69c8681958baf",
        },
        {
          url: "/_next/static/wrX4t1Nb_qjudtLxAwnJe/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/blast-icon-color.svg",
          revision: "f455c22475a343be9fcd764de7e7147e",
        },
        {
          url: "/debug-icon.svg",
          revision: "25aadc709736507034d14ca7aabcd29d",
        },
        {
          url: "/debug-image.png",
          revision: "34c4ca2676dd59ff24d6338faa1af371",
        },
        {
          url: "/explorer-icon.svg",
          revision: "84507da0e8989bb5b7616a3f66d31f48",
        },
        { url: "/fail-icon.svg", revision: "904a7a4ac93a7f2ada236152f5adc736" },
        {
          url: "/gradient-s.svg",
          revision: "c003f595a6d30b1b476115f64476e2cf",
        },
        { url: "/logo.ico", revision: "0359e607e29a3d3b08095d84a9d25c39" },
        { url: "/logo.svg", revision: "962a8546ade641ef7ad4e1b669f0548c" },
        { url: "/manifest.json", revision: "781788f3e2bc4b2b176b5d8c425d7475" },
        {
          url: "/rpc-version.png",
          revision: "cf97fd668cfa1221bec0210824978027",
        },
        {
          url: "/scaffold-config.png",
          revision: "1ebfc244c31732dc4273fe292bd07596",
        },
        {
          url: "/sn-symbol-gradient.png",
          revision: "908b60a4f6b92155b8ea38a009fa7081",
        },
        {
          url: "/success-icon.svg",
          revision: "19391e78cec3583762ab80dbbba7d288",
        },
        {
          url: "/voyager-icon.svg",
          revision: "06663dd5ba2c49423225a8e3893b45fe",
        },
      ],
      { ignoreURLParametersMatching: [] },
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      "/",
      new e.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({
              request: e,
              response: s,
              event: t,
              state: n,
            }) =>
              s && "opaqueredirect" === s.type
                ? new Response(s.body, {
                    status: 200,
                    statusText: "OK",
                    headers: s.headers,
                  })
                : s,
          },
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: "static-audio-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:mp4)$/i,
      new e.CacheFirst({
        cacheName: "static-video-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: "static-data-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        const s = e.pathname;
        return !s.startsWith("/api/auth/") && !!s.startsWith("/api/");
      },
      new e.NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        return !e.pathname.startsWith("/api/");
      },
      new e.NetworkFirst({
        cacheName: "others",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: e }) => !(self.origin === e.origin),
      new e.NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      "GET",
    ));
});

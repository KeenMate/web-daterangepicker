# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — build: compile the library (dist/web-daterangepicker.js + style.css)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

# Install deps from package.json against the npm registry. Copy only the
# manifest first so this layer stays cached until the dependencies actually
# change. `npm install` (not `npm ci`) keeps this resilient to a lockfile that
# points @keenmate/web-components-core at a local sibling path during dev
# (../web-components-core) — that dependency is published, so a plain install
# re-resolves it from the registry.
COPY package.json ./
RUN npm install --no-audit --no-fund

# Bring in the source and build. `npm run build` = clean:dist → cem analyze →
# gen-api-docs → vite build → tsc, producing dist/. Everything the build touches
# (src/, vite.config.ts, tsconfig.json, custom-elements-manifest.config.mjs,
# scripts/, examples) comes in here; host node_modules/ and dist/ are excluded
# via .dockerignore for a clean build.
COPY . .
RUN npm run build

# Stamp the landing page's version badge with the real package version and the
# build time. On the static site the badge's `import { version } from
# './package.json'` never resolves (that's a Vite-only transform), so it renders
# blank; here we bake the value in. BUILD_TIME can be passed for a reproducible
# stamp (e.g. --build-arg BUILD_TIME=$(date -u +%FT%RZ) from CI); it defaults to
# the moment this layer builds.
ARG BUILD_TIME
RUN VERSION="$(node -p "require('./package.json').version")"; \
    BT="${BUILD_TIME:-$(date -u +'%Y-%m-%dT%H:%MZ')}"; \
    STAMP="v${VERSION} (built ${BT})"; \
    sed -i "s|id=\"version-badge\"></span>|id=\"version-badge\" title=\"Built ${BT}\">${STAMP}</span>|" index.html; \
    sed -i "s|import { version } from './package.json'|const version = '${VERSION} (built ${BT})'|" index.html

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — serve: static example site (examples-*.html + compiled library)
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:alpine AS serve

# Replace the stock server block with one that serves the static examples and
# silently drops vulnerability-scanner traffic (see nginx.conf).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# The example pages load the library via <script type="module"> from ./dist, so
# the served root needs the HTML pages, the shared stylesheet, the shared
# chapter-nav script, the docs, and the compiled dist/.
COPY --from=build /app/*.html                  /usr/share/nginx/html/
COPY --from=build /app/examples-shared.css     /usr/share/nginx/html/
COPY --from=build /app/examples-chapter-nav.js /usr/share/nginx/html/
COPY --from=build /app/docs                    /usr/share/nginx/html/docs/
COPY --from=build /app/dist                    /usr/share/nginx/html/dist/

# The example pages load the library dev entry via `<script src="/src/index.ts">`,
# which only works under `vite dev` (it transpiles TS on the fly). A static nginx
# server has no src/ tree and can't transform TS, so those requests 404. Rewrite
# the dev entry to the compiled ES bundle in the served copies; the repo HTML is
# left untouched so `vite dev` keeps working locally.
RUN sed -i 's#/src/index\.ts#/dist/web-daterangepicker.js#g' /usr/share/nginx/html/*.html

# Inject the Plausible analytics snippet into every served page, right after the
# opening <head>. The snippet lives in plausible-snippet.html (kept out of the
# page sources so `vite dev` serves untracked, analytics-free HTML); sed's `r`
# reads it in and appends it after the matched line. Applies to the top-level
# example pages and the docs.
COPY --from=build /app/plausible-snippet.html /tmp/plausible-snippet.html
RUN for f in /usr/share/nginx/html/*.html /usr/share/nginx/html/docs/*.html; do \
        [ -f "$f" ] && sed -i '/<head>/r /tmp/plausible-snippet.html' "$f"; \
    done; rm /tmp/plausible-snippet.html /usr/share/nginx/html/plausible-snippet.html

# Note: index.html's version badge uses a Vite-only JSON import
# (`import { version } from './package.json'`) that a plain static server can't
# transform — the build stage above bakes the value in so the badge renders.

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

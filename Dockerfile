FROM docker.io/cloudflare/sandbox:0.7.0

WORKDIR /cf-ready

# CLI bundle (built in CI before wrangler deploy)
COPY dist ./dist

# Runtime deps for dist/index.js (tsup leaves npm imports external)
COPY container/package.json container/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

RUN printf '%s\n' '#!/bin/sh' 'exec node /cf-ready/dist/index.js "$@"' > /usr/local/bin/cf-ready \
  && chmod +x /usr/local/bin/cf-ready \
  && apt-get update && apt-get install -y unzip curl && rm -rf /var/lib/apt/lists/*

EXPOSE 8080

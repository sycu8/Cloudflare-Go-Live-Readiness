FROM docker.io/cloudflare/sandbox:0.7.0

COPY dist /cf-ready/dist

RUN echo '#!/bin/sh\nnode /cf-ready/dist/index.js "$@"' > /usr/local/bin/cf-ready && chmod +x /usr/local/bin/cf-ready \
  && apt-get update && apt-get install -y unzip curl && rm -rf /var/lib/apt/lists/*

EXPOSE 8080

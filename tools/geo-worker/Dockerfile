FROM node:22.22.3-bookworm-slim@sha256:e21fc383b50d5347dc7a9f1cae45b8f4e2f0d39f7ade28e4eef7d2934522b752

WORKDIR /opt/geo-worker
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && ./node_modules/.bin/playwright install --with-deps --no-shell chromium \
    && apt-get install -y --no-install-recommends x11vnc \
    && rm -rf /var/lib/apt/lists/* \
    && install -d -m 0700 -o node -g node /var/lib/geo-worker /var/lib/geo-worker/deepseek
COPY capture.js deepseek.js fixture.html login-deepseek.js server.js start.js ./
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/geo-worker

ENV GEO_DEEPSEEK_PROFILE_DIR=/var/lib/geo-worker/deepseek
USER node
ENTRYPOINT ["/usr/local/bin/geo-worker"]
CMD ["serve"]

# The landing page and waitlist. Sign-ups live in /data, so mount a volume there.
FROM node:22-slim

ENV NODE_ENV=production \
    PORT=4000 \
    WAITLIST_DB=/data/waitlist.db \
    TRUST_PROXY=1

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY public ./public
COPY scripts ./scripts

VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "--disable-warning=ExperimentalWarning", "server/index.js"]

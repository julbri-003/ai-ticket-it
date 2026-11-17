# bookworm-slim (glibc): mongodb-memory-server no tiene binarios para alpine (musl).
FROM node:20-bookworm-slim

# ca-certificates para descargar el binario de MongoDB por HTTPS; libcurl4 lo requiere mongod.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libcurl4 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY . .

RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 8000

CMD ["node", "index.js"]

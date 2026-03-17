# Builder
FROM node:22.22-bookworm-slim AS builder

RUN apt-get update && apt-get install -y \
    tzdata \
    python3 \
    python3-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /venv
ENV PATH="/venv/bin:$PATH"

RUN pip install --no-cache-dir \
    https://github.com/llistochek/yandex-music-downloader/archive/refs/tags/v3.5.4.zip

WORKDIR /blackhole

COPY package*.json ./
RUN npm ci
COPY . .

RUN npm run build

# App
FROM node:22.22-bookworm-slim

RUN apt-get update && apt-get install -y \
    tzdata \
    python3 \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"

WORKDIR /blackhole
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /blackhole/build ./build
COPY --from=builder /blackhole/migrations ./migrations

CMD ["node", "build/index.js"]
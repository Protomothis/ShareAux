FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps && \
    ARCH=$(uname -m | sed 's/x86_64/x64/' | sed 's/aarch64/arm64/') && \
    npm i --no-save @parcel/watcher-linux-${ARCH}-glibc lightningcss-linux-${ARCH}-gnu
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3001
ENV PORT=3001
CMD ["node", "server.js"]

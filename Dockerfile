FROM node:20-slim

# Install pnpm directly via npm — avoids corepack signature verification issues
RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install dependencies
# --no-frozen-lockfile: tolerates minor lockfile drift from Dependabot auto-merges
RUN pnpm install --no-frozen-lockfile

# Copy full source
COPY . .

# Build client (vite) + server (esbuild) → dist/
RUN pnpm run build

# Railway sets $PORT at runtime; default 3000 for local dev
EXPOSE 3000

CMD ["pnpm", "run", "start"]

FROM node:20-slim AS builder

# Install pnpm directly via npm — avoids corepack signature verification issues
RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# CRITICAL: force NODE_ENV=development during install so devDependencies
# (vite, esbuild, tailwindcss, typescript) are installed.
# Railway injects NODE_ENV=production which causes pnpm to skip devDeps,
# breaking the build step.
ENV NODE_ENV=development

# Install ALL dependencies (including devDependencies needed for build)
RUN pnpm install --no-frozen-lockfile

# Copy full source
COPY . .

# Build client (vite) + server (esbuild) → dist/
RUN pnpm run build

# --- Production stage ---
FROM node:20-slim

RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copy only what's needed for production
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install production dependencies only
ENV NODE_ENV=production
RUN pnpm install --no-frozen-lockfile --prod

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Railway sets $PORT at runtime; default 3000 for local dev
EXPOSE 3000

CMD ["node", "dist/index.js"]

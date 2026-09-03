FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/ai/package.json ./packages/ai/
COPY packages/agents/package.json ./packages/agents/
RUN npm install

# Copy source
COPY . .

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build shared packages
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/database
RUN npm run build --workspace=packages/ai
RUN npm run build --workspace=packages/agents

# Build API
RUN npm run build --workspace=apps/api

EXPOSE 5000

CMD ["npm", "run", "start", "--workspace=apps/api"]

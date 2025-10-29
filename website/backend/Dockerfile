FROM node:20-bookworm

WORKDIR /app

# System deps for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install both production and development dependencies
RUN npm install

EXPOSE 9000

# Use npm run dev by default, can be overridden by docker-compose
CMD ["npm", "run", "dev"]



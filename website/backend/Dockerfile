FROM node:20-bookworm

WORKDIR /app

# System deps for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 9000
CMD ["npm","start"]



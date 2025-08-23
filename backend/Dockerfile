FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --only=production --legacy-peer-deps
COPY . .
RUN npm run build

CMD ["node", "dist/main.js"]

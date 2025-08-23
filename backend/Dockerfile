FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --only=production --legacy-peer-deps
RUN npm install -g @nestjs/cli
COPY . .
RUN npm run build

CMD ["node", "dist/main.js"]

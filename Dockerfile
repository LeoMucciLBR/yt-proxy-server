FROM node:18-bullseye-slim

# Instala o Python 3 e o FFMPEG (necessários para o yt-dlp funcionar perfeitamente)
RUN apt-get update && \
    apt-get install -y python3 ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "start"]

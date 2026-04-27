FROM node:20-bullseye-slim

# Instala Python, FFmpeg e pip
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

# Instala a versão mais recente e oficial do yt-dlp direto da fonte do Python (Bypassa o GitHub Rate Limit)
RUN pip3 install yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "start"]

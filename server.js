const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
    origin: '*', 
    methods: ['GET']
}));

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Arquivo temporário de cookies
const cookiePath = path.join('/tmp', 'cookies.txt');

app.get('/stream', (req, res) => {
    const videoId = req.query.v;

    if (!videoId) {
        return res.status(400).json({ error: 'Missing video ID' });
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        res.header('Content-Type', 'video/mp4');
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');

        console.log(`Streaming video via native yt-dlp: ${videoId}`);

        const ytDlpArgs = [
            url,
            '-o', '-', 
            '-f', '18/best[ext=mp4]/b', // Tenta forçar o 360p (mais estável), ou cai pro melhor mp4
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', // Essencial para o cookie não ser rejeitado
            '--extractor-args', 'youtube:player_client=tv,web',
            '--extractor-args', 'youtube:player_skip=webpage,configs',
            '--quiet',
            '--no-warnings'
        ];

        // Se o usuário adicionou os cookies no painel do Render, nós criamos o arquivo de cookies
        if (process.env.YT_COOKIES) {
            fs.writeFileSync(cookiePath, process.env.YT_COOKIES, { encoding: 'utf8' });
            ytDlpArgs.push('--cookies', cookiePath);
            console.log("Cookies de autenticação injetados com sucesso!");
        } else {
            console.log("AVISO: Nenhum cookie encontrado nas variáveis de ambiente. Pode falhar por Bot Check.");
        }

        const subprocess = spawn('yt-dlp', ytDlpArgs);

        subprocess.stdout.pipe(res);

        subprocess.on('error', (err) => {
            console.error('Subprocess spawn error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to stream video' });
            }
        });
        
        subprocess.stderr.on('data', (data) => {
             console.error(`yt-dlp stderr: ${data}`);
        });

    } catch (error) {
        console.error('Server error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT} com suporte a Cookies`);
});

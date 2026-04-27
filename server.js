const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
    origin: '*', 
    methods: ['GET']
}));

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/stream', (req, res) => {
    const videoId = req.query.v;

    if (!videoId) {
        return res.status(400).json({ error: 'Missing video ID (v parameter)' });
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        res.header('Content-Type', 'video/mp4');
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', '0');

        console.log(`Streaming video via yt-dlp: ${videoId}`);

        // O yt-dlp nativo do Docker vai interceptar e fazer o bypass do YouTube
        const subprocess = youtubedl.exec(url, {
            o: '-', 
            f: 'best[ext=mp4]', 
            quiet: true,
            noWarnings: true
        }, { stdio: ['ignore', 'pipe', 'ignore'] });

        subprocess.stdout.pipe(res);

        subprocess.on('error', (err) => {
            console.error('Subprocess error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to stream video via yt-dlp' });
            }
        });

    } catch (error) {
        console.error('Server error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT} using yt-dlp (Dockerized)`);
});

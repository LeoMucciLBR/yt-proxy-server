const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

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

        console.log(`Streaming video via native yt-dlp: ${videoId}`);

        // Roda o yt-dlp nativo instalado no Docker
        const ytDlpArgs = [
            url,
            '-o', '-', 
            '-f', 'best[ext=mp4]', 
            '--quiet',
            '--no-warnings'
        ];

        const subprocess = spawn('yt-dlp', ytDlpArgs);

        subprocess.stdout.pipe(res);

        subprocess.on('error', (err) => {
            console.error('Subprocess spawn error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to stream video via yt-dlp (Spawn Error)' });
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
    console.log(`Proxy server is running on port ${PORT} using native yt-dlp`);
});

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
    origin: '*', 
    methods: ['GET']
}));

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/stream', async (req, res) => {
    const videoId = req.query.v;

    if (!videoId) {
        return res.status(400).json({ error: 'Missing video ID' });
    }

    try {
        console.log(`Asking Cobalt API for video: ${videoId}`);
        
        // 1. Pedir a URL do vídeo limpo para o Cobalt
        const cobaltReq = await fetch("https://api.cobalt.tools/api/json", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url: `https://www.youtube.com/watch?v=${videoId}`,
                vQuality: "720",
                disableMetadata: true
            })
        });

        if (!cobaltReq.ok) {
            throw new Error('Cobalt API failed to process video');
        }

        const data = await cobaltReq.json();
        const videoStreamUrl = data.url;

        if (!videoStreamUrl) {
            throw new Error('No stream URL returned from Cobalt');
        }

        console.log(`Piping from Cobalt CDN...`);

        // 2. Baixar o vídeo do CDN do Cobalt e enviar para o usuário via Pipe (Túnel Duplo)
        const videoResponse = await fetch(videoStreamUrl);
        
        if (!videoResponse.ok) throw new Error(`CDN returned ${videoResponse.status}`);

        res.header('Content-Type', 'video/mp4');
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');

        // Transforma o Web Stream nativo do fetch em um Node Stream e faz o pipe
        const { Readable } = require('stream');
        Readable.fromWeb(videoResponse.body).pipe(res);

    } catch (error) {
        console.error('Server error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT} using Cobalt Node Proxy`);
});

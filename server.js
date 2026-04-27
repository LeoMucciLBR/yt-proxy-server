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
        console.log(`Asking Piped API for video: ${videoId}`);
        
        // 1. Pedir a URL do stream para a API do Piped (Open Source, amigável a datacenters)
        const pipedReq = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`);

        if (!pipedReq.ok) {
            throw new Error(`Piped API failed: ${pipedReq.status}`);
        }

        const data = await pipedReq.json();
        
        // Procuramos o primeiro stream que seja mp4 e que NÃO seja apenas vídeo (tem que ter áudio junto)
        const streamInfo = data.videoStreams.find(s => s.mimeType.includes('mp4') && s.videoOnly === false);

        if (!streamInfo || !streamInfo.url) {
            throw new Error('No valid mp4 stream (audio+video) returned from Piped');
        }

        console.log(`Piping from Piped Proxy CDN...`);

        // 2. Baixar o vídeo do proxy do Piped e enviar para o usuário via Pipe
        const videoResponse = await fetch(streamInfo.url);
        
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
    console.log(`Proxy server is running on port ${PORT} using Piped API Proxy`);
});

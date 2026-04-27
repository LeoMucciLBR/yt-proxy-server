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

const INVIDIOUS_APIS = [
    'https://yewtu.be',
    'https://vid.puffyan.us',
    'https://invidious.flokinet.to',
    'https://invidious.jing.rocks'
];

app.get('/stream', async (req, res) => {
    const videoId = req.query.v;

    if (!videoId) {
        return res.status(400).json({ error: 'Missing video ID' });
    }

    try {
        let streamUrl = null;
        let successfulApi = null;

        for (const api of INVIDIOUS_APIS) {
            try {
                console.log(`Asking Invidious API (${api}) for video: ${videoId}`);
                const invReq = await fetch(`${api}/api/v1/videos/${videoId}`);
                
                if (invReq.ok) {
                    const data = await invReq.json();
                    
                    if (data.formatStreams && data.formatStreams.length > 0) {
                        // Tenta pegar o 720p (itag 22), se não tiver pega o 360p (itag 18) ou o primeiro disponível
                        const bestStream = data.formatStreams.find(s => s.qualityLabel === '720p' || s.itag === '22') ||
                                           data.formatStreams.find(s => s.qualityLabel === '360p' || s.itag === '18') ||
                                           data.formatStreams[0];
                        
                        if (bestStream && bestStream.url) {
                            streamUrl = bestStream.url;
                            successfulApi = api;
                            break; // Sucesso! Sai do loop.
                        }
                    }
                }
            } catch (e) {
                console.log(`API ${api} falhou, tentando a próxima...`);
            }
        }

        if (!streamUrl) {
            throw new Error('Todas as APIs do Invidious falharam ou o vídeo não tem stream mp4 combinado.');
        }

        console.log(`Piping from Invidious Proxy CDN (via ${successfulApi})...`);

        const videoResponse = await fetch(streamUrl);
        
        if (!videoResponse.ok) throw new Error(`CDN returned ${videoResponse.status}`);

        res.header('Content-Type', 'video/mp4');
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');

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
    console.log(`Proxy server is running on port ${PORT} using Multi-Invidious API Proxy`);
});

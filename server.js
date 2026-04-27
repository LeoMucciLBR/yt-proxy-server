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

const PIPED_APIS = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz',
    'https://pipedapi.syncpundit.io',
    'https://piped-api.garudalinux.org'
];

app.get('/stream', async (req, res) => {
    const videoId = req.query.v;

    if (!videoId) {
        return res.status(400).json({ error: 'Missing video ID' });
    }

    try {
        let streamInfo = null;
        let successfulApi = null;

        // Tenta buscar o vídeo em várias APIs do Piped caso a principal esteja fora do ar (erro 526, 502, etc)
        for (const api of PIPED_APIS) {
            try {
                console.log(`Asking Piped API (${api}) for video: ${videoId}`);
                const pipedReq = await fetch(`${api}/streams/${videoId}`);
                
                if (pipedReq.ok) {
                    const data = await pipedReq.json();
                    const validStream = data.videoStreams.find(s => s.mimeType.includes('mp4') && s.videoOnly === false);
                    
                    if (validStream && validStream.url) {
                        streamInfo = validStream;
                        successfulApi = api;
                        break; // Sucesso! Sai do loop.
                    }
                }
            } catch (e) {
                console.log(`API ${api} falhou, tentando a próxima...`);
            }
        }

        if (!streamInfo) {
            throw new Error('Todas as APIs do Piped falharam ou o vídeo é inválido.');
        }

        console.log(`Piping from Piped Proxy CDN (via ${successfulApi})...`);

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
    console.log(`Proxy server is running on port ${PORT} using Multi-Piped API Proxy`);
});

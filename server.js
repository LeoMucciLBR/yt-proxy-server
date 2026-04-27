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

// Lista de instâncias da comunidade do Cobalt (A maioria NÃO bloqueia IPs de Datacenter como o Render!)
const COBALT_APIS = [
    'https://cobalt-api.kwiatektv.me',
    'https://cobalt.mindsolo.net',
    'https://cobalt.cibere.dev',
    'https://api.cobalt.tools', // A oficial por último, pois bloqueia o Render
    'https://co.wuk.sh'
];

app.get('/stream', async (req, res) => {
    const videoId = req.query.v;

    if (!videoId) {
        return res.status(400).json({ error: 'Missing video ID' });
    }

    try {
        let videoStreamUrl = null;
        let successfulApi = null;

        console.log(`Asking Community Cobalt APIs for video: ${videoId}`);

        for (const api of COBALT_APIS) {
            try {
                const cobaltReq = await fetch(`${api}/api/json`, {
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

                if (cobaltReq.ok) {
                    const data = await cobaltReq.json();
                    if (data && data.url) {
                        videoStreamUrl = data.url;
                        successfulApi = api;
                        break; // Sucesso! Sai do loop.
                    }
                } else {
                    console.log(`API ${api} negou o acesso (Status: ${cobaltReq.status})`);
                }
            } catch (e) {
                console.log(`API ${api} falhou por erro de rede...`);
            }
        }

        if (!videoStreamUrl) {
            throw new Error('Todas as APIs do Cobalt falharam ou bloquearam o Render.');
        }

        console.log(`Piping from Cobalt CDN (via ${successfulApi})...`);

        // Baixa o vídeo do CDN final do Cobalt e envia via Pipe
        const videoResponse = await fetch(videoStreamUrl);
        
        if (!videoResponse.ok) throw new Error(`CDN returned ${videoResponse.status}`);

        res.header('Content-Type', 'video/mp4');
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');

        // Transforma o Web Stream em Node Stream e faz o pipe
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
    console.log(`Proxy server is running on port ${PORT} using Community Cobalt Proxy`);
});

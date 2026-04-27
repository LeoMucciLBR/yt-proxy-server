const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
    origin: '*', // Permite que qualquer frontend (Vercel, Localhost, etc) se conecte
    methods: ['GET']
}));

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/stream', async (req, res) => {
    const videoId = req.query.v;

    if (!videoId) {
        return res.status(400).json({ error: 'Missing video ID (v parameter)' });
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        const isValid = ytdl.validateID(videoId) || ytdl.validateURL(url);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid YouTube ID' });
        }

        // Obtém as informações do vídeo
        const info = await ytdl.getInfo(url);
        
        // Tenta pegar a melhor qualidade que tenha áudio e vídeo juntos (geralmente 720p em mp4)
        const format = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'audioandvideo' });

        res.header('Content-Type', 'video/mp4');
        
        // Define cabeçalhos para evitar cache (garante que é um streaming ao vivo)
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', '0');

        console.log(`Streaming video: ${videoId}`);

        // Faz o pipe do stream de download diretamente para a resposta HTTP do cliente
        ytdl(url, { format: format })
            .on('error', (err) => {
                console.error('Error streaming video:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to stream video' });
                }
            })
            .pipe(res);

    } catch (error) {
        console.error('Server error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT}`);
});

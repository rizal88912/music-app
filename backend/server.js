const express = require('express');
const cors = require('cors');
const axios = require('axios'); // 🔥 Mesin penyedot brutal kita
const { HttpsProxyAgent } = require('https-proxy-agent'); // 🛡️ Topeng IP Indonesia kita

const app = express();
app.use(cors());

const PORT = process.env.PORT || 4000;

// 🔥 INI DIA 34 NYAWA VIP LU SEKARANG (TOTAL 17.000 REQUEST/BULAN) 🔥
const apiKeys = [
    // --- 5 Akun Lama ---
    'f4e914fa55msh291e6fc92994ebep169f6djsn6468bdf8ea71', 
    '7095d94fbamshbbec24ad251fd30p1f2b8fjsnb78470892218', 
    '937d750ff1msh90d3afecabf1714p10cbe5jsna5bc5d8d048c', 
    'bcbaddf86bmshec9743f2eb27790p1cbf3ajsnfa15a73d34fb', 
    '53e8414702msh6aab12dd31d3234p149546jsna80ea3f770ec',
    
    // --- 9 Akun Hasil Panen Pertama ---
    'f9290b3b7amshcd2e40de4f9b764p183576jsn1f87451eb25c',
    'f2b80f5a88msheb34d6fe043221ap180fc5jsn04038bd1e76a',
    '8e47420f4bmsh5a8cb3ccd37e3b0p17773bjsnaada21063b96',
    'ae399e0ca5msh998713133c2a58ep1b203fjsnbe2cdaf14268',
    'bf1e8c083bmsh60de0aa35e66337p1f2bc1jsn122d7f671f15',
    'e9d49e2db8mshd0df9bbbee5ce26p1bc8d6jsn88590c8293df',
    '79255ed5d1msh07305152a465183p18b944jsn0dc9959e017d',
    '30496e0f53msh3ef636b039b4718p1a51ecjsn0b231b3b636e',
    '09cb701317msh848e322d04fa0a0p1eadd4jsnbfe3d0b5ca51',

    // --- 10 Akun Hasil Panen Kedua ---
    'd07a0ca60emshc30588abd75c3b0p1a780fjsn4f3765f95488',
    'c190ef079amshccd4588309c2538p167d7fjsnc4600dde47b2',
    '8e72544428msh10719b7e25a0a40p1d1809jsn81efa55849fb',
    'e94f982c1bmshba4b3faf18d0a1ap1a2519jsn52c7639363e3',
    'f1c8e896d4msh8909087a3ddcfedp197d09jsndeb4cfc9abcf',
    '0eec7e381fmsh3f692247c4a505cp1f1b3djsn59bd0b8a5178',
    '63d33de174msha0c73db9757aabfp1bc4f8jsnac87dcf011cf',
    'e6288a50e7msh8f38dd47fdaa35fp15ec55jsn4b4cccf89399',
    'a14813b9camsha5a1390a25fd0d2p1c6f87jsn07bb4bffd14b',
    'f165b6e72emsh4c3bd80a3d6240cp1833f0jsn513edbb64c77',

    // --- 10 Akun Hasil Panen Ketiga (Terbaru) ---
    'a523b16633msh9be2d8e2af5108fp1151cajsnd5c0fcebe67e',
    '2b1e252ab3mshf9536d6bf284c8ap1f2e7ajsn6073fb77ca52',
    'a7cb70604dmshe3c0617411c4f45p1c2b8bjsn95d4cf3220f9',
    '6711aef5f2msh2138b2b4f1225aep103732jsn41116de0deaf',
    'f464e984afmsh4cf757e30203b53p1ef4d4jsn87bbb025ea6b',
    '878c6597c9msh64ace9b252eb374p1a7ee9jsn18d7a950bca0',
    '0b8915482dmshef1d7bd9b88f5efp1c2ba6jsnbc7421cd1de0',
    '75d346ae08msh1aad426c307b167p173ce3jsn2e8363d8b6f0',
    'af3a37c0aamsh488a0cb52857598p1867fbjsn6954bc96687d',
    '2679badd26msh9ab9f6e4dc80ef5p1830aajsnf3b1e1093afa'
];

// Memory untuk nginget sistem lagi pakai akun nomor berapa
let currentKeyIndex = 0; 

// =====================================================================
// 🎵 ENDPOINT 1: PROXY AUDIO (YT ke MP3)
// =====================================================================
app.get('/api/audio', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).send('ID kosong');

    console.log(`[▶️] OPERASI ROTASI VIP ID: ${videoId}`);

    const rapidApiHost = 'youtube-mp36.p.rapidapi.com';
    const rapidApiUrl = `https://${rapidApiHost}/dl?id=${videoId}`;

    let audioUrl = null;
    let attempts = 0;

    while (attempts < apiKeys.length) {
        const activeKey = apiKeys[currentKeyIndex];
        console.log(`Mengetuk API menggunakan Akun ke-${currentKeyIndex + 1}...`);

        try {
            const response = await fetch(rapidApiUrl, {
                method: 'GET',
                headers: {
                    'x-rapidapi-host': rapidApiHost,
                    'x-rapidapi-key': activeKey
                }
            });

            if (response.status === 429) {
                console.log(`⚠️ KUOTA AKUN KE-${currentKeyIndex + 1} HABIS! Otomatis geser ke akun cadangan...`);
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                attempts++;
                continue; 
            }

            if (!response.ok) {
                console.log(`❌ Error Server (Status: ${response.status}), coba pakai kunci lain...`);
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                attempts++;
                continue;
            }

            const data = await response.json();
            
            if (data && data.link) {
                audioUrl = data.link;
                break; 
            } else {
                console.log(`⚠️ Link nggak ketemu di akun ke-${currentKeyIndex + 1}, geser lagi...`);
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                attempts++;
            }

        } catch (err) {
            console.log(`❌ Gagal koneksi di akun ke-${currentKeyIndex + 1}, lanjut geser...`);
            currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            attempts++;
        }
    }

    if (audioUrl) {
        console.log('✅ LINK AUDIO ROTASI DAPAT! Mengalihkan...');
        res.redirect(audioUrl);
    } else {
        res.status(500).send(`Gagal total! Semua kuota dari ${apiKeys.length} akun VIP lu udah habis bulan ini.`);
    }
});

// =====================================================================
// 📺 ENDPOINT 2: PROXY TV & MATCH STREAMING (ANTI-CORS & SUPPORT DRM)
// =====================================================================
app.get('/api/get-match-stream', (req, res) => {
    const { matchId } = req.query;
    
    console.log(`[📡] REQUEST STREAM TV DITERIMA UNTUK MATCH ID: ${matchId}`);

    // Template balasan default
    let streamData = {
        success: false,
        streamUrl: "",
        clearKeyId: null,
        clearKeyValue: null
    };

    // 🕵️‍♂️ LOGIKA BANDAR STREAMING: 
    // Ganti link di bawah ini sesaat sebelum pertandingan dimulai!
    
    if (matchId === 'timnas-live') {
        streamData = {
            success: true,
            // 👇 Ganti link ini pakai link buruan lu dari Telegram/iptv-org
            streamUrl: "https://tvri-id.akamaized.net/hls/live/2026859/TVRI-Nasional/master.m3u8", 
            // Kalau videonya digembok DRM, masukin key-nya di sini. Kalau m3u8 biasa, biarin null.
            clearKeyId: null, 
            clearKeyValue: null
        };
    } 
    else if (matchId === 'persib-live') {
        streamData = {
            success: true,
            streamUrl: "https://b1-live.secureswiftcontent.com/b1_ch01/chunklist.m3u8", 
            clearKeyId: null,
            clearKeyValue: null
        };
    }
    else {
        // Channel Fallback kalau ID ga ngerespon (Mux Test Kelinci)
        streamData = {
            success: true,
            streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", 
            clearKeyId: null,
            clearKeyValue: null
        };
    }

    // Simulasi delay biar keliatan real pro lagi nge-bypass server 😎
    setTimeout(() => {
        console.log(`✅ BERHASIL MENGIRIM DATA STREAM: ${streamData.streamUrl}`);
        res.json(streamData);
    }, 800);
});

// =====================================================================
// 🏴‍☠️ ENDPOINT 3: ULTIMATE M3U8 REWRITER PROXY (GOD MODE)
// =====================================================================
app.get('/api/bypass-cors', async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) return res.status(400).send('URL kosong Bang!');

    try {
        // Buka gembok keamanan web lu
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

        const isM3u8 = targetUrl.includes('.m3u8') || targetUrl.includes('.m3u');

        if (isM3u8) {
            // 1. Sedot Peta M3U8 aslinya ngerubah nyamar jadi VLC
            const response = await axios.get(targetUrl, {
                headers: { 'User-Agent': 'VLC/3.0.16 LibVLC/3.0.16' }
            });
            
            // 2. Bedah dan ubah semua link di dalamnya
            let lines = response.data.split('\n');
            let rewrittenM3u8 = lines.map(line => {
                line = line.trim();
                if (!line) return line;

                // Trik ngebongkar Kunci rahasia (AES/DRM) di dalem m3u8
                if (line.startsWith('#EXT-X-KEY:') && line.includes('URI=')) {
                    return line.replace(/URI="([^"]+)"/, (match, uri) => {
                        try {
                            const absoluteKeyUrl = new URL(uri, targetUrl).href;
                            const proxyKeyUrl = `https://music-app-production-3507.up.railway.app/api/bypass-cors?url=${encodeURIComponent(absoluteKeyUrl)}`;
                            return `URI="${proxyKeyUrl}"`;
                        } catch(e) {
                            return match; // Kalo error biarin link aslinya
                        }
                    });
                }
                
                // Kalo ini cuma teks komentar/konfigurasi, biarin aja
                if (line.startsWith('#')) return line;
                
                // 3. Paksa semua link video anak (.ts) lewat proxy Railway lu
                try {
                    const absoluteUrl = new URL(line, targetUrl).href;
                    return `https://music-app-production-3507.up.railway.app/api/bypass-cors?url=${encodeURIComponent(absoluteUrl)}`;
                } catch(e) {
                    return line;
                }
            }).join('\n');

            // Kirim balik "Peta" palsu hasil editan kita ke Shaka Player
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            return res.send(rewrittenM3u8);

        } else {
            // 4. Kalo ini wujud video aslinya (.ts), langsung oper mentahannya
            const response = await axios({
                method: 'get',
                url: targetUrl,
                responseType: 'stream',
                headers: { 
                    'User-Agent': 'VLC/3.0.16 LibVLC/3.0.16', 
                    'Accept': '*/*' 
                }
            });
            
            if (response.headers['content-type']) {
                res.setHeader('Content-Type', response.headers['content-type']);
            }
            return response.data.pipe(res);
        }
    } catch (error) {
        console.error('❌ Gagal nembus blokiran:', targetUrl);
        res.status(500).send('Server TV aslinya nolak / mati.');
    }
});

// =====================================================================
// 🏴‍☠️ ENDPOINT 5: AUTO-SCRAPER TOKEN THE BIG 6 DENGAN TOPENG IP INDO
// =====================================================================
app.get('/api/get-premium-channel', async (req, res) => {
    const { channel } = req.query;

    if (!channel) return res.status(400).send('Nama channel belum dimasukin Bang!');

    // ⚠️ INI KUNCINYA: IP Proxy Indonesia Gratisan
    // Kalau suatu hari API error 500 lagi, berarti IP ini udah mati.
    // Lu tinggal cari di Google: "Free Proxy List Indonesia", trus ganti IP & Port-nya di bawah ini!
    const indoProxy = new HttpsProxyAgent('http://103.105.104.57:8080'); 

    try {
        let streamUrl = '';

        // 🟢 JALUR MNC GROUP (RCTI, GTV, MNCTV, iNews)
        if (['rcti', 'gtv', 'mnctv', 'inews'].includes(channel)) {
            const rctiResponse = await axios.get(`https://api.rctiplus.com/api/v1/live/tv/${channel}`, {
                httpsAgent: indoProxy, // <== Paksa Axios pakai KTP Indonesia!
                headers: {
                    'User-Agent': 'okhttp/4.9.0', 
                    'Platform': 'android'
                }
            });

            const videoData = rctiResponse.data?.data;
            if (videoData && videoData.length > 0) {
                streamUrl = videoData[0].url; 
            }
        } 
        
        // 🔵 JALUR EMTEK GROUP (SCTV, Indosiar)
        else if (['sctv', 'indosiar'].includes(channel)) {
            const vidioId = channel === 'sctv' ? '204' : '205'; 
            const vidioResponse = await axios.post(`https://www.vidio.com/live/${vidioId}/tokens`, {}, {
                httpsAgent: indoProxy, // <== Paksa Axios pakai KTP Indonesia!
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/116.0.0.0',
                    'Origin': 'https://www.vidio.com',
                    'Referer': `https://www.vidio.com/live/${vidioId}`,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (vidioResponse.data?.token_url) {
                streamUrl = vidioResponse.data.token_url;
            }
        }

        // Kalau sukses dapet link ber-token, sikat!
        if (streamUrl) {
            console.log(`✅ Berhasil nyolong token ${channel.toUpperCase()} pakai Proxy Indo!`);
            const bypassedPremiumUrl = `https://music-app-production-3507.up.railway.app/api/bypass-cors?url=${encodeURIComponent(streamUrl)}`;
            return res.json({ success: true, url: bypassedPremiumUrl });
        } else {
            return res.status(404).json({ success: false, message: 'API lagi dijaga ketat, token gagal diambil.' });
        }

    } catch (error) {
        console.error(`❌ Gagal meretas API ${channel} (Mungkin Proxy Gratisannya Mati):`, error.message);
        return res.status(500).json({ success: false, message: 'Server target menolak koneksi atau Proxy mati.' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 SERVER ${apiKeys.length} NYAWA ROTASI JALAN DI PORT ${PORT} 🔥`);
    console.log(`📺 PROXY TV STREAMING ACTIVE`);
});
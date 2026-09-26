import { useRef, useEffect, useState, useMemo } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home as HomeIcon, Search as SearchIcon, Library, User, 
  Play, SkipBack, SkipForward, Heart, Pause, 
  ChevronDown, Cast, MoreVertical, ListPlus, Shuffle, Repeat, Repeat1, Mic2, Music, Film, Target,
  History, Trash2, X, Loader2, Minus, Plus, Radio, ListVideo, Bookmark, ThumbsUp, Download, Tv, RefreshCw
} from 'lucide-react';
import { usePlayerStore } from './store/usePlayerStore';

import Home from './pages/Home';
import Search from './pages/Search';
import Artist from './pages/Artist';
import LibraryPage from './pages/Library';
import Developer from './pages/Developer';
import Television from './pages/Television';

// 🔥 LOGO MASJID ESTETIK 🔥
const MosqueIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2c-1.5 2.5-2.5 5-2.5 8.5V21h5v-10.5c0-3.5-1-6-2.5-8.5Z" />
    <path d="M9 21v-3a3 3 0 0 1 6 0v3" />
    <path d="M5 21V11" />
    <path d="M19 21V11" />
    <path d="M3 21h18" />
  </svg>
);

const SILENT_MP3 = "data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";

const isNonMusic = (title) => {
  if (!title) return false;
  const t = title.toLowerCase();
  const badWords = [
      'podcast', 'vlog', 'tutorial', 'review', 'unboxing', 'reaction', 'react to',
      'trailer', 'movie', 'episode', 'berita', 'gameplay', 'how to', 
      'ceramah', 'pengajian', 'talkshow', 'interview', 'parody', 'parodi',
      'ringtone', 'nada dering', 'sound effect', 'ngobrol', 'bincang', 'curhat',
      'behind the scene', 'making of', 'teaser', 'q&a', 'qna', 'dokumenter', 
      'bloopers', 'press conference', 'wawancara', 'story', 'cerita', 'prank', 
      'challenge', 'di balik layar', 'reaction video', 'fungsi', 'fitur', 
      'demo ', 'overview', 'guide', 'belajar', 'cara main', 'kelebihan', 
      'spesifikasi', 'perbandingan', 'midi controller', 'yamaha', 'roland', 
      'korg', 'casio', 'kupas tuntas', 'setting', 'pengaturan', 'alasan', 
      'kenapa', 'mengapa', ' vs ', 'versus', 'tips', 'trick', 'trik', 'harga'
  ];
  if (t.includes('cara ') && !t.includes('bicara') && !t.includes('cara lupakan')) return true;
  return badWords.some(w => t.includes(w)) || t.match(/\b(tes|test|unbox)\b/);
};

const isBadMix = (title) => {
  if (!title) return false;
  if (isNonMusic(title)) return true;
  const t = title.toLowerCase();
  const badMixWords = [
      'full album', 'kompilasi', 'compilation', '1 jam', '2 jam', ' hours', ' hour',
      'karaoke', 'instrumental', 'tanpa vokal', 'live at', 'live in', 'live performance',
      'konser', 'concert', 'short', 'shorts', '8d', '8 d', 'sped up', 'slowed', 'reverb',
      'kumpulan', 'terbaik', 'pilihan', 'nonstop', 'non stop', '2023', '2024', '2025', '2026', '2027', 
      'hits tiktok', 'viral', 'dj ', 'remix', 'type beat', 'chords', 'lirik lagu', 'chord gitar',
      'live session', 'live acoustic', 'cover', 'akustik', 'medley'
  ];
  return badMixWords.some(w => t.includes(w));
};

function MainApp() {
  const { currentSong, isPlaying, togglePlay, playNext, playPrev, playSong, queue, currentIndex } = usePlayerStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('upnext'); 
  const [mediaMode, setMediaMode] = useState('audio'); 
  const [lyricsMode, setLyricsMode] = useState('synced'); 

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [liveSuggestions, setLiveSuggestions] = useState([]);
  const [textSuggestions, setTextSuggestions] = useState([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('ytm_search_history');
    return saved ? JSON.parse(saved) : [];
  });

  const iframeRef = useRef(null);
  
  // 🔥 AUDIO ENGINE MURNI 🔥
  const audioRef = useRef(null);
  const getActiveAudio = () => audioRef.current;
  
  // 🔥 ALWAYS-ON SILENT ENGINE 🔥
  const keepAliveAudioRef = useRef(null);
  const isTransitioningRef = useRef(false);
  const isSeekingRef = useRef(false);
  
  const nextAudioUrlRef = useRef(null);
  const API_BASE = "https://music-app-production-3507.up.railway.app";

  const adzanPausedTimeRef = useRef(0);
  const adzanEndTimeRef = useRef(0);
  const adzanOriginalLoopRef = useRef(false);
  const workerRef = useRef(null); 
  
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(0);
  const [duration, setDuration] = useState(0); 
  const [isDragging, setIsDragging] = useState(false);
  
  const [audioStreamUrl, setAudioStreamUrl] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);

  const [lyrics, setLyrics] = useState([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const lyricsContainerRef = useRef(null);
  
  const activeQueueRef = useRef(null);
  const [lyricOffset, setLyricOffset] = useState(0);
  const [lrclibDuration, setLrclibDuration] = useState(0); 
  const [isSyncMode, setIsSyncMode] = useState(false);
  
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const repeatMode = usePlayerStore(state => state.repeatMode || 'off'); 

  const [toastMsg, setToastMsg] = useState("");
  const [contextMenu, setContextMenu] = useState({ isOpen: false, x: 0, y: 0, song: null });

  const [adzanMode, setAdzanMode] = useState(() => JSON.parse(localStorage.getItem('ytm_adzan_mode') || 'false'));
  const [prayerTimes, setPrayerTimes] = useState([]); 
  const [activePrayerName, setActivePrayerName] = useState(null); 
  
  const lastAdzanTriggered = useRef("");
  const wasPlayingBeforeAdzan = useRef(false);
  const isAdzanPlayingRef = useRef(false); 

  const mediaModeRef = useRef(mediaMode);
  const [relatedSongs, setRelatedSongs] = useState([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);

  useEffect(() => { mediaModeRef.current = mediaMode; }, [mediaMode]);

  // PRELOAD LAGU SELANJUTNYA 
  useEffect(() => {
      if (queue.length === 0) return;
      let nextIdx = currentIndex + 1;
      if (isShuffle) nextIdx = Math.floor(Math.random() * queue.length);
      const nextSong = queue[nextIdx];

      if (nextSong) {
          const originalUrl = `${API_BASE}/api/audio?id=${nextSong.id}`;
          caches.open('rncmusic-offline-audio').then(cache => {
              cache.match(originalUrl).then(res => {
                  if (res) {
                      res.blob().then(blob => {
                          nextAudioUrlRef.current = URL.createObjectURL(blob) + `#id=${nextSong.id}`;
                      });
                  } else {
                      fetch(originalUrl).then(networkRes => {
                          if (networkRes.ok) {
                              cache.put(originalUrl, networkRes.clone());
                              networkRes.blob().then(blob => {
                                  nextAudioUrlRef.current = URL.createObjectURL(blob) + `#id=${nextSong.id}`;
                              });
                          }
                      }).catch(() => { nextAudioUrlRef.current = originalUrl; });
                  }
              }).catch(() => { nextAudioUrlRef.current = originalUrl; });
          }).catch(() => { nextAudioUrlRef.current = originalUrl; });
      } else {
          nextAudioUrlRef.current = null;
      }
  }, [currentIndex, queue, isShuffle, API_BASE]);

  useEffect(() => {
      if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
              registration.addEventListener('updatefound', () => {
                  setUpdateAvailable(true);
              });
          });
      }
  }, []);

  const forceHardRefresh = async (e) => {
      if (e) e.preventDefault();
      showToast("🔄 Mengunduh versi terbaru...");
      try {
          if ('caches' in window) {
              const cacheNames = await caches.keys();
              await Promise.all(cacheNames.map(name => {
                  if (name !== 'rncmusic-offline-audio') return caches.delete(name);
              }));
          }
          if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (let reg of registrations) await reg.unregister();
          }
          window.location.reload(true);
      } catch (err) { window.location.reload(); }
  };

  useEffect(() => {
    usePlayerStore.setState({ isPlaying: false });
    setIsExpanded(false);
  }, []);

  useEffect(() => {
    const handleOpenPlayer = () => setIsExpanded(true);
    window.addEventListener('openFullScreenPlayer', handleOpenPlayer);
    return () => window.removeEventListener('openFullScreenPlayer', handleOpenPlayer);
  }, []);

  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); showToast("🟢 Koneksi kembali! Mode Online aktif."); };
    const handleOffline = () => { setIsOffline(true); showToast("🔴 Masuk ke Mode Offline. Memutar lagu dari memori HP."); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
      const unlockAudio = () => {
          const active = getActiveAudio();
          const silent = keepAliveAudioRef.current;
          if (active && active.paused && !currentSong?.id) active.play().then(() => active.pause()).catch(() => {});
          if (silent && silent.paused) silent.play().then(() => silent.pause()).catch(() => {});
          
          document.removeEventListener('click', unlockAudio);
          document.removeEventListener('touchstart', unlockAudio);
      };
      document.addEventListener('click', unlockAudio);
      document.addEventListener('touchstart', unlockAudio);
      return () => {
          document.removeEventListener('click', unlockAudio);
          document.removeEventListener('touchstart', unlockAudio);
      };
  }, [currentSong]);

  const showToast = (msg) => {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(""), 3500);
  };

  const dismissAdzanPause = () => {
      if (!isAdzanPlayingRef.current) return;
      isAdzanPlayingRef.current = false;
      setActivePrayerName(null);
      adzanEndTimeRef.current = 0;
      
      if (wasPlayingBeforeAdzan.current) {
          const active = getActiveAudio();
          if (mediaModeRef.current === 'video') {
              usePlayerStore.setState({ isPlaying: true });
              iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
              showToast('▶️ Waktu Adzan selesai. Melanjutkan video...');
              if (keepAliveAudioRef.current) keepAliveAudioRef.current.pause();
          } else {
              if (active) {
                  active.muted = false;
                  active.volume = 1;
                  active.loop = adzanOriginalLoopRef.current;
                  active.currentTime = adzanPausedTimeRef.current; 
                  usePlayerStore.setState({ isPlaying: true });
                  showToast('▶️ Gas lagi! Waktu Adzan selesai.');
                  if (keepAliveAudioRef.current) keepAliveAudioRef.current.pause();
              }
          }
      } else {
          if (keepAliveAudioRef.current) keepAliveAudioRef.current.pause();
          showToast('▶️ Waktu Adzan selesai.');
      }
  };

  const dismissAdzanPauseRef = useRef(dismissAdzanPause);
  useEffect(() => { dismissAdzanPauseRef.current = dismissAdzanPause; }, [dismissAdzanPause]);

  const fireAdzanPause = (prayerName, isTest = false) => {
      wasPlayingBeforeAdzan.current = usePlayerStore.getState().isPlaying;
      isAdzanPlayingRef.current = true;
      setActivePrayerName(prayerName);

      if (wasPlayingBeforeAdzan.current) {
          usePlayerStore.setState({ isPlaying: false }); 
          const active = getActiveAudio();
          if (mediaModeRef.current === 'video') {
              iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
          } else {
              if (active) {
                  adzanPausedTimeRef.current = active.currentTime;
                  adzanOriginalLoopRef.current = active.loop;
                  active.muted = true;
                  active.volume = 0;
                  active.loop = true; 
              }
          }
          if (keepAliveAudioRef.current) keepAliveAudioRef.current.play().catch(()=>{});
      }
      showToast(isTest ? `🔊 Test: Waktu Adzan ${prayerName} Tiba! (10 Detik)` : `🕌 Waktu Adzan ${prayerName} tiba! Musik dijeda 5 menit.`);
      adzanEndTimeRef.current = Date.now() + (isTest ? 10000 : 300000);
  };

  const fireAdzanPauseRef = useRef(fireAdzanPause);
  useEffect(() => { fireAdzanPauseRef.current = fireAdzanPause; }, [fireAdzanPause]);

  const dismissAdzanIfActive = () => {
      if (isAdzanPlayingRef.current) {
          dismissAdzanPause();
          showToast('Jeda Adzan dilewati manual.');
          return true;
      }
      return false;
  };

  const triggerTestAdzan = () => {
      if (!adzanMode) {
          showToast("⚠️ Klik 1x ikon Masjid dulu untuk menyalakan Mode Adzan!");
          return;
      }
      if (isAdzanPlayingRef.current) return;
      fireAdzanPause("Zuhur (Test)", true);
  };

  useEffect(() => {
    localStorage.setItem('ytm_adzan_mode', JSON.stringify(adzanMode));
    if (adzanMode) {
        showToast("⏳ Meminta akses lokasi akurat...");
        const fetchByCity = (city) => {
            fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=Indonesia&method=11`)
                .then(res => res.json())
                .then(data => {
                    const timings = data.data.timings;
                    setPrayerTimes([{ name: 'Subuh', time: timings.Fajr }, { name: 'Zuhur', time: timings.Dhuhr }, { name: 'Ashar', time: timings.Asr }, { name: 'Maghrib', time: timings.Maghrib }, { name: 'Isya', time: timings.Isha }]);
                    showToast(`✅ Jadwal Adzan ${city} Aktif!`);
                });
        };
        const fetchByCoords = (lat, lng) => {
            fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=11`)
                .then(res => res.json())
                .then(data => {
                    const timings = data.data.timings;
                    setPrayerTimes([{ name: 'Subuh', time: timings.Fajr }, { name: 'Zuhur', time: timings.Dhuhr }, { name: 'Ashar', time: timings.Asr }, { name: 'Maghrib', time: timings.Maghrib }, { name: 'Isya', time: timings.Isha }]);
                    showToast(`✅ Jadwal Adzan GPS Akurat Aktif!`);
                });
        };
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => fetchByCoords(position.coords.latitude, position.coords.longitude),
                (error) => {
                    console.log("GPS ditolak/gagal, pakai IP (Backup)");
                    fetch('https://get.geojs.io/v1/ip/geo.json').then(res => res.json()).then(locationData => fetchByCity(locationData.city || 'Jakarta')).catch(() => fetchByCity('Jakarta'));
                }, { timeout: 10000 }
            );
        } else {
            fetch('https://get.geojs.io/v1/ip/geo.json').then(res => res.json()).then(locationData => fetchByCity(locationData.city || 'Jakarta')).catch(() => fetchByCity('Jakarta'));
        }
    } else setPrayerTimes([]);
  }, [adzanMode]);

  useEffect(() => {
    if (!adzanMode || prayerTimes.length === 0) return;
    const workerCode = `
      let timer;
      self.onmessage = function(e) {
        if (e.data.cmd === 'start') {
          timer = setInterval(() => {
            const now = new Date();
            const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            postMessage({ type: 'time_check', time: timeStr });
          }, 1000);
        } else if (e.data.cmd === 'stop') { clearInterval(timer); }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const data = e.data;
      if (data.type === 'time_check') {
          const timeStr = data.time;
          const matchedPrayer = prayerTimes.find(p => p.time === timeStr);
          if (matchedPrayer && lastAdzanTriggered.current !== timeStr) {
              lastAdzanTriggered.current = timeStr;
              fireAdzanPauseRef.current(matchedPrayer.name, false);
          }
      }
    };
    worker.postMessage({ cmd: 'start' });
    return () => { worker.postMessage({ cmd: 'stop' }); worker.terminate(); };
  }, [adzanMode, prayerTimes]);

  const loadAudioSource = async (audioEl, songId, autoPlay = false) => {
    if (!audioEl || !songId) return;
    
    isTransitioningRef.current = true;
    const originalUrl = `${API_BASE}/api/audio?id=${songId}`;
    
    try {
        const cache = await caches.open('rncmusic-offline-audio');
        const cachedRes = await cache.match(originalUrl);
        if (cachedRes) {
            const blob = await cachedRes.blob();
            audioEl.src = URL.createObjectURL(blob) + `#id=${songId}`;
        } else { audioEl.src = originalUrl; }
    } catch (e) { audioEl.src = originalUrl; }
    
    audioEl.load();
    if (autoPlay && !isAdzanPlayingRef.current) {
        audioEl.play().then(() => {
            usePlayerStore.setState({ isPlaying: true });
            isTransitioningRef.current = false;
        }).catch(()=>{ isTransitioningRef.current = false; });
    } else {
        isTransitioningRef.current = false;
    }
  };

  const handleNextLocal = (e) => {
      if (e) e.stopPropagation();
      if (dismissAdzanIfActive()) return; 

      isTransitioningRef.current = true;

      const st = usePlayerStore.getState();
      let nextIdx = st.currentIndex + 1;
      if (isShuffle) nextIdx = Math.floor(Math.random() * st.queue.length);
      const nextSong = st.queue[nextIdx];

      if (nextSong) {
          const active = getActiveAudio();
          if (active) {
              active.src = nextAudioUrlRef.current || `${API_BASE}/api/audio?id=${nextSong.id}`;
              active.play().finally(() => { 
                  isTransitioningRef.current = false; 
              }).catch(()=>{ isTransitioningRef.current = false; });
          } else { isTransitioningRef.current = false; }
      } else { isTransitioningRef.current = false; }
      
      st.playNext(isShuffle);
  };

  const handlePrevLocal = (e) => {
      if (e) e.stopPropagation();
      if (dismissAdzanIfActive()) return; 
      if (currentTime > 3) {
          handleSeek({ target: { value: 0 } });
      } else {
          isTransitioningRef.current = true;
          usePlayerStore.getState().playPrev();
          setTimeout(() => { isTransitioningRef.current = false; }, 1000);
      }
  };

  const handleTogglePlayLocal = (e) => {
      if (e) e.stopPropagation();
      if (dismissAdzanIfActive()) return; 

      if (isPlaying) {
          getActiveAudio()?.pause();
          if (keepAliveAudioRef.current) keepAliveAudioRef.current.pause();
          if (mediaMode === 'video') iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
          togglePlay();
      } else {
          const active = getActiveAudio();
          if (active && currentSong && !active.src.includes(currentSong.id)) {
              loadAudioSource(active, currentSong.id, true);
          } else {
              active?.play().then(() => {
                  usePlayerStore.setState({ isPlaying: true });
                  if (keepAliveAudioRef.current) keepAliveAudioRef.current.play().catch(()=>{}); 
              }).catch(()=>{});
          }
          if (mediaMode === 'video') iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
          togglePlay();
      }
  };

  const handleQueuePlay = (e, qSong, idx) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      dismissAdzanIfActive(); 
      if (currentSong && currentSong.id === qSong.id) {
          handleTogglePlayLocal(null);
          setIsExpanded(true); 
          return; 
      }
      usePlayerStore.getState().playSong(qSong, queue, idx);
      setIsExpanded(true); 
  };

  const handlePlayClick = (e, song, list, idx) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      dismissAdzanIfActive(); 
      if (currentSong && currentSong.id === song.id) {
          handleTogglePlayLocal(null);
          setIsExpanded(true); 
          return; 
      }
      
      let cleanQueue = [];
      let usedTitles = new Set();
      let baseTitle = (song.title || '').toLowerCase()
          .replace(/[^a-z0-9\s]/gi, '')
          .replace(/(official|lyric|lyrics|audio|video|music|8d|cover|remix|live|sped up|slowed|reverb)/gi, '')
          .trim();
      usedTitles.add(baseTitle);
      cleanQueue.push(song); 

      if (Array.isArray(list)) {
        list.forEach(t => {
            if (t.id === song.id) return; 
            let tTitle = (t.title || '').toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/(official|lyric|lyrics|audio|video|music|8d|cover|remix|live|sped up|slowed|reverb)/gi, '').trim();
            let isDup = false;
            if (tTitle.length > 3) isDup = Array.from(usedTitles).some(seen => seen.includes(tTitle) || tTitle.includes(seen));
            if (!isDup) { cleanQueue.push(t); if (tTitle.length > 3) usedTitles.add(tTitle); }
        });
      }

      if (cleanQueue.length <= 3) {
          usePlayerStore.getState().playSong(song, cleanQueue, 0);
          generateRadioMix(song);
      } else {
          usePlayerStore.getState().playSong(song, cleanQueue, 0);
      }
      setIsExpanded(true); 
  };

  const handleSeek = (e) => {
    dismissAdzanIfActive(); 
    isSeekingRef.current = true;
    
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    currentTimeRef.current = seekTime;
    const active = getActiveAudio();
    if (active) active.currentTime = seekTime;
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [seekTime, true] }), '*');
    }

    setTimeout(() => { isSeekingRef.current = false; }, 1000);
  };

  const handleDownloadMp3 = async (songToDownload) => {
    try {
      showToast(`⏳ Menyimpan offline: ${songToDownload.title}...`);
      setContextMenu(p => ({...p, isOpen: false}));
      const audioUrl = `${API_BASE}/api/audio?id=${songToDownload.id}`;
      const cache = await caches.open('rncmusic-offline-audio');
      const existing = await cache.match(audioUrl);
      if (!existing) {
          const response = await fetch(audioUrl);
          if (!response.ok) throw new Error("Gagal mengambil file audio");
          await cache.put(audioUrl, response.clone());
      }
      const downloaded = JSON.parse(localStorage.getItem('ytm_downloaded_songs') || '[]');
      if (!downloaded.some(s => s.id === songToDownload.id)) {
          downloaded.unshift(songToDownload);
          localStorage.setItem('ytm_downloaded_songs', JSON.stringify(downloaded));
          window.dispatchEvent(new Event('downloadedSongsUpdated'));
      }
      showToast(`✅ Tersimpan di Pustaka Web: ${songToDownload.title}`);
    } catch (error) { showToast("❌ Gagal menyimpan lagu. Pastikan koneksi stabil."); }
  };

  useEffect(() => {
    const handleOpenMenu = (e) => {
        const { event, song } = e.detail;
        let x = event.clientX;
        let y = event.clientY;
        const menuWidth = 260;
        const menuHeight = 320; 
        if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
        if (y + menuHeight > window.innerHeight) { y = event.clientY - menuHeight; if (y < 10) y = 10; }
        setContextMenu({ isOpen: true, x, y, song });
    };
    const handleCloseMenu = () => setContextMenu(prev => ({ ...prev, isOpen: false }));
    window.addEventListener('openSongMenu', handleOpenMenu);
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('scroll', handleCloseMenu, true);
    return () => {
        window.removeEventListener('openSongMenu', handleOpenMenu);
        window.removeEventListener('click', handleCloseMenu);
        window.removeEventListener('scroll', handleCloseMenu, true);
    };
  }, []);

  const handleMenuPlayNext = () => {
      const st = usePlayerStore.getState();
      if (st.queue[st.currentIndex + 1]?.id !== contextMenu.song.id) {
          const newQ = [...st.queue];
          newQ.splice(st.currentIndex + 1, 0, contextMenu.song);
          usePlayerStore.setState({ queue: newQ });
          showToast("Lagu akan diputar selanjutnya");
      }
      if (st.repeatMode === 'one') {
          usePlayerStore.setState({ repeatMode: 'all' });
          showToast("Mode putar ulang 1x dimatikan");
      }
      setContextMenu(p => ({...p, isOpen: false}));
  };

  const handleMenuAddToQueue = () => {
      const st = usePlayerStore.getState();
      usePlayerStore.setState({ queue: [...st.queue, contextMenu.song] });
      showToast("Ditambahkan ke antrean");
      if (st.repeatMode === 'one') usePlayerStore.setState({ repeatMode: 'all' });
      setContextMenu(p => ({...p, isOpen: false}));
  };

  const handleMenuLike = () => {
      const likedSongs = JSON.parse(localStorage.getItem('ytm_liked_songs') || '[]');
      if (!likedSongs.some(s => s.id === contextMenu.song.id)) {
          likedSongs.unshift(contextMenu.song);
          localStorage.setItem('ytm_liked_songs', JSON.stringify(likedSongs));
          window.dispatchEvent(new Event('likedSongsUpdated'));
          showToast("Berhasil ditambahkan ke Lagu yang Disukai");
      }
      setContextMenu(p => ({...p, isOpen: false}));
  };

  const handleMenuSaveGallery = () => {
      showToast("Tersimpan ke galeri perpustakaan");
      setContextMenu(p => ({...p, isOpen: false}));
  };

  useEffect(() => {
    if (!currentSong || !currentSong.id) return;
    let playHistory = JSON.parse(localStorage.getItem('ytm_play_history') || '[]');
    playHistory = playHistory.filter(s => s.id !== currentSong.id);
    const songToSave = { id: currentSong.id, title: currentSong.title, artist: currentSong.artist, image: currentSong.image, url: `https://www.youtube.com/watch?v=${currentSong.id}` };
    playHistory.unshift(songToSave);
    playHistory = playHistory.slice(0, 24); 
    localStorage.setItem('ytm_play_history', JSON.stringify(playHistory));
    window.dispatchEvent(new Event('historyUpdated'));
  }, [currentSong?.id]);

  const toggleLike = (e) => {
    if (e) e.stopPropagation();
    if (!currentSong?.id) return;
    const likedSongs = JSON.parse(localStorage.getItem('ytm_liked_songs') || '[]');
    let newLikedSongs;
    if (isLiked) {
        newLikedSongs = likedSongs.filter(song => song.id !== currentSong.id);
        showToast("Dihapus dari Lagu Disukai");
    } else {
        const songToSave = { id: currentSong.id, title: currentSong.title, artist: currentSong.artist, image: currentSong.image };
        if (!likedSongs.some(s => s.id === currentSong.id)) newLikedSongs = [songToSave, ...likedSongs];
        else newLikedSongs = likedSongs;
        showToast("Ditambahkan ke Lagu Disukai");
    }
    localStorage.setItem('ytm_liked_songs', JSON.stringify(newLikedSongs));
    setIsLiked(!isLiked);
    window.dispatchEvent(new Event('likedSongsUpdated'));
  };

  const generateRadioMix = async (baseSong) => {
    if(!baseSong) return;
    let realTitle = baseSong.title || "";
    let realArtist = baseSong.artist || "Official";
    if (realTitle.includes('-')) {
        const parts = realTitle.split('-');
        realArtist = parts[0].trim();
        realTitle = parts[1].trim();
    }
    let cleanTitle = realTitle.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/(official|lyric|lyrics|audio|video|music|cover|remix)/gi, '').trim();
    let cleanArtist = realArtist.split(/feat\.|ft\.| x |,|\||-|•/i)[0].replace(/(official|vevo|channel|music|records)/gi, '').trim();
    if (!cleanArtist || cleanArtist.toLowerCase() === 'youtube') cleanArtist = "Pop Hits";

    const cacheKey = `algomix_smart_v5_${cleanTitle}_${cleanArtist}`;
    const cachedMix = sessionStorage.getItem(cacheKey);
    if (cachedMix) {
        const parsedMix = JSON.parse(cachedMix);
        usePlayerStore.setState(state => {
            const existingIds = new Set(state.queue.map(q => q.id));
            const newUnique = parsedMix.filter(m => !existingIds.has(m.id));
            if (newUnique.length === 0) return state; 
            return { queue: [...state.queue, ...newUnique] }; 
        });
        return;
    }

    const dangdutArr = ["Rhoma Irama", "Meggy Z", "Evie Tamala", "Elvy Sukaesih", "Rita Sugiarto", "Mansyur S", "Caca Handika", "Asep Irama", "Imam S Arifin", "Dangdut", "Koplo", "Monata", "Pallapa"];
    const indoPopArr = ["Mahalini", "Bernadya", "Hindia", "Tiara Andini", "Sal Priadi", "Kunto Aji", "Nadin Amizah", "Pamungkas", "Yura Yunita", "Maliq & D'Essentials", "Juicy Luicy", "Rizky Febian", "Tulus", "Lyodra", "Sheila On 7", "D'Masiv", "Noah"];
    const baratPopArr = ["Taylor Swift", "The Weeknd", "Bruno Mars", "Ariana Grande", "Justin Bieber", "Post Malone", "Dua Lipa", "Coldplay", "Ed Sheeran", "Sabrina Carpenter", "Billie Eilish", "Charlie Puth", "Benson Boone"];
    const rockArr = ["Linkin Park", "Nirvana", "Green Day", "Guns N' Roses", "Queen", "Muse", "Oasis", "Arctic Monkeys", "Bon Jovi"];

    const baseIsDangdut = dangdutArr.some(a => cleanArtist.toLowerCase().includes(a.toLowerCase()) || cleanTitle.toLowerCase().includes(a.toLowerCase()));
    const baseIsBarat = baratPopArr.some(a => cleanArtist.toLowerCase().includes(a.toLowerCase()));
    const baseIsRock = rockArr.some(a => cleanArtist.toLowerCase().includes(a.toLowerCase()));

    let queryPool = [ `"${cleanArtist}" official audio`, `${cleanArtist} lagu terbaik official` ]; 
    
    if (baseIsDangdut) {
        const randomHits = dangdutArr.sort(() => 0.5 - Math.random()).slice(0, 2);
        queryPool.push(`"${randomHits[0]}" official audio`, `"${randomHits[1]}" lagu original`);
    } else if (baseIsBarat) {
        const randomHits = baratPopArr.sort(() => 0.5 - Math.random()).slice(0, 2);
        queryPool.push(`"${randomHits[0]}" official audio`, `"${randomHits[1]}" official audio`);
    } else if (baseIsRock) {
        const randomHits = rockArr.sort(() => 0.5 - Math.random()).slice(0, 2);
        queryPool.push(`"${randomHits[0]}" official audio`, `"${randomHits[1]}" official audio`);
    } else {
        const randomHits = indoPopArr.sort(() => 0.5 - Math.random()).slice(0, 2);
        queryPool.push(`${cleanArtist} mix official`, `"${randomHits[0]}" official audio`);
    }

    try {
        const responses = await Promise.all(queryPool.map(q => fetch(`https://api.siputzx.my.id/api/s/youtube?query=${encodeURIComponent(q)}`)));
        const datasets = await Promise.all(responses.map(r => r.json()));
        let combined = [];
        datasets.forEach(d => { if(d.status && d.data) combined = [...combined, ...d.data.sort(() => 0.5 - Math.random())]; });
        
        let mix = [];
        let usedIds = new Set([baseSong.id]); 
        let usedTitles = new Set([cleanTitle.toLowerCase()]);
        let uploaderCount = {}; 

        combined.filter(t => t.type === 'video' && !isBadMix(t.title)).forEach(t => {
            const validId = t.id || t.videoId || (t.url ? t.url.split('v=')[1] : null);
            if (!validId || usedIds.has(validId)) return;
            
            let tCleanT = t.title.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '');
            if (tCleanT.includes('-')) tCleanT = tCleanT.split('-')[1];
            tCleanT = tCleanT.trim();

            let titleCheck = tCleanT.toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/(official|lyric|audio|video|music|cover|remix|live)/gi, '').trim();
            const isThisSongDangdut = dangdutArr.some(a => tCleanT.toLowerCase().includes(a.toLowerCase()) || (t.author?.name || '').toLowerCase().includes(a.toLowerCase()) || tCleanT.toLowerCase().includes('dangdut'));
            if (!baseIsDangdut && isThisSongDangdut) return;
            if (baseIsDangdut && baratPopArr.some(a => (t.author?.name || '').toLowerCase().includes(a.toLowerCase()))) return;

            if (titleCheck.length > 3) {
                let isDup = Array.from(usedTitles).some(seen => seen.includes(titleCheck) || titleCheck.includes(seen));
                if (isDup) return; 
                usedTitles.add(titleCheck);
            }

            let uploaderName = t.author?.name || 'YouTube';
            let uploaderLow = uploaderName.toLowerCase();
            if (uploaderLow.includes('ringtone') || uploaderLow.includes('dj ') || uploaderLow.includes('karaoke')) return;
            if (uploaderCount[uploaderName] >= 2) return;
            uploaderCount[uploaderName] = (uploaderCount[uploaderName] || 0) + 1;

            mix.push({ id: validId, title: tCleanT, artist: uploaderName.replace(/ - Topic/gi, '').trim(), image: t.thumbnail });
            usedIds.add(validId);
        });

        mix.sort((a, b) => (a.artist.toLowerCase().includes(cleanArtist.toLowerCase()) ? -1 : 1) - (b.artist.toLowerCase().includes(cleanArtist.toLowerCase()) ? -1 : 1));
        mix = mix.slice(0, 25);
        if (mix.length > 0) {
            sessionStorage.setItem(cacheKey, JSON.stringify(mix)); 
            usePlayerStore.setState(state => {
                const existingIds = new Set(state.queue.map(q => q.id));
                const newUnique = mix.filter(m => !existingIds.has(m.id));
                return { queue: [...state.queue, ...newUnique] }; 
            });
        }
    } catch (e) {}
  };

  useEffect(() => {
    if (!currentSong || queue.length === 0) return;
    if (queue.length - 1 - currentIndex <= 2) generateRadioMix(currentSong);
  }, [currentSong?.id, currentIndex, queue.length]);

  useEffect(() => {
    if (location.pathname !== '/search') {
      setSearchQuery(''); setShowSearchHistory(false);
    } else {
      const params = new URLSearchParams(location.search);
      if (params.get('q')) setSearchQuery(params.get('q'));
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        setIsFetchingSuggestions(true);
        const qLower = searchQuery.trim().toLowerCase();
        const cacheKey = `search_smart_${qLower}`;
        const cachedSearch = sessionStorage.getItem(cacheKey);

        if (cachedSearch) {
            const { texts, lives } = JSON.parse(cachedSearch);
            setTextSuggestions(texts); setLiveSuggestions(lives); setIsFetchingSuggestions(false);
            return;
        }
        if (isOffline) { setIsFetchingSuggestions(false); return; }

        try {
          const queryPintar = encodeURIComponent(searchQuery.trim());
          const response = await fetch(`https://api.siputzx.my.id/api/s/youtube?query=${queryPintar}`);
          const resData = await response.json();
          if (resData.status && resData.data) {
            let formattedResults = resData.data.filter(item => item.type === 'video' && !isNonMusic(item.title)).map(track => {
                const validId = track.id || track.videoId || (track.url ? track.url.split('v=')[1] : null);
                let cleanT = track.title.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/(official|music video|lyric|lyrics|audio|hq|hd|live|performance|remix)/gi, '').replace(/- -/g, '-').replace(/\s+/g, ' ').trim(); 
                let cleanA = (track.author?.name || 'YouTube').replace(/vevo|official|topic|music|channel|records/gi, '').trim();
                return { id: validId, title: cleanT, artist: cleanA, image: track.thumbnail };
              }).filter(track => track.id != null);

            const uniqueTexts = new Set();
            formattedResults.forEach(track => {
              let t = track.title.toLowerCase().replace(/[^a-z0-9\s-]/gi, '').trim();
              if (t.length > 2) uniqueTexts.add(t);
            });
            const finalTexts = [qLower, ...Array.from(uniqueTexts).filter(t => t !== qLower)].slice(0, 6);
            const finalLives = formattedResults.slice(0, 4);

            setTextSuggestions(finalTexts); setLiveSuggestions(finalLives); 
            sessionStorage.setItem(cacheKey, JSON.stringify({ texts: finalTexts, lives: finalLives }));
          }
        } catch (error) {} finally { setIsFetchingSuggestions(false); }
      } else { setLiveSuggestions([]); setTextSuggestions([]); }
    }, 500); 
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isOffline]); 

  const executeSearch = (query) => {
    const q = query.trim();
    if (!q) return;
    setSearchQuery(q); 
    const newHistory = [q, ...searchHistory.filter(item => item !== q)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('ytm_search_history', JSON.stringify(newHistory));
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setShowSearchHistory(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault(); 
    if (isOffline) { showToast("🔴 Mode Offline: Tidak bisa melakukan pencarian lagu baru."); return; }
    executeSearch(searchQuery);
    if (document.activeElement) document.activeElement.blur(); 
  };

  const removeSearchHistory = (itemToRemove) => {
    const newHistory = searchHistory.filter(item => item !== itemToRemove);
    setSearchHistory(newHistory);
    localStorage.setItem('ytm_search_history', JSON.stringify(newHistory));
  };

  const displayArtist = useMemo(() => {
    if (!currentSong) return "Artis";
    let a = currentSong.artist || "";
    a = a.replace(/vevo|official|topic|music|channel/gi, '').replace(/-/g, '').trim();
    if (!a || a.toLowerCase() === 'youtube') if (currentSong.title && currentSong.title.includes('-')) a = currentSong.title.split('-')[0].replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '');
    return a.trim() || "Artis";
  }, [currentSong]);

  const displayTitle = useMemo(() => {
    if (!currentSong?.title) return "Pilih Lagu";
    let t = currentSong.title.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '');
    if (t.includes('-')) {
       let parts = t.split('-');
       let artistName = displayArtist.toLowerCase();
       if (parts[0].toLowerCase().includes(artistName)) t = parts.slice(1).join('-'); 
       else if (parts[1] && parts[1].toLowerCase().includes(artistName)) t = parts[0];
       else t = parts.slice(1).join('-');
    }
    return t.trim() || currentSong.title;
  }, [currentSong, displayArtist]);

  const handleIframeLoad = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
      const active = getActiveAudio();
      if (active) iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [active.currentTime, true] }), '*');
      if (mediaMode === 'audio') {
          iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), '*');
          iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
      } else {
          iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
          if (isPlaying && !isAdzanPlayingRef.current) iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
      }
    }
  };

  useEffect(() => {
      const syncMedia = () => {
          if (!iframeRef.current?.contentWindow) return;
          if (isAdzanPlayingRef.current) {
              iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
              return; 
          }
          const active = getActiveAudio();
          if (mediaMode === 'audio') {
              if (active) active.muted = false;
              iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
          } else {
              if (active) active.muted = true;
              if (active) iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [active.currentTime, true] }), '*');
              iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
              if (isPlaying) iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
              else iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
          }
      };
      syncMedia();
      const t1 = setTimeout(syncMedia, 500);
      return () => { clearTimeout(t1); };
  }, [mediaMode, isPlaying, currentSong?.id]);

  useEffect(() => {
    if (!currentSong?.id) { setIsLiked(false); setAudioStreamUrl(null); return; }

    const expectedUrl = `${API_BASE}/api/audio?id=${currentSong.id}`;
    const activeAudio = getActiveAudio();
    const isAlreadyPlaying = activeAudio && (activeAudio.src === expectedUrl || activeAudio.src.includes(currentSong.id)) && !activeAudio.paused;

    if (isAlreadyPlaying) {
        setMediaMode('audio'); setIsBuffering(false);
    } else {
        const isFromPreload = activeAudio && activeAudio.src.includes(currentSong.id);
        if (!isFromPreload) {
            setCurrentTime(0); currentTimeRef.current = 0; setDuration(0); setLyricOffset(0); setIsSyncMode(false); setLrclibDuration(0); setMediaMode('audio'); setLyricsMode('synced'); 
            setIsBuffering(true);
            
            activeAudio.src = expectedUrl;
            activeAudio.load();
            if (isPlaying && !isAdzanPlayingRef.current) activeAudio.play().catch(()=>{});
        }
        
        const likedSongs = JSON.parse(localStorage.getItem('ytm_liked_songs') || '[]');
        setIsLiked(likedSongs.some(song => song.id === currentSong.id));
    }

    if (currentSong?.title) {
      if (isOffline) {
          setIsLoadingLyrics(false); setLyrics([{time: 0, text: "Lirik tidak tersedia dalam Mode Offline."}]); setLyricsMode('full'); return;
      }
      setIsLoadingLyrics(true); setLyrics([]); setActiveLyricIndex(-1);
      let rawTitle = currentSong.title;
      if (rawTitle.includes('-')) {
          let parts = rawTitle.split('-');
          if (parts[0].toLowerCase().includes(displayArtist.toLowerCase().split(' ')[0])) rawTitle = parts.slice(1).join('-');
          else rawTitle = parts[0]; 
      }
      let cleanTitleAPI = rawTitle.split(/\||\(|\[|"/)[0].replace(/(official|music|video|lyric|lyrics|audio|indonesian|clip|records|hq|hd|4k|8k|live|cover)/gi, '').trim();
      let cleanArtistAPI = displayArtist.split(/feat\.|ft\.| x |,|\||-|•/i)[0].replace(/(official|vevo|channel|music|records)/gi, '').trim(); 
      
      const searchAPI = async () => {
          try {
              let res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitleAPI + ' ' + cleanArtistAPI)}`);
              let data = await res.json();
              if (!Array.isArray(data) || data.length === 0) { res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitleAPI)}`); data = await res.json(); }
              let trackFound = false;
              if (Array.isArray(data) && data.length > 0) {
                  const safeTitle = cleanTitleAPI.toLowerCase().replace(/[^a-z0-9]/g, '');
                  const exactMatches = data.filter(t => {
                      if (!t.trackName) return false;
                      const apiTitle = t.trackName.toLowerCase().replace(/[^a-z0-9]/g, '');
                      return apiTitle.includes(safeTitle) || safeTitle.includes(apiTitle);
                  });
                  if (exactMatches.length > 0) {
                      let track = exactMatches.find(t => t.syncedLyrics) || exactMatches.find(t => t.plainLyrics) || exactMatches[0];
                      if (track) {
                          trackFound = true; setLrclibDuration(track.duration || 0);
                          if (track.syncedLyrics) {
                              const parsed = track.syncedLyrics.split('\n').map(line => {
                                  const match = line.match(/\[(\d{1,3}):(\d{1,2}(?:\.\d{1,3})?)\](.*)/);
                                  if (match && match[3].trim() !== '') return { time: parseInt(match[1], 10) * 60 + parseFloat(match[2]), text: match[3].trim() };
                                  return null;
                              }).filter(item => item !== null);
                              if (parsed.length > 0) { setLyrics(parsed); setLyricsMode('synced'); return; }
                          }
                          if (track.plainLyrics) {
                              const parsed = track.plainLyrics.split('\n').map(line => ({ time: 0, text: line.trim() })).filter(item => item.text !== '');
                              if (parsed.length > 0) { setLyrics(parsed); setLyricsMode('full'); return; }
                          }
                      }
                  }
              }
              if (!trackFound) {
                  try {
                      const resOvh = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtistAPI)}/${encodeURIComponent(cleanTitleAPI)}`);
                      if (resOvh.ok) {
                          const dataOvh = await resOvh.json();
                          if (dataOvh && dataOvh.lyrics) {
                              const parsed = dataOvh.lyrics.split('\n').map(line => ({ time: 0, text: line.trim() })).filter(item => item.text !== '');
                              if (parsed.length > 0) { setLyrics(parsed); setLyricsMode('full'); return; }
                          }
                      }
                      const targetUrl = `https://lyrist.vercel.app/api/${encodeURIComponent(cleanTitleAPI + ' ' + cleanArtistAPI)}`;
                      const fallbackRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
                      const fallbackDataWrapped = await fallbackRes.json();
                      const fallbackData = JSON.parse(fallbackDataWrapped.contents);
                      if (fallbackData && fallbackData.lyrics) {
                          const safeTitle = cleanTitleAPI.toLowerCase().replace(/[^a-z0-9]/g, '');
                          const lyristTitle = (fallbackData.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                          if (lyristTitle.includes(safeTitle) || safeTitle.includes(lyristTitle)) {
                              const parsed = fallbackData.lyrics.split('\n').map(line => ({ time: 0, text: line.trim() })).filter(item => item.text !== '');
                              if (parsed.length > 0) { setLyrics(parsed); setLyricsMode('full'); }
                          }
                      }
                  } catch(err) {}
              }
          } catch (e) {} finally { setIsLoadingLyrics(false); }
      };
      searchAPI();
    }
  }, [currentSong?.id, displayTitle, displayArtist, API_BASE, isOffline]);

  useEffect(() => {
    if (duration > 0 && lrclibDuration > 0) {
      const selisih = Math.round(duration - lrclibDuration);
      if (selisih > 0 && selisih <= 15) setLyricOffset(selisih);
      else setLyricOffset(0);
    }
  }, [duration, lrclibDuration]);

  useEffect(() => {
    if (lyrics.length > 0 && !isSyncMode && lyricsMode === 'synced') {
      const adjustedTime = currentTime - lyricOffset;
      const currentIndex = lyrics.findIndex((l, index) => {
        const nextLyric = lyrics[index + 1];
        return adjustedTime >= l.time && (!nextLyric || adjustedTime < nextLyric.time);
      });
      if (currentIndex !== activeLyricIndex && currentIndex !== -1) {
        setActiveLyricIndex(currentIndex);
        if (isExpanded && activeTab === 'lyrics' && lyricsContainerRef.current) {
          const activeElement = lyricsContainerRef.current.children[currentIndex];
          if (activeElement) activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, lyrics, activeLyricIndex, lyricOffset, isSyncMode, lyricsMode, isExpanded, activeTab]);

  const toggleRepeat = () => {
    usePlayerStore.setState(prev => {
      if (prev.repeatMode === 'off') return { repeatMode: 'all' };
      if (prev.repeatMode === 'all') return { repeatMode: 'one' };
      return { repeatMode: 'off' };
    });
  };

  const toggleTab = (tabName) => {
    if (tabName === 'lyrics') {
      if (activeTab === 'lyrics' || activeTab === 'lyrics_only') setActiveTab('cover');
      else setActiveTab('lyrics'); 
      return;
    }
    setActiveTab(activeTab === tabName ? 'cover' : tabName);
  };

  useEffect(() => {
    if (activeTab === 'upnext' && activeQueueRef.current) {
      activeQueueRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentSong?.id, activeTab]);

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 🔥 POMPA METADATA SETIAP DETIK (JURUS KUNCI MAGIC RING XOS!) 🔥
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      const updateMetadata = () => {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: displayTitle,
            artist: displayArtist,
            album: 'RnCmusic Premium',
            artwork: [{ src: currentSong.image || 'https://via.placeholder.com/512', sizes: '512x512', type: 'image/jpeg' }]
          });
          navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      };
      
      updateMetadata(); // Eksekusi pertama
      
      // Paksa refresh tiap 1.5 detik biar Magic Ring nggak kedip/mati!
      const pumpInterval = setInterval(updateMetadata, 1500); 

      navigator.mediaSession.setActionHandler('play', () => { handleTogglePlayLocal(null); });
      navigator.mediaSession.setActionHandler('pause', () => { handleTogglePlayLocal(null); });
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevLocal(null));
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNextLocal(null));
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        handleSeek({ target: { value: details.seekTime } });
      });

      return () => clearInterval(pumpInterval); // Bersihin pas unmount
    }
  }, [currentSong, displayTitle, displayArtist, isShuffle, isPlaying]);

  const handleTimeUpdate = (e) => {
      if (e.target !== getActiveAudio()) return;
      
      if (isAdzanPlayingRef.current) {
          if (Date.now() >= adzanEndTimeRef.current) {
              dismissAdzanPause();
              return;
          }
          if (e.target.currentTime > adzanPausedTimeRef.current + 0.5) {
              e.target.currentTime = adzanPausedTimeRef.current;
          }
          return; 
      }

      const newTime = e.target.currentTime;
      const currentDur = e.target.duration || 0;
      const prevTime = currentTimeRef.current;

      if (currentDur > 10 && !isSeekingRef.current) {
          if (prevTime >= currentDur - 8 && newTime < 5) {
              if (isTransitioningRef.current) return;
              
              const st = usePlayerStore.getState();
              if (st.repeatMode !== 'one') {
                  isTransitioningRef.current = true;
                  handleNextLocal(null); 
                  return; 
              }
          }
      }

      if (!isDragging && mediaMode === 'audio') {
          if (Math.abs(prevTime - newTime) >= 0.5) {
              setCurrentTime(newTime);
              currentTimeRef.current = newTime;
          }
      }
  };

  const handleLoadedMetadata = (e) => {
      if (e.target !== getActiveAudio()) return;
      if (mediaMode === 'audio') setDuration(e.target.duration);
  };
  
  const handleCanPlay = (e) => {
      if (e.target !== getActiveAudio()) return;
      setIsBuffering(false);
      if (isPlaying && mediaMode === 'audio' && !isAdzanPlayingRef.current) {
          e.target.play().catch(()=>{});
      }
  };
  
  const handleError = (e) => {
      if (e.target !== getActiveAudio()) return;
      const err = e.target.error;
      if (!err) return;
      if (err.code === 1 || err.code === 20 || err.message?.includes('aborted')) return; 
      
      console.error("Audio Error Murni:", err);
      if (mediaMode === 'audio' && currentSong?.id && e.target.src) {
          setIsBuffering(false);
          usePlayerStore.setState({ isPlaying: false });
          showToast("❌ Sinyal audio terputus. Ketuk Play untuk mengulang.");
      }
  };
  
  const handleWaiting = (e) => {
      if (e.target !== getActiveAudio()) return;
      setIsBuffering(true);
  };
  
  const handlePlaying = (e) => {
      if (e.target !== getActiveAudio()) return;
      setIsBuffering(false);
      if (!isAdzanPlayingRef.current) {
          usePlayerStore.setState({ isPlaying: true });
          
          if (keepAliveAudioRef.current && keepAliveAudioRef.current.paused) {
              keepAliveAudioRef.current.play().catch(()=>{});
          }
      }
  };
  
  const handlePause = (e) => {
      if (e.target !== getActiveAudio()) return;
      if (isTransitioningRef.current) return; 
      if (!isAdzanPlayingRef.current) {
          usePlayerStore.setState({ isPlaying: false });
          
          if (keepAliveAudioRef.current) {
              keepAliveAudioRef.current.pause();
          }
      }
  };

  window.saklarPusat = handleTogglePlayLocal;

  return (
    <div className="h-screen bg-[#0f0f0f] text-white flex flex-col font-sans overflow-hidden relative">
      
      {updateAvailable && (
          <div 
             onClick={forceHardRefresh}
             className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#3ea6ff] text-black px-6 py-3 rounded-full text-sm font-black shadow-[0_0_30px_rgba(62,166,255,0.6)] z-[999999] flex items-center gap-3 cursor-pointer animate-in slide-in-from-top-10 hover:scale-105 transition-transform"
          >
              <Download size={18} className="animate-bounce" />
              Versi Baru Tersedia! Klik untuk Update Web
          </div>
      )}

      {/* 🔥 ALWAYS-ON SILENT ENGINE 🔥 */}
      <audio ref={keepAliveAudioRef} src={SILENT_MP3} loop playsInline className="hidden" />

      {/* 🔥 MAIN ENGINE 🔥 */}
      <audio
        ref={audioRef} playsInline preload="auto" loop={true}
        onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay} onError={handleError}
        onWaiting={handleWaiting} onPlaying={handlePlaying} onPause={handlePause} className="hidden"
      />

      {activePrayerName && (
        <div 
          className="fixed inset-0 bg-black/95 z-[999999] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300"
        >
          <div className="w-24 h-24 bg-[#3ea6ff]/20 rounded-full flex items-center justify-center mb-6 animate-pulse border border-[#3ea6ff]/30">
            <MosqueIcon size={48} className="text-[#3ea6ff]" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4">Waktu Adzan {activePrayerName} Tiba</h2>
          <p className="text-zinc-400 text-base md:text-lg mb-8 max-w-sm leading-relaxed">
            Musik dijeda otomatis selama 5 menit untuk menghormati waktu adzan.
          </p>
          
          <button 
             onClick={(e) => {
                 e.stopPropagation();
                 dismissAdzanPause();
             }}
             className="bg-white/10 hover:bg-white/20 text-white font-bold px-10 py-4 rounded-full text-lg transition-colors border border-white/20"
          >
             Lewati & Lanjut Musik
          </button>
        </div>
      )}

      {toastMsg && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-800 text-white px-6 py-3 rounded-full text-sm font-semibold shadow-2xl z-[99999] animate-in slide-in-from-bottom-5 whitespace-nowrap border border-white/5">
              {toastMsg}
          </div>
      )}

      {contextMenu.isOpen && contextMenu.song && (
        <div 
           className="fixed z-[9999] bg-[#282828] border border-white/10 rounded-lg shadow-2xl py-2 w-64 flex flex-col animate-in fade-in zoom-in duration-200"
           style={{ top: contextMenu.y, left: contextMenu.x }}
           onClick={(e) => e.stopPropagation()}
        >
           <button onClick={(e) => { 
               const st = usePlayerStore.getState();
               if (st.repeatMode === 'one') usePlayerStore.setState({ repeatMode: 'all' });

               handlePlayClick(e, contextMenu.song, [contextMenu.song], 0);
               generateRadioMix(contextMenu.song); 
               showToast("Memulai Radio Mix...");
               setContextMenu(p => ({...p, isOpen: false}));
           }} className="flex items-center gap-4 px-4 py-3 hover:bg-white/10 text-sm font-medium text-white text-left transition-colors">
               <Radio size={20} className="text-zinc-400" /> Mulai mix
           </button>

           <button onClick={handleMenuPlayNext} className="flex items-center gap-4 px-4 py-3 hover:bg-white/10 text-sm font-medium text-white text-left transition-colors">
               <ListVideo size={20} className="text-zinc-400" /> Putar setelah ini
           </button>

           <button onClick={handleMenuAddToQueue} className="flex items-center gap-4 px-4 py-3 hover:bg-white/10 text-sm font-medium text-white text-left transition-colors border-b border-white/10">
               <ListPlus size={20} className="text-zinc-400" /> Tambahkan ke antrean
           </button>

           <button onClick={handleMenuSaveGallery} className="flex items-center gap-4 px-4 py-3 hover:bg-white/10 text-sm font-medium text-white text-left transition-colors">
               <Bookmark size={20} className="text-zinc-400" /> Simpan ke galeri
           </button>

           <button onClick={handleMenuLike} className="flex items-center gap-4 px-4 py-3 hover:bg-white/10 text-sm font-medium text-white text-left transition-colors border-b border-white/10">
               <ThumbsUp size={20} className="text-zinc-400" /> Tambahkan ke disukai
           </button>
           
           <button onClick={() => handleDownloadMp3(contextMenu.song)} className="flex items-center gap-4 px-4 py-3 hover:bg-white/10 text-sm font-medium text-white text-left transition-colors">
               <Download size={20} className="text-[#3ea6ff]" /> Simpan Offline
           </button>
        </div>
      )}

      <div className="hidden md:flex fixed top-0 left-0 right-0 h-[72px] bg-gradient-to-b from-black to-[#0a0a0a]/95 border-b border-white/10 shadow-xl z-[45] items-center justify-between px-6">
        <div className="flex items-center">
          
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img loading="lazy" src="/rnctech.jpg" alt="RnCmusic logo" className="w-10 h-10 rounded-full object-cover shadow-[0_0_10px_rgba(62,166,255,0.3)]" />
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter leading-none">RnCmusic</span>
              {isOffline && <span className="text-[10px] text-red-500 font-bold tracking-widest uppercase mt-0.5">OFFLINE MODE</span>}
            </div>
          </div>

          <div className="flex items-center gap-8 ml-10">
            <Link to="/" className={`text-base font-bold transition-colors ${location.pathname === '/' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>Beranda</Link>
            <Link to="/library" className={`text-base font-bold transition-colors ${location.pathname === '/library' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>Pustaka</Link>
            <Link to="/tv" className={`text-base font-bold transition-colors ${location.pathname === '/tv' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>Siaran TV</Link>
            <Link to="/developer" className={`text-base font-bold transition-colors ${location.pathname === '/developer' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>Developer</Link>
          </div>
        </div>
        
        <div className="flex-1 max-w-xl relative mx-8">
          <form onSubmit={handleSearchSubmit} className={`flex items-center bg-[#181818] border ${showSearchHistory ? 'border-white/30 rounded-t-xl' : 'border-white/10 rounded-xl'} px-4 py-2.5 transition-all w-full shadow-inner`}>
            <SearchIcon size={20} className="text-zinc-400 mr-3 shrink-0" />
            <input 
              type="text" 
              placeholder={isOffline ? "Pencarian dimatikan saat Offline..." : "Telusuri lagu, album, artis, podcast"} 
              className="bg-transparent border-none outline-none text-white w-full text-base placeholder:text-zinc-500 font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchHistory(true)}
              onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
              disabled={isOffline}
            />
            {searchQuery && !isOffline && (
              <button 
                type="button" 
                onClick={() => { setSearchQuery(''); document.activeElement.focus(); }} 
                className="text-zinc-400 hover:text-white ml-2 transition-colors"
              >
                <X size={20} />
              </button>
            )}
            <button type="submit" className="hidden">Search</button>
          </form>
          
          {showSearchHistory && !isOffline && (
            <div className="absolute top-full left-0 right-0 bg-[#181818] border-x border-b border-white/10 rounded-b-xl shadow-2xl py-2 z-50 overflow-hidden flex flex-col max-h-[75vh]">
              {searchQuery.trim() === '' && searchHistory.length > 0 && searchHistory.map((item, idx) => (
                <div 
                  key={`hist-${idx}`} 
                  className="flex items-center justify-between px-4 py-3 hover:bg-white/10 cursor-pointer group"
                  onMouseDown={(e) => { 
                    e.preventDefault(); 
                    executeSearch(item); 
                  }}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <History size={20} className="text-zinc-400 shrink-0" />
                    <span className="text-base text-zinc-200 font-semibold">{item}</span>
                  </div>
                  <button 
                    onMouseDown={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      removeSearchHistory(item); 
                    }}
                    className="text-zinc-500 hover:text-white opacity-0 md:group-hover:opacity-100 transition-opacity p-1"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              {searchQuery.trim() !== '' && (
                <div className="flex flex-col overflow-y-auto hide-scrollbar pb-2">
                  {textSuggestions.map((text, idx) => (
                    <div 
                      key={`tsug-${idx}`}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-white/10 cursor-pointer group"
                      onMouseDown={(e) => { 
                        e.preventDefault(); 
                        executeSearch(text); 
                      }}
                    >
                      <SearchIcon size={20} className="text-zinc-400 shrink-0" />
                      <span className="text-base text-white font-semibold">{text}</span>
                    </div>
                  ))}

                  {isFetchingSuggestions && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="animate-spin text-zinc-400" size={24} />
                    </div>
                  )}

                  {!isFetchingSuggestions && liveSuggestions.length > 0 && (
                    <>
                      <div className="border-t border-white/10 my-2 mx-4"></div>
                      {liveSuggestions.map((song, idx) => (
                        <div 
                          key={`live-${idx}`}
                          className="flex items-center justify-between px-4 py-2 hover:bg-white/10 cursor-pointer group"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearchQuery(song.title); 
                            window.dispatchEvent(new CustomEvent('openFullScreenPlayer'));
                            handlePlayClick(e, song, [song], 0);
                            setShowSearchHistory(false);
                          }}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <img loading="lazy" src={song.image} alt={song.title} className="w-10 h-10 md:w-12 md:h-12 object-cover rounded" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white line-clamp-1">{song.title}</p>
                              <p className="text-xs text-zinc-400 truncate mt-0.5">Lagu • {song.artist}</p>
                            </div>
                          </div>
                          <button onClick={(e) => {
                             e.stopPropagation(); e.preventDefault();
                             window.dispatchEvent(new CustomEvent('openSongMenu', { detail: { event: e, song: song } }));
                          }} className="p-2 text-zinc-400 hover:text-white opacity-0 md:opacity-100 transition-opacity">
                             <MoreVertical size={20} />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-5 w-[160px]">
          <button onClick={forceHardRefresh} title="Hard Refresh Web" className="text-zinc-500 hover:text-[#3ea6ff] transition-colors hidden md:block">
            <RefreshCw size={22} />
          </button>
          <button 
             onClick={(e) => {
                 const newMode = !adzanMode;
                 setAdzanMode(newMode);
                 showToast(newMode ? "Mode Adzan Aktif 🕌" : "Mode Adzan Dimatikan");
             }}
             onDoubleClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 triggerTestAdzan();
             }}
             className={`transition-all duration-300 ${adzanMode ? 'text-[#3ea6ff] drop-shadow-[0_0_8px_rgba(62,166,255,0.4)]' : 'text-zinc-500 hover:text-zinc-300'}`} 
             title="Mode Adzan (Klik Kiri 2x Cepat untuk Test)"
          >
            <MosqueIcon size={24} />
          </button>
          <Cast size={24} className="text-zinc-400 hover:text-white cursor-pointer" />
          <User size={24} className="text-zinc-400 hover:text-white cursor-pointer" />
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto pt-0 md:pt-[72px] z-10 transition-all duration-[600ms] smooth-scroll ${currentSong?.id ? 'pb-[140px] md:pb-[100px]' : 'pb-20 md:pb-8'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/artist/:name" element={<Artist />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/tv" element={<Television />} />
          <Route path="/developer" element={<Developer />} />
        </Routes>
      </div>

      <div className={`md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-gradient-to-t from-black to-[#111] flex justify-around items-center text-[10px] z-40 pb-1 border-t border-white/10 transition-transform duration-[600ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isExpanded ? 'translate-y-[150vh] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <Link to="/" className={`flex flex-col items-center gap-1 ${location.pathname === '/' ? 'text-white' : 'text-zinc-400'}`}><HomeIcon size={24} /><span>Beranda</span></Link>
        <Link to="/search" className={`flex flex-col items-center gap-1 ${location.pathname === '/search' ? 'text-white' : 'text-zinc-400'}`}><SearchIcon size={24} /><span>Mencari</span></Link>
        <Link to="/library" className={`flex flex-col items-center gap-1 ${location.pathname === '/library' ? 'text-white' : 'text-zinc-400'}`}><Library size={24} /><span>Pustaka</span></Link>
        <Link to="/tv" className={`flex flex-col items-center gap-1 ${location.pathname === '/tv' ? 'text-white' : 'text-zinc-400'}`}><Tv size={24} /><span>TV</span></Link>
        <Link to="/developer" className={`flex flex-col items-center gap-1 ${location.pathname === '/developer' ? 'text-white' : 'text-zinc-400'}`}><User size={24} /><span>Developer</span></Link>
      </div>

      <div 
        className={`fixed left-0 right-0 h-[64px] md:h-[72px] bg-gradient-to-t from-[#111] to-[#222] border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] flex flex-col justify-center px-4 md:px-6 z-[90] cursor-pointer hover:from-[#1a1a1a] hover:to-[#2a2a2a] transition-all duration-[600ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] 
        ${!currentSong?.id ? 'translate-y-[150vh] opacity-0 pointer-events-none' 
        : isExpanded ? 'translate-y-[150vh] opacity-0 pointer-events-none md:translate-y-0 md:opacity-100 md:pointer-events-auto bottom-0' 
        : 'translate-y-0 opacity-100 bottom-[60px] md:bottom-0'}`}
        onClick={() => { if(!isExpanded && currentSong?.id) setIsExpanded(true); }}
      >
        <div className="absolute top-[-5px] left-0 right-0 h-[10px] group/timeline items-center cursor-pointer z-50 md:flex hidden">
          <input 
             type="range" min={0} max={duration || 100} value={currentTime} 
             onMouseDown={(e) => { e.stopPropagation(); setIsDragging(true); }} 
             onMouseUp={(e) => { e.stopPropagation(); setIsDragging(false); }} 
             onChange={(e) => { e.stopPropagation(); handleSeek(e); }} 
             className="w-full h-full absolute inset-0 opacity-0 cursor-pointer z-20" 
          />
          <div className="w-full h-[2px] bg-white/10 group-hover/timeline:h-[4px] transition-all relative pointer-events-none">
             <div className="h-full bg-[#ff0000] relative transition-all duration-300" style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#ff0000] rounded-full opacity-0 group-hover/timeline:opacity-100 shadow-md"></div>
             </div>
          </div>
        </div>
        
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10 md:hidden pointer-events-none">
           <div className="h-full bg-[#ff0000] transition-all duration-300" style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}></div>
        </div>

        <div className="md:hidden flex items-center justify-between w-full h-full pt-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 flex-shrink-0 bg-white/5 rounded overflow-hidden shadow-lg relative">
              {currentSong?.image ? <img loading="lazy" src={currentSong.image} className="w-full h-full object-cover" alt="cover" /> : <Music className="w-5 h-5 m-2.5 text-zinc-500" />}
              {isBuffering && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white truncate">{displayTitle}</span>
              <span className="text-xs text-zinc-400 truncate">{displayArtist}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
            <button onClick={handleTogglePlayLocal} className="p-2">
              {isPlaying ? <Pause fill="white" size={20} /> : <Play fill="white" size={20} />}
            </button>
            <button onClick={handleNextLocal} className="p-2">
              <SkipForward fill="white" size={20} />
            </button>
          </div>
        </div>

        <div className="hidden md:flex items-center w-full h-full">
          <div className="flex items-center gap-5 w-1/3">
            <button onClick={handlePrevLocal} className="text-zinc-400 hover:text-white transition-colors">
              <SkipBack fill="currentColor" size={20} />
            </button>
            <button 
              onClick={handleTogglePlayLocal} 
              className="w-10 h-10 flex items-center justify-center bg-[#2a2a2a] hover:bg-white/20 text-white rounded-full transition-colors border border-white/10"
            >
              {isPlaying ? <Pause fill="currentColor" size={20} /> : <Play className="ml-1" fill="currentColor" size={20} />}
            </button>
            <button onClick={handleNextLocal} className="text-zinc-400 hover:text-white transition-colors">
              <SkipForward fill="currentColor" size={20} />
            </button>
            <span className="text-xs text-zinc-400 font-medium ml-2 tracking-wide">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4 flex-1 justify-center max-w-2xl mx-auto">
            <div className="w-[64px] h-[36px] flex-shrink-0 bg-black rounded-sm overflow-hidden relative shadow-md">
              {currentSong?.image ? (
                <img loading="lazy" src={currentSong.image} className="absolute inset-0 w-full h-full object-cover" alt="cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
                  <Music size={16} />
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white truncate">{displayTitle}</span>
              <span className="text-[11px] text-zinc-400 truncate mt-0.5">{displayArtist} • Kualitas Premium</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-5 w-1/3 pr-2">
            <button onClick={toggleLike} className={`transition-colors ${isLiked ? 'text-[#3ea6ff]' : 'text-zinc-400 hover:text-white'}`}>
              <Heart fill={isLiked ? "currentColor" : "none"} size={20} strokeWidth={isLiked ? 0 : 2} />
            </button>
            
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                const nextVal = !isShuffle;
                setIsShuffle(nextVal); 
                showToast(nextVal ? "Pemutaran acak diaktifkan" : "Pemutaran acak dimatikan");
              }} 
              className={`transition-colors ${isShuffle ? 'text-[#3ea6ff]' : 'text-zinc-400 hover:text-white'}`}
            >
              <Shuffle size={18} />
            </button>

            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                toggleRepeat(); 
                setTimeout(() => {
                  const m = usePlayerStore.getState().repeatMode;
                  if (m === 'all') showToast("Mengulang semua lagu");
                  else if (m === 'one') showToast("Mengulang lagu ini");
                  else showToast("Pengulangan dimatikan");
                }, 50);
              }} 
              className={`transition-colors ${repeatMode !== 'off' ? 'text-[#3ea6ff]' : 'text-zinc-400 hover:text-white'}`}
            >
              {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* FULLSCREEN PLAYER OVERLAY */}
      <div 
        className={`fixed top-0 left-0 right-0 bottom-0 md:bottom-[72px] bg-gradient-to-b from-[#1a1c29] to-[#0f0f0f] z-[80] flex flex-col transition-transform duration-[600ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] 
        ${!currentSong?.id || !isExpanded ? 'translate-y-[150vh] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 pointer-events-auto'}`}
      >
        <div className="h-[80px] shrink-0 flex justify-between items-center px-4 md:px-8 border-b border-white/5">
          <button onClick={() => setIsExpanded(false)} className="text-white hover:text-zinc-300 p-2 rounded-full hover:bg-white/10 transition-colors">
            <ChevronDown size={32} />
          </button>
          
          <div className="flex bg-[#2a2a2a] rounded-full p-1 border border-white/10">
            <button onClick={(e) => { e.stopPropagation(); setMediaMode('audio'); }} className={`flex items-center gap-1.5 px-6 py-1.5 rounded-full text-sm font-bold transition-colors ${mediaMode === 'audio' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}><Music size={16} /> Lagu</button>
            <button onClick={(e) => { e.stopPropagation(); setMediaMode('video'); }} className={`flex items-center gap-1.5 px-6 py-1.5 rounded-full text-sm font-bold transition-colors ${mediaMode === 'video' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}><Film size={16} /> Video</button>
          </div>
          
          <div className="flex gap-2 md:gap-4 text-white px-2">
            <button onClick={forceHardRefresh} className="p-2 rounded-full hover:bg-white/10 md:hidden text-zinc-400 hover:text-white transition-colors" title="Hard Refresh Web">
               <RefreshCw size={24} />
            </button>

            <button 
               onClick={(e) => {
                   const newMode = !adzanMode;
                   setAdzanMode(newMode);
                   showToast(newMode ? "Mode Adzan Aktif 🕌" : "Mode Adzan Dimatikan");
               }}
               onDoubleClick={(e) => {
                   e.preventDefault();
                   e.stopPropagation();
                   triggerTestAdzan();
               }}
               className={`p-2 rounded-full hover:bg-white/10 transition-all duration-300 ${adzanMode ? 'text-[#3ea6ff] drop-shadow-[0_0_8px_rgba(62,166,255,0.4)]' : 'text-zinc-500 hover:text-white'}`} 
               title="Mode Adzan (Klik Kiri 2x Cepat untuk Test)"
            >
               <MosqueIcon size={24} />
            </button>
            <button className="p-2 rounded-full hover:bg-white/10 hidden md:block"><Cast size={24} /></button>
            <button onClick={(e) => {
               e.stopPropagation();
               if(currentSong) window.dispatchEvent(new CustomEvent('openSongMenu', { detail: { event: e, song: currentSong } }));
            }} className="p-2 rounded-full hover:bg-white/10"><MoreVertical size={24} /></button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row w-full max-w-[1600px] mx-auto overflow-y-auto md:overflow-hidden hide-scrollbar">
          
          <div className="flex-1 min-w-0 flex flex-col h-full px-6 md:px-12 lg:px-20 pt-4 pb-6">
            
            <div className="flex-1 min-h-0 flex items-center justify-center w-full mx-auto relative p-2 md:p-8">
               <div className={`relative bg-black shadow-2xl rounded-2xl overflow-hidden transition-all duration-500 flex items-center justify-center w-full h-full ${mediaMode === 'audio' ? 'aspect-square max-h-[45vh] md:max-h-[500px]' : 'aspect-video max-w-5xl max-h-full'}`}>
                 
                 <iframe
                   ref={iframeRef} onLoad={handleIframeLoad}
                   width="100%" height="100%"
                   src={currentSong?.id && mediaMode === 'video' ? `https://www.youtube.com/embed/${currentSong.id}?autoplay=1&mute=0&controls=0&disablekb=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&playsinline=1&enablejsapi=1&origin=${window.location.origin}` : ''}
                   title="YouTube Video" frameBorder="0"
                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                   className={`absolute inset-0 w-full h-full pointer-events-auto transition-opacity duration-300 z-10 ${mediaMode === 'video' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                 ></iframe>

                 <div className={`absolute inset-0 bg-zinc-900 flex items-center justify-center z-20 transition-opacity duration-300 ${mediaMode === 'audio' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                     {currentSong?.image && <img loading="lazy" src={currentSong.image} className="w-full h-full object-cover opacity-10 absolute inset-0" alt="bg" />}
                     {currentSong?.image ? (
                       <img loading="lazy" src={currentSong.image} className="w-full h-full object-cover shadow-2xl z-30" alt="cover" />
                     ) : (
                       <div className="w-full h-full shadow-2xl z-30 bg-white/5 flex items-center justify-center text-zinc-500">
                         <Music size={64} />
                       </div>
                     )}
                     
                     {isBuffering && mediaMode === 'audio' && (
                         <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-40 rounded-2xl">
                             <Loader2 className="animate-spin text-white w-12 h-12 mb-2" />
                             <p className="text-sm font-bold text-white tracking-widest uppercase mt-2">Menyiapkan Audio...</p>
                         </div>
                     )}
                 </div>
                 
                 <div onClick={handleTogglePlayLocal} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 cursor-pointer">
                   {isPlaying ? <Pause fill="white" size={64} /> : <Play className="ml-2" fill="white" size={64} />}
                 </div>
               </div>
            </div>

            <div className="shrink-0 w-full max-w-3xl mx-auto flex flex-col gap-4 mt-6 md:hidden">
              <div className="flex justify-between items-end px-2">
                <div className="flex-1 pr-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-1">{displayTitle}</h1>
                  <p className="text-base md:text-xl text-zinc-400 line-clamp-1">{displayArtist}</p>
                </div>
                <div className="flex items-center gap-2 text-white pb-1">
                  <button onClick={toggleLike} className={`p-2 md:p-3 rounded-full hover:bg-white/10 transition-colors ${isLiked ? 'text-[#3ea6ff]' : 'text-white'}`}>
                    <Heart fill={isLiked ? "currentColor" : "none"} className="w-6 h-6 md:w-8 md:h-8" />
                  </button>
                </div>
              </div>

              <div className="relative flex items-center pt-2 px-2 h-6 cursor-pointer">
                <input 
                  type="range" min={0} max={duration || 100} value={currentTime} 
                  onMouseDown={() => setIsDragging(true)} onMouseUp={() => setIsDragging(false)} 
                  onTouchStart={() => setIsDragging(true)} onTouchEnd={() => setIsDragging(false)} 
                  onChange={handleSeek} className="w-full h-full bg-transparent appearance-none cursor-pointer z-20 absolute inset-0 opacity-0" 
                />
                <div className="w-full h-1.5 bg-zinc-700 rounded-full pointer-events-none transition-all relative flex items-center">
                  <div className="h-full bg-white rounded-full pointer-events-none relative flex items-center justify-end" style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute -right-1.5 shadow-md z-10 transition-transform duration-200 ${isDragging ? 'scale-150' : 'scale-100'}`}></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between text-xs md:text-sm text-zinc-400 font-medium -mt-1 px-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              <div className="flex items-center justify-between px-2 md:px-12 mt-2">
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    const nextVal = !isShuffle;
                    setIsShuffle(nextVal); 
                    showToast(nextVal ? "Pemutaran acak diaktifkan" : "Pemutaran acak dimatikan");
                  }} 
                  className={`transition-all duration-300 p-2 md:p-3 rounded-full ${isShuffle ? 'bg-[#3ea6ff]/20 text-[#3ea6ff]' : 'text-zinc-400 hover:bg-white/10 hover:text-white'}`}
                >
                  <Shuffle className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <button onClick={handlePrevLocal} className="text-white hover:text-zinc-300 hover:bg-white/10 rounded-full transition-all p-2 md:p-3">
                  <SkipBack fill="currentColor" className="w-7 h-7 md:w-8 md:h-8" />
                </button>
                
                <button onClick={handleTogglePlayLocal} className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 hover:bg-zinc-200 transition-all shadow-xl">
                  {isPlaying ? <Pause fill="currentColor" className="w-6 h-6 md:w-8 md:h-8" /> : <Play className="ml-1 w-6 h-6 md:w-8 md:h-8" fill="currentColor" />}
                </button>
                
                <button onClick={handleNextLocal} className="text-white hover:text-zinc-300 hover:bg-white/10 rounded-full transition-all p-2 md:p-3">
                  <SkipForward fill="currentColor" className="w-7 h-7 md:w-8 md:h-8" />
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    toggleRepeat(); 
                    setTimeout(() => {
                      const m = usePlayerStore.getState().repeatMode;
                      if (m === 'all') showToast("Mengulang semua lagu");
                      else if (m === 'one') showToast("Mengulang lagu ini");
                      else showToast("Pengulangan dimatikan");
                    }, 50);
                  }} 
                  className={`transition-all duration-300 p-2 md:p-3 rounded-full ${repeatMode !== 'off' ? 'bg-[#3ea6ff]/20 text-[#3ea6ff]' : 'text-zinc-400 hover:bg-white/10 hover:text-white'}`}
                >
                  {repeatMode === 'one' ? <Repeat1 className="w-5 h-5 md:w-6 md:h-6" /> : <Repeat className="w-5 h-5 md:w-6 md:h-6" />}
                </button>
              </div>
            </div>

          </div>

          <div className="w-full md:w-[400px] lg:w-[450px] shrink-0 h-[70vh] md:h-full flex flex-col bg-transparent md:border-l border-white/10 mt-8 md:mt-0">
            <div className="flex justify-around items-center pt-4 px-4 border-b border-white/10 shrink-0">
              <button onClick={() => setActiveTab('upnext')} className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 tracking-wider ${activeTab === 'upnext' ? 'text-white border-white' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}>
                BERIKUTNYA
              </button>
              <button onClick={() => setActiveTab('lyrics')} className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 tracking-wider ${activeTab === 'lyrics' ? 'text-white border-white' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}>
                LIRIK
              </button>
              <button onClick={() => setActiveTab('artist')} className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 tracking-wider ${activeTab === 'artist' ? 'text-white border-white' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}>
                TERKAIT
              </button>
            </div>

            <div className="flex-1 min-h-0 relative overflow-y-auto hide-scrollbar">
               
               {activeTab === 'artist' && (
                 <div className="flex flex-col px-6 py-6 animate-in fade-in duration-300">
                    <button 
                       onClick={() => { 
                           setIsExpanded(false); 
                           navigate(`/artist/${encodeURIComponent(displayArtist)}`); 
                       }} 
                       className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-white text-black font-bold mb-8 hover:scale-105 transition-transform shadow-lg"
                    >
                       <User size={20} /> Lihat Profil {displayArtist}
                    </button>
                    
                    <h3 className="text-lg font-bold text-white mb-4">Lagu dari {displayArtist}</h3>
                    
                    <div className="flex flex-col border-t border-white/5 pt-2">
                       {isLoadingRelated ? (
                          <div className="flex flex-col gap-2 animate-pulse mt-2">
                             {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="flex items-center gap-4 py-2 px-3 -mx-3 rounded-lg">
                                   <div className="w-12 h-12 bg-white/10 rounded flex-shrink-0"></div>
                                   <div className="flex-1 flex flex-col gap-2">
                                      <div className="h-4 w-3/4 bg-white/10 rounded"></div>
                                      <div className="h-3 w-1/2 bg-white/5 rounded"></div>
                                   </div>
                                   <div className="w-1 h-5 bg-white/10 rounded"></div>
                                </div>
                             ))}
                          </div>
                       ) : relatedSongs.length > 0 ? (
                          relatedSongs.map((song, idx) => (
                             <div 
                                key={idx} 
                                className="flex items-center gap-4 py-2 px-3 -mx-3 rounded-lg cursor-pointer group hover:bg-white/5 transition-colors" 
                                onClick={(e) => handlePlayClick(e, song, relatedSongs, idx)}
                             >
                                <img loading="lazy" src={song.image} className="w-12 h-12 rounded object-cover opacity-70 group-hover:opacity-100 shadow-md" alt="thumb" />
                                <div className="flex-1 min-w-0">
                                   <p className="text-base font-bold text-white line-clamp-1">{song.title}</p>
                                   <p className="text-sm text-zinc-400 truncate">{song.artist}</p>
                                </div>
                                <button onClick={(e) => {
                                   e.stopPropagation(); e.preventDefault();
                                   window.dispatchEvent(new CustomEvent('openSongMenu', { detail: { event: e, song: song } }));
                                }} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-zinc-400 hover:text-white transition-opacity p-2">
                                   <MoreVertical size={20} />
                                </button>
                             </div>
                          ))
                       ) : (
                          <p className="text-zinc-500 text-sm italic mt-4">Belum ada lagu terkait yang ditemukan.</p>
                       )}
                    </div>
                 </div>
               )}

               {activeTab === 'upnext' && (
                 <div className="flex flex-col px-6 py-6 animate-in fade-in duration-300">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <p className="text-[12px] text-zinc-400 font-medium mb-1">Diputar dari</p>
                        <h3 className="text-xl font-bold text-white leading-none">Antrean Anda</h3>
                      </div>
                      <button className="flex items-center gap-2 bg-white/10 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-white hover:text-black transition-colors">
                        <ListPlus size={18} /> Simpan
                      </button>
                    </div>

                    <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2">
                      <button className="bg-white text-black px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap">Semua</button>
                      <button onClick={() => generateRadioMix(currentSong)} className="bg-white/5 hover:bg-white/10 text-zinc-200 px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors border border-white/10 flex items-center gap-1.5">
                        <Shuffle size={14} /> Mix Artis Ini
                      </button>
                      <button className="bg-white/5 hover:bg-white/10 text-zinc-200 px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors border border-white/10">Musik Populer</button>
                    </div>

                    <div className="flex flex-col border-t border-white/5 pt-2">
                      {queue && queue.length > 0 ? queue.map((qSong, idx) => {
                        const isCurrent = qSong.id === currentSong?.id;
                        return (
                        <div 
                          key={idx} 
                          ref={isCurrent ? activeQueueRef : null} 
                          className={`flex items-center gap-4 py-2 px-3 -mx-3 rounded-lg cursor-pointer group transition-colors ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5'}`} 
                          onClick={(e) => !isCurrent && handleQueuePlay(e, qSong, idx)}
                        >
                          <div className="relative w-12 h-12 md:w-14 md:h-14 flex-shrink-0">
                            <img loading="lazy" src={qSong.image} className={`w-full h-full rounded object-cover ${isCurrent ? '' : 'opacity-70 group-hover:opacity-100'}`} alt="thumb" />
                            <div className={`absolute inset-0 bg-black/50 rounded flex items-center justify-center ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                              {isCurrent && isPlaying ? <Pause fill="white" size={18} /> : <Play className="ml-0.5" fill="white" size={18} />}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-base font-bold line-clamp-1 ${isCurrent ? 'text-white' : 'text-zinc-200'}`}>{qSong.title}</p>
                            <p className="text-zinc-400 text-sm truncate mt-0.5">{qSong.artist}</p>
                          </div>
                          
                          <div className="flex items-center">
                              {isCurrent && (
                                <div className="flex gap-1 items-end h-4 mr-3">
                                  <div className={`eq-bar ${isPlaying ? 'eq-1' : 'h-1'}`}></div>
                                  <div className={`eq-bar ${isPlaying ? 'eq-2' : 'h-1'}`}></div>
                                  <div className={`eq-bar ${isPlaying ? 'eq-3' : 'h-1'}`}></div>
                                </div>
                              )}
                              <button onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.dispatchEvent(new CustomEvent('openSongMenu', { detail: { event: e, song: qSong } }));
                              }} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-zinc-400 hover:text-white transition-opacity p-2">
                                  <MoreVertical size={20} />
                              </button>
                          </div>
                        </div>
                      )}) : (
                        <p className="text-zinc-400 text-center mt-10 text-sm italic">Tidak ada antrean.</p>
                      )}
                    </div>
                 </div>
               )}

               {activeTab === 'lyrics' && (
                 <div className="flex flex-col min-h-full animate-in fade-in duration-300">
                    {lyrics.length > 0 && !isLoadingLyrics && (
                      <div className="sticky top-0 z-20 bg-[#121212] px-6 py-4 flex flex-col gap-4 border-b border-white/10 shadow-2xl">
                        <div className="flex justify-between items-center">
                          <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                            <button onClick={() => setLyricsMode('synced')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all uppercase tracking-wider ${lyricsMode === 'synced' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>Running</button>
                            <button onClick={() => setLyricsMode('full')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all uppercase tracking-wider ${lyricsMode === 'full' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>Full Text</button>
                          </div>
                          {lyricsMode === 'synced' && (
                            <button onClick={() => setIsSyncMode(!isSyncMode)} className={`p-2 rounded-full border transition-all ${isSyncMode ? 'bg-red-500/90 border-red-400 animate-pulse text-white' : 'bg-[#2a2a2a] border-white/10 text-zinc-400 hover:text-white'}`} title="Mode Kalibrasi">
                              <Target size={16} />
                            </button>
                          )}
                        </div>
                        
                        {lyricsMode === 'synced' && (
                          <div className="flex items-center gap-2 bg-[#2a2a2a] px-3 py-1.5 md:py-2 rounded-full border border-white/10">
                            <span className="text-[10px] font-bold text-zinc-400 mr-1 hidden md:block">SYNC:</span>
                            
                            <button onClick={() => setLyricOffset(prev => Math.max(-100, prev - 0.5))} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                              <Minus size={14} />
                            </button>
                            
                            <input type="range" min="-100" max="100" step="0.5" value={lyricOffset} onChange={(e) => setLyricOffset(parseFloat(e.target.value))} className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                            
                            <button onClick={() => setLyricOffset(prev => Math.min(100, prev + 0.5))} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                              <Plus size={14} />
                            </button>
                            
                            <span className="text-xs font-mono text-zinc-300 w-12 text-right">
                              {lyricOffset > 0 ? `+${lyricOffset.toFixed(1)}` : lyricOffset.toFixed(1)}s
                            </span>
                          </div>
                        )}
                        
                      </div>
                    )}

                    {isLoadingLyrics ? (
                      <div className="flex-1 flex items-center justify-center text-zinc-400 font-medium">Mencari lirik...</div>
                    ) : lyrics.length > 0 ? (
                      lyricsMode === 'synced' ? (
                        <div ref={lyricsContainerRef} className="flex-1 overflow-y-auto pb-[50vh] pt-[10vh] px-6 md:px-10 hide-scrollbar text-left md:text-center" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}>
                          {lyrics.map((line, index) => (
                            <div key={index} className={`text-xl md:text-3xl font-bold mb-6 md:mb-8 transition-all duration-300 cursor-pointer ${isSyncMode ? 'hover:text-[#3ea6ff] text-zinc-500' : index === activeLyricIndex ? 'text-white scale-105 drop-shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                              onClick={(e) => { e.stopPropagation(); if (isSyncMode) { setLyricOffset(currentTime - line.time); setIsSyncMode(false); } else { handleSeek({ target: { value: line.time + lyricOffset } }); } }}>
                              {line.text}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto pb-[20vh] pt-[4vh] px-8 text-left hide-scrollbar">
                          <div className="flex flex-col gap-4">
                            {lyrics.map((line, idx) => (
                              <p key={idx} className="text-base md:text-xl text-zinc-300 font-medium hover:text-white transition-colors">{line.text}</p>
                            ))}
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 px-8 text-center pb-20 mt-20">
                        <Mic2 size={40} className="mb-4 opacity-20" />
                        <h3 className="text-lg font-bold text-zinc-300 mb-2">Lirik Belum Tersedia</h3>
                        <p className="text-sm">Lirik lagu "{displayTitle}" belum terdaftar di database.</p>
                      </div>
                    )}
                 </div>
               )}
            </div>
          </div>
          
        </div>
      </div>
      
      <style>{`
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        html, body {
          background-color: #0f0f0f;
          overscroll-behavior-y: none;
        }
        
        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } 

        /* 🔥 JURUS OPTIMASI 4: CSS SCROLL MULUS 🔥 */
        .smooth-scroll {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          will-change: transform, scroll-position;
        }
        
        @keyframes eq {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        .eq-bar {
          width: 3px;
          background-color: white;
          border-radius: 2px;
          transition: height 0.2s ease;
        }
        .eq-1 { animation: eq 0.9s ease-in-out infinite; }
        .eq-2 { animation: eq 0.9s ease-in-out infinite 0.3s; }
        .eq-3 { animation: eq 0.9s ease-in-out infinite 0.6s; }
      `}</style>
    </div>
  );
}

// 🔥 PINTU GERBANG VIP (LOGIN SCREEN) 🔥
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('rnc_vip_access') === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    
    const date = new Date();
    const dailyCode = `rnc${date.getDate()}${date.getMonth() + 1}`;

    const validCodes = [
      dailyCode,         
      'budi15k',         
      'aseplunas',       
      'tamuVVIP2024'     
    ];

    if (validCodes.includes(password.toLowerCase().trim())) {
      localStorage.setItem('rnc_vip_access', 'true');
      setIsAuthenticated(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  if (isAuthenticated) {
    return <MainApp />;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[#13151f] via-[#0f0f0f] to-[#000000] flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
      
      {/* 🔥 JURUS FAKE GLASS: LOGIN PANEL 🔥 */}
      <div className="bg-[#181818] bg-gradient-to-br from-white/5 to-transparent p-6 md:p-10 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-white/10 w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500 text-center">
        <div className="w-20 h-20 mx-auto bg-black rounded-full mb-4 p-1 border-2 border-[#3ea6ff] shadow-[0_0_20px_rgba(62,166,255,0.4)]">
          <img loading="lazy" src="/rnctech.jpg" alt="Logo" className="w-full h-full rounded-full object-cover" />
        </div>
        
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">RnCmusic <span className="text-[#3ea6ff]">VIP</span></h1>
        <p className="text-zinc-400 text-sm mb-6">Masukkan kode akses premium untuk mulai mendengarkan musik tanpa batas & tanpa iklan.</p>

        {/* 🔥 KOTAK INFO PEMBAYARAN DANA & IG 🔥 */}
        <div className="bg-[#3ea6ff]/10 border border-[#3ea6ff]/20 rounded-xl p-4 mb-6 text-left shadow-inner">
          <p className="font-bold text-white text-sm mb-2 flex items-center gap-2">
            <span className="bg-[#3ea6ff] text-black text-[10px] px-2 py-0.5 rounded-sm uppercase tracking-widest">Info</span>
            Belum punya kode akses?
          </p>
          <ul className="text-xs md:text-sm text-zinc-300 space-y-2 list-disc pl-4 marker:text-[#3ea6ff]">
            <li>Transfer <b className="text-[#3ea6ff]">Rp 15.000</b> via DANA ke nomor: <br/><span className="text-white tracking-widest font-mono text-base bg-black/50 px-2 py-1 rounded inline-block mt-1">085716827409</span></li>
            <li>Kirim bukti transfer via DM ke Instagram <a href="https://instagram.com/rizal8813" target="_blank" rel="noreferrer" className="text-[#3ea6ff] font-bold hover:underline">@rizal8813</a> untuk mendapatkan kode hari ini.</li>
          </ul>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="relative">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan Kode Akses..." 
              className={`w-full bg-black/50 border ${error ? 'border-red-500' : 'border-white/20 focus:border-[#3ea6ff]'} rounded-xl px-5 py-4 text-white placeholder:text-zinc-600 outline-none transition-all text-center tracking-widest font-bold`}
            />
            {error && <p className="text-red-500 text-xs font-bold mt-2 absolute -bottom-5 left-0 right-0 animate-bounce">❌ Kode Akses Salah / Kedaluwarsa!</p>}
          </div>
          
          <button 
            type="submit" 
            className="w-full mt-4 bg-[#3ea6ff] hover:bg-[#2c8cdb] text-black font-black py-4 rounded-xl transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(62,166,255,0.3)] uppercase tracking-wider"
          >
            Buka Akses
          </button>
        </form>

        <p className="mt-8 text-[10px] text-zinc-600 uppercase font-bold tracking-widest">
          Build for personal use • No Ads
        </p>
      </div>
    </div>
  );
}
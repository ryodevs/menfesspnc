// ============================================================
// 🔑 KONFIGURASI
// ============================================================
const SUPABASE_URL = "https://vtwcjyyjzvyznezzbydq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0d2NqeXlqenZ5em5lenpieWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk5OTY0MiwiZXhwIjoyMDkyNTc1NjQyfQ.Dj_KHV7P1cetGzHCVdGmECVnBFwA3eA80BTfqNmw9xI";
const SOUNDCLOUD_API_URL = "https://kaizenapi.my.id/api/downloader/soundcloud";

// ============================================================
// 📦 VARIABEL GLOBAL
// ============================================================
let posts = [];
let comments = {};
let currentMoodMenf = '';
let menfAnonState = true;
let songAnonState = true;
let openCommentPostId = null;
let toastTimer;
let selectedSongData = null;
let currentAudio = null;
let activePlayButton = null;
let isUploading = false;

// ============================================================
// 📡 FUNGSI DATABASE
// ============================================================
async function loadPosts() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/posts?select=*&order=created_at.desc`, {
            headers: { 
                "apikey": SUPABASE_ANON_KEY, 
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}` 
            }
        });
        if (!response.ok) throw new Error("Gagal load data");
        const data = await response.json();
        posts = data;
        await loadAllComments();
        renderFeed();
        updateFeedCount();
    } catch (error) {
        console.error(error);
        showToast("Gagal load data", "fas fa-exclamation-circle");
    }
}

async function loadAllComments() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/comments?order=created_at.asc`, {
            headers: { 
                "apikey": SUPABASE_ANON_KEY, 
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}` 
            }
        });
        if (!response.ok) throw new Error("Gagal load comments");
        const data = await response.json();
        comments = {};
        data.forEach(comment => {
            if (!comments[comment.post_id]) comments[comment.post_id] = [];
            comments[comment.post_id].push(comment);
        });
    } catch (error) {
        console.error(error);
    }
}

async function saveComment(postId, commentText, fromUser) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "apikey": SUPABASE_ANON_KEY, 
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}` 
            },
            body: JSON.stringify({ 
                post_id: postId, 
                comment: commentText, 
                from_user: fromUser 
            })
        });
        if (!response.ok) throw new Error("Gagal simpan komentar");
        
        const currentCount = posts.find(p => p.id === postId)?.comment_count || 0;
        await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${postId}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json", 
                "apikey": SUPABASE_ANON_KEY, 
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}` 
            },
            body: JSON.stringify({ comment_count: currentCount + 1 })
        });
        
        showToast("Komentar terkirim!", "fas fa-check-circle");
        await loadPosts();
        return true;
    } catch (error) {
        console.error(error);
        showToast("Gagal kirim komentar", "fas fa-exclamation-circle");
        return false;
    }
}

async function savePost(post) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "apikey": SUPABASE_ANON_KEY, 
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}` 
            },
            body: JSON.stringify({ ...post, comment_count: 0 })
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            throw new Error("Gagal simpan");
        }
        showToast("Berhasil disimpan!", "fas fa-check-circle");
        await loadPosts();
        return true;
    } catch (error) {
        console.error(error);
        showToast("Gagal menyimpan", "fas fa-exclamation-circle");
        return false;
    }
}

async function updateReactions(id, reactions) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${id}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json", 
                "apikey": SUPABASE_ANON_KEY, 
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}` 
            },
            body: JSON.stringify({ reactions: reactions })
        });
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

// ============================================================
// 🎨 FUNGSI BANTUAN UI
// ============================================================
function formatTime(createdAt) {
    if (!createdAt) return "Baru saja";
    const date = new Date(createdAt);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff} detik lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function escapeHtml(str) { 
    if (!str) return ''; 
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\n/g, '<br>'); 
}

function showToast(msg, icon = 'fas fa-check-circle') {
    const toast = document.getElementById('globalToast');
    const iconEl = toast.querySelector('i');
    const textSpan = document.getElementById('toastText');
    
    iconEl.className = icon;
    textSpan.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(page + 'Page').classList.add('active-page');
    document.querySelector(`.nav-item[data-nav="${page}"]`).classList.add('active');
    if (page === 'feed') renderFeed();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateFeedCount() {
    document.getElementById('feedCountBadge').textContent = posts.length + ' postingan';
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// ============================================================
// 🎵 FUNGSI UPLOAD KE SUPABASE STORAGE
// ============================================================
async function uploadToStorage(streamUrl, title) {
    if (isUploading) return null;
    
    isUploading = true;
    
    try {
        const response = await fetch(streamUrl);
        if (!response.ok) throw new Error("Gagal download");
        
        const blob = await response.blob();
        const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        const fileName = `${Date.now()}_${safeTitle}.mp3`;
        
        const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/songs/${fileName}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: blob
        });
        
        if (!uploadResponse.ok) throw new Error("Gagal upload");
        
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/songs/${fileName}`;
        return publicUrl;
        
    } catch (error) {
        console.error("Upload error:", error);
        return null;
    } finally {
        isUploading = false;
    }
}

// ============================================================
// 🎵 FUNGSI SOUNDCLOUD
// ============================================================
async function searchSoundCloud(query) {
    try {
        showToast(`Mencari "${query}"...`, 'fas fa-circle-notch fa-spin');
        
        const response = await fetch(`${SOUNDCLOUD_API_URL}?query=${encodeURIComponent(query)}`, {
            headers: { "accept": "application/json" }
        });
        
        if (!response.ok) throw new Error("Gagal mencari lagu");
        
        const data = await response.json();
        
        if (!data.status || !data.result || data.result.length === 0) {
            throw new Error("Lagu tidak ditemukan");
        }
        
        return data.result;
    } catch (error) {
        console.error(error);
        showToast(`Gagal mencari: ${error.message}`, 'fas fa-exclamation-circle');
        return [];
    }
}

function showSongSelectionModal(songs, query) {
    const modal = document.createElement('div');
    modal.id = 'songSelectionModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        backdrop-filter: blur(8px);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.2s ease;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        max-width: 500px;
        width: 100%;
        max-height: 80vh;
        background: white;
        border-radius: 24px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;
    
    modalContent.innerHTML = `
        <div style="padding: 16px 20px; background: linear-gradient(135deg, #2563eb, #0891b2); color: white;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 1.1rem;">
                    <i class="fas fa-headphones"></i> Pilih Lagu
                </h3>
                <button id="closeModalBtn" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            <p style="margin: 5px 0 0; font-size: 0.75rem; opacity: 0.9;">Hasil pencarian: "${query}"</p>
        </div>
        <div id="songListContainer" style="overflow-y: auto; padding: 16px;">
            ${songs.map((song, index) => {
                const permalink = song.url || song.permalink_url || song.link || song.permalink;
                return `
                <div class="song-search-item" data-index="${index}" style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    margin-bottom: 10px;
                    background: #eef0f7;
                    border-radius: 16px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid #dde1ef;
                ">
                    <img src="${song.artwork}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/50?text=No+Image'">
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 0.85rem; color: #1e1e2e;">${escapeHtml(song.title)}</div>
                        <div style="font-size: 0.7rem; color: #64748b;">${escapeHtml(song.artist)}</div>
                        <div style="font-size: 0.6rem; color: #64748b; margin-top: 4px;">
                            <i class="fas fa-play"></i> ${formatDuration(song.duration_seconds)} &nbsp;|&nbsp;
                            <i class="fas fa-headphones"></i> ${formatNumber(song.plays)}
                        </div>
                    </div>
                    <button class="preview-song-btn" data-url="${song.stream_url}" data-title="${escapeHtml(song.title)}" data-artist="${escapeHtml(song.artist)}" data-permalink="${permalink}" style="
                        background: linear-gradient(135deg, #2563eb, #0891b2);
                        border: none;
                        color: white;
                        padding: 8px 12px;
                        border-radius: 40px;
                        font-size: 0.7rem;
                        cursor: pointer;
                    ">
                        <i class="fas fa-play"></i> Preview
                    </button>
                </div>
            `}).join('')}
        </div>
        <div style="padding: 12px 16px; border-top: 1px solid #dde1ef; display: flex; gap: 10px;">
            <button id="cancelSelectSong" style="flex: 1; padding: 10px; border-radius: 40px; border: 1px solid #dde1ef; background: white; cursor: pointer;">Batal</button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    const closeModal = () => modal.remove();
    
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('cancelSelectSong')?.addEventListener('click', closeModal);
    
    document.querySelectorAll('.song-search-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('preview-song-btn')) return;
            const index = parseInt(item.dataset.index);
            const song = songs[index];
            selectSong(song);
            closeModal();
        });
    });
    
    document.querySelectorAll('.preview-song-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const streamUrl = btn.dataset.url;
            const title = btn.dataset.title;
            const artist = btn.dataset.artist;
            const permalink = btn.dataset.permalink;
            playStreamUrl(streamUrl, title, artist, btn, permalink);
        });
    });
    
    if (!document.querySelector('#modalAnimStyle')) {
        const style = document.createElement('style');
        style.id = 'modalAnimStyle';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

function selectSong(song) {
    const permalink = song.url || song.permalink_url || song.link || song.permalink;
    
    selectedSongData = {
        title: song.title,
        artist: song.artist,
        stream_url: song.stream_url,
        artwork: song.artwork,
        duration_seconds: song.duration_seconds,
        permalink_url: permalink
    };
    
    document.getElementById('songTitle').value = song.title;
    document.getElementById('songArtist').value = song.artist;
    
    showToast(`Lagu "${song.title}" dipilih!`, 'fas fa-check-circle');
}

async function playStreamUrl(streamUrl, title, artist, buttonElement = null, permalinkUrl = null) {
    let finalStreamUrl = streamUrl;
    
    if (permalinkUrl) {
        try {
            const response = await fetch(`${SOUNDCLOUD_API_URL}?url=${encodeURIComponent(permalinkUrl)}`, {
                headers: { "accept": "application/json" }
            });
            const data = await response.json();
            if (data.status && data.result && data.result.stream_url) {
                finalStreamUrl = data.result.stream_url;
            }
        } catch (error) {
            console.error("Gagal refresh stream:", error);
        }
    }
    
    if (!finalStreamUrl) {
        showToast("Stream URL tidak tersedia", "fas fa-exclamation-circle");
        return;
    }
    
    if (currentAudio && !currentAudio.paused && currentAudio.src === finalStreamUrl) {
        currentAudio.pause();
        if (activePlayButton) {
            activePlayButton.innerHTML = '<i class="fas fa-play"></i> Putar';
        }
        activePlayButton = null;
        showToast(`⏸️ Dipause: ${title}`, 'fas fa-pause');
        return;
    }
    
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.remove();
        if (activePlayButton) {
            activePlayButton.innerHTML = '<i class="fas fa-play"></i> Putar';
        }
        currentAudio = null;
    }
    
    const audio = new Audio(finalStreamUrl);
    audio.autoplay = true;
    currentAudio = audio;
    
    if (buttonElement) {
        buttonElement.innerHTML = '<i class="fas fa-pause"></i> Pause';
        activePlayButton = buttonElement;
    }
    
    audio.addEventListener('ended', () => {
        audio.remove();
        if (currentAudio === audio) currentAudio = null;
        if (activePlayButton) {
            activePlayButton.innerHTML = '<i class="fas fa-play"></i> Putar';
            activePlayButton = null;
        }
    });
    
    audio.addEventListener('error', (e) => {
        console.error("Audio error:", e);
        showToast("Gagal memutar lagu", "fas fa-exclamation-circle");
        audio.remove();
        if (currentAudio === audio) currentAudio = null;
        if (activePlayButton) {
            activePlayButton.innerHTML = '<i class="fas fa-play"></i> Putar';
            activePlayButton = null;
        }
    });
    
    document.body.appendChild(audio);
    showToast(`🎵 Memutar: ${title}`, 'fas fa-play');
}

function playDirectUrl(streamUrl, title, artist, buttonElement = null) {
    if (!streamUrl) {
        showToast("Stream URL tidak tersedia", "fas fa-exclamation-circle");
        return;
    }
    
    if (currentAudio && !currentAudio.paused && currentAudio.src === streamUrl) {
        currentAudio.pause();
        if (activePlayButton) {
            activePlayButton.innerHTML = '<i class="fas fa-play"></i> Putar';
        }
        activePlayButton = null;
        showToast(`⏸️ Dipause: ${title}`, 'fas fa-pause');
        return;
    }
    
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.remove();
        if (activePlayButton) {
            activePlayButton.innerHTML = '<i class="fas fa-play"></i> Putar';
        }
        currentAudio = null;
    }
    
    const audio = new Audio(streamUrl);
    audio.autoplay = true;
    currentAudio = audio;
    
    if (buttonElement) {
        buttonElement.innerHTML = '<i class="fas fa-pause"></i> Pause';
        activePlayButton = buttonElement;
    }
    
    audio.addEventListener('ended', () => {
        audio.remove();
        if (currentAudio === audio) currentAudio = null;
        if (activePlayButton) {
            activePlayButton.innerHTML = '<i class="fas fa-play"></i> Putar';
            activePlayButton = null;
        }
    });
    
    audio.addEventListener('error', (e) => {
        console.error("Audio error:", e);
        showToast("Gagal memutar lagu", "fas fa-exclamation-circle");
        audio.remove();
        if (currentAudio === audio) currentAudio = null;
        if (activePlayButton) {
            activePlayButton.innerHTML = '<i class="fas fa-play"></i> Putar';
            activePlayButton = null;
        }
    });
    
    document.body.appendChild(audio);
    showToast(`🎵 Memutar: ${title}`, 'fas fa-play');
}

function playSongFromPost(post, buttonElement = null) {
    if (!post.soundcloud_data || !post.soundcloud_data.stream_url) {
        showToast("Data lagu tidak tersedia", "fas fa-exclamation-circle");
        return;
    }
    
    const streamUrl = post.soundcloud_data.stream_url;
    const title = post.title;
    const artist = post.artist;
    const isUploaded = post.soundcloud_data.is_uploaded;
    const permalinkUrl = post.soundcloud_data.permalink_url;
    
    if (isUploaded) {
        playDirectUrl(streamUrl, title, artist, buttonElement);
    } else {
        playStreamUrl(streamUrl, title, artist, buttonElement, permalinkUrl);
    }
}

function playSongFromPostId(postId, buttonElement) {
    const post = posts.find(p => p.id === postId);
    if (post) {
        playSongFromPost(post, buttonElement);
    } else {
        showToast("Postingan tidak ditemukan", "fas fa-exclamation-circle");
    }
}

// ============================================================
// 💬 FUNGSI KOMENTAR
// ============================================================
function toggleComments(postId) {
    openCommentPostId = openCommentPostId === postId ? null : postId;
    renderFeed();
}

async function submitComment(postId) {
    const input = document.getElementById(`commentInput_${postId}`);
    const commentText = input.value.trim();
    if (!commentText) { 
        showToast("Tulis komentar dulu!", "fas fa-exclamation-circle"); 
        return; 
    }
    await saveComment(postId, commentText, "Anonim");
    input.value = '';
    openCommentPostId = postId;
    await loadPosts();
}

function renderCommentSection(postId, commentCount) {
    const postComments = comments[postId] || [];
    const isCommentOpen = openCommentPostId === postId;
    let commentsHtml = '';
    
    if (isCommentOpen) {
        commentsHtml = `
            <div class="comment-list">
                ${postComments.map(c => `
                    <div class="comment-item">
                        <div class="comment-header">
                            <span class="comment-name">${escapeHtml(c.from_user)}</span>
                            <span>${formatTime(c.created_at)}</span>
                        </div>
                        <div class="comment-text">${escapeHtml(c.comment)}</div>
                    </div>
                `).join('')}
                ${postComments.length === 0 ? '<div style="text-align:center; padding:12px; color:#64748b; font-size:0.7rem;">Belum ada komentar. Jadi yang pertama!</div>' : ''}
            </div>
            <div class="comment-input-area">
                <input type="text" class="comment-input" id="commentInput_${postId}" placeholder="Tulis komentar anonim...">
                <button class="comment-submit" onclick="submitComment(${postId})"><i class="fas fa-paper-plane"></i></button>
            </div>
        `;
    }
    
    return `
        <div class="comments-section">
            <button class="comment-btn" onclick="toggleComments(${postId})">
                <i class="fas fa-comment"></i> Komentar (${commentCount || 0})
            </button>
            ${commentsHtml}
        </div>
    `;
}

// ============================================================
// 📝 RENDER FEED
// ============================================================
function renderFeed() {
    const list = document.getElementById('feedList');
    updateFeedCount();
    
    if (!posts.length) { 
        list.innerHTML = '<div class="empty-feed"><i class="fas fa-inbox"></i><p>Belum ada suara.<br>Yuk kirim menfess atau request lagu pertama!</p></div>'; 
        return; 
    }
    
    list.innerHTML = posts.map((post) => {
        const reacts = post.reactions || { '❤️': 0, '💬': 0, '🎧': 0 };
        const timeDisplay = formatTime(post.created_at);
        const commentCount = post.comment_count || 0;
        
        if (post.type === 'menfes') {
            return `
                <div class="post-card" data-id="${post.id}">
                    <div class="badge-type"><i class="fas fa-envelope"></i> Menfess PNC</div>
                    <div class="post-meta">
                        <span class="sender"><i class="fas fa-user-secret"></i> ${escapeHtml(post.from)}${post.to ? ` → <strong>${escapeHtml(post.to)}</strong>` : ''}</span>
                        <span class="post-time">${timeDisplay}</span>
                    </div>
                    <div class="message-text">${escapeHtml(post.msg)}</div>
                    ${post.mood ? `<div><span class="mood-tag">${post.mood}</span></div>` : ''}
                    <div class="reaction-row">
                        <button class="reaction" data-emoji="❤️">❤️ ${reacts['❤️'] || 0}</button>
                        <button class="reaction" data-emoji="💬">💬 ${reacts['💬'] || 0}</button>
                        <button class="reaction" data-emoji="🎧">🎧 ${reacts['🎧'] || 0}</button>
                    </div>
                    ${renderCommentSection(post.id, commentCount)}
                </div>
            `;
        } else {
            const hasSoundCloud = post.soundcloud_data && post.soundcloud_data.stream_url;
            const artwork = hasSoundCloud && post.soundcloud_data.artwork ? post.soundcloud_data.artwork : null;
            
            return `
                <div class="post-card" data-id="${post.id}">
                    <div class="badge-type badge-song"><i class="fas fa-music"></i> Songfess PNC</div>
                    <div class="post-meta">
                        <span class="sender"><i class="fas fa-user-secret"></i> ${escapeHtml(post.from)}${post.to ? ` → <strong>${escapeHtml(post.to)}</strong>` : ''}</span>
                        <span class="post-time">${timeDisplay}</span>
                    </div>
                    <div class="song-preview">
                        <div class="song-info">
                            ${artwork ? 
                                `<img src="${artwork}" style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover;">` :
                                `<div class="song-icon-wrap"><i class="fas fa-music"></i></div>`
                            }
                            <div>
                                <div class="song-title-text">${escapeHtml(post.title)}</div>
                                ${post.artist ? `<div class="song-artist-text">${escapeHtml(post.artist)}</div>` : ''}
                            </div>
                        </div>
                        <button class="btn-play" onclick="playSongFromPostId(${post.id}, this)">
                            <i class="fas fa-play"></i> Putar
                        </button>
                    </div>
                    ${post.msg ? `<div class="message-text" style="font-size:0.8rem; color:#64748b;">"${escapeHtml(post.msg)}"</div>` : ''}
                    <div class="reaction-row">
                        <button class="reaction" data-emoji="❤️">❤️ ${reacts['❤️'] || 0}</button>
                        <button class="reaction" data-emoji="💬">💬 ${reacts['💬'] || 0}</button>
                        <button class="reaction" data-emoji="🎧">🎧 ${reacts['🎧'] || 0}</button>
                    </div>
                    ${renderCommentSection(post.id, commentCount)}
                </div>
            `;
        }
    }).join('');
    
    document.querySelectorAll('.reaction').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const card = btn.closest('.post-card');
            const id = parseInt(card.dataset.id);
            const emoji = btn.dataset.emoji;
            const post = posts.find(p => p.id === id);
            if (post) {
                const newReactions = { ...post.reactions };
                newReactions[emoji] = (newReactions[emoji] || 0) + 1;
                await updateReactions(id, newReactions);
                await loadPosts();
            }
        });
    });
}

// ============================================================
// 🎛️ INITIALISASI & EVENT LISTENERS
// ============================================================
function initToggle(toggleId, nameWrapId, stateRef, setStateFn) {
    const toggle = document.getElementById(toggleId);
    toggle.addEventListener('click', () => {
        const newState = !stateRef();
        setStateFn(newState);
        toggle.classList.toggle('on', newState);
        document.getElementById(nameWrapId).style.display = newState ? 'none' : 'block';
    });
}

function setupCounter(inputId, counterId, max) {
    const el = document.getElementById(inputId);
    const out = document.getElementById(counterId);
    el.addEventListener('input', () => out.textContent = `${el.value.length}/${max}`);
}

function addSearchButton() {
    const songTitleField = document.getElementById('songTitle').parentElement;
    
    if (document.getElementById('searchSoundCloudBtn')) return;
    
    const searchBtn = document.createElement('button');
    searchBtn.id = 'searchSoundCloudBtn';
    searchBtn.innerHTML = '<i class="fas fa-search"></i> Cari Lagu';
    searchBtn.style.cssText = `
        margin-top: 8px;
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 40px;
        font-size: 0.75rem;
        cursor: pointer;
        width: 100%;
        font-weight: 600;
        transition: all 0.2s;
    `;
    
    searchBtn.onmouseover = () => {
        searchBtn.style.transform = 'translateY(-1px)';
        searchBtn.style.boxShadow = '0 4px 12px rgba(37,99,235,0.3)';
    };
    searchBtn.onmouseout = () => {
        searchBtn.style.transform = 'translateY(0)';
        searchBtn.style.boxShadow = 'none';
    };
    
    searchBtn.onclick = async () => {
        const query = document.getElementById('songTitle').value.trim();
        if (!query) {
            showToast('Masukkan judul lagu terlebih dahulu!', 'fas fa-exclamation-circle');
            return;
        }
        
        const results = await searchSoundCloud(query);
        if (results.length > 0) {
            showSongSelectionModal(results, query);
        } else {
            showToast('Lagu tidak ditemukan', 'fas fa-exclamation-circle');
        }
    };
    
    songTitleField.appendChild(searchBtn);
}

// Initialize toggles
initToggle('menfAnonToggle', 'menfNameWrap', () => menfAnonState, (v) => menfAnonState = v);
initToggle('songAnonToggle', 'songNameWrap', () => songAnonState, (v) => songAnonState = v);

// Mood chips selection
document.querySelectorAll('#moodContainerMenf .mood-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('#moodContainerMenf .mood-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        currentMoodMenf = chip.dataset.mood;
    });
});

// Character counters
setupCounter('menfMsg', 'menfChar', 500);
setupCounter('songMsgReq', 'songMsgChar', 280);

// ============================================================
// SUBMIT HANDLER MENFESS
// ============================================================
document.getElementById('submitMenfess').addEventListener('click', async () => {
    const submitBtn = document.getElementById('submitMenfess');
    const btnOriginalHtml = submitBtn.innerHTML;
    
    if (submitBtn.disabled) return;
    
    const msg = document.getElementById('menfMsg').value.trim();
    if (!msg) { 
        showToast('Pesan tidak boleh kosong!', 'fas fa-exclamation-circle'); 
        return; 
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Mengirim...';
    
    try {
        const from = menfAnonState ? 'Anonim' : (document.getElementById('menfName').value.trim() || 'Anonim');
        const to = document.getElementById('menfTo').value.trim();
        const mood = currentMoodMenf || '';
        const post = { 
            type: 'menfes', 
            from, 
            to: to || null, 
            msg, 
            mood: mood || null, 
            title: null, 
            artist: null, 
            reactions: { '❤️': 0, '💬': 0, '🎧': 0 } 
        };
        await savePost(post);
        
        document.getElementById('menfMsg').value = ''; 
        document.getElementById('menfTo').value = ''; 
        document.getElementById('menfChar').textContent = '0/500'; 
        document.getElementById('menfName').value = '';
        document.querySelectorAll('#moodContainerMenf .mood-chip').forEach(c => c.classList.remove('selected')); 
        currentMoodMenf = '';
    } catch (error) {
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = btnOriginalHtml;
    }
});

// ============================================================
// SUBMIT HANDLER SONGFESS
// ============================================================
document.getElementById('submitSongfes').addEventListener('click', async () => {
    const submitBtn = document.getElementById('submitSongfes');
    const btnOriginalHtml = submitBtn.innerHTML;
    
    if (submitBtn.disabled) return;
    
    let title = document.getElementById('songTitle').value.trim();
    const artist = document.getElementById('songArtist').value.trim();
    
    if (!title) { 
        showToast('Judul lagu harus diisi!', 'fas fa-exclamation-circle'); 
        return; 
    }
    
    const from = songAnonState ? 'Anonim' : (document.getElementById('songName').value.trim() || 'Anonim');
    const msg = document.getElementById('songMsgReq').value.trim();
    const to = document.getElementById('songTo').value.trim();
    
    // LOADING STATE
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Mengirim...';
    
    try {
        let finalStreamUrl = selectedSongData?.stream_url;
        let isUploaded = false;
        
        if (selectedSongData && selectedSongData.stream_url) {
            const uploadedUrl = await uploadToStorage(selectedSongData.stream_url, title);
            if (uploadedUrl) {
                finalStreamUrl = uploadedUrl;
                isUploaded = true;
            }
        }
        
        const post = { 
            type: 'songfes', 
            from, 
            to: to || null, 
            msg: msg || null, 
            mood: null, 
            title, 
            artist: artist || null, 
            reactions: { '❤️': 0, '💬': 0, '🎧': 0 },
            soundcloud_data: selectedSongData ? {
                stream_url: finalStreamUrl,
                artwork: selectedSongData.artwork,
                duration: selectedSongData.duration_seconds,
                permalink_url: selectedSongData.permalink_url,
                is_uploaded: isUploaded
            } : null
        };
        
        await savePost(post);
        
        document.getElementById('songTitle').value = ''; 
        document.getElementById('songArtist').value = ''; 
        document.getElementById('songMsgReq').value = ''; 
        document.getElementById('songTo').value = ''; 
        document.getElementById('songMsgChar').textContent = '0/280'; 
        document.getElementById('songName').value = '';
        selectedSongData = null;
        
        showToast('Berhasil dikirim!', 'fas fa-check-circle');
        
    } catch (error) {
        console.error(error);
        showToast('Gagal mengirim, coba lagi', 'fas fa-exclamation-circle');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = btnOriginalHtml;
    }
});

// Navigation
document.querySelectorAll('.nav-item').forEach(btn => 
    btn.addEventListener('click', () => navigateTo(btn.dataset.nav))
);

// Add search button when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    addSearchButton();
});

// Make functions globally accessible
window.toggleComments = toggleComments;
window.submitComment = submitComment;
window.playSongFromPostId = playSongFromPostId;

// Initial load
loadPosts();
navigateTo('menfess');
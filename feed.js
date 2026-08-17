// ==================== FEED SYSTEM ====================
let posts = [];
let currentFilter = 'tudo';
let page = 0;
let isLoading = false;
let hasMore = true;
let realtimeChannel = null;

async function loadFeed(reset = true) {
    if (reset) {
        page = 0;
        posts = [];
        hasMore = true;
    }
    
    if (isLoading || !hasMore) return;
    isLoading = true;
    
    const container = document.getElementById('feedContainer');
    if (reset) {
        showLoading(container, 'A carregar publicações...');
    }
    
    try {
        let query = supabase
            .from('posts')
            .select(`
                *,
                profiles!inner(
                    id,
                    username,
                    display_name,
                    avatar_url
                ),
                likes:likes(user_id),
                comments:comments(
                    id,
                    user_id,
                    content,
                    created_at,
                    profiles!inner(
                        username,
                        display_name
                    )
                )
            `)
            .order('created_at', { ascending: false })
            .range(page * CONFIG.PAGE_SIZE, (page + 1) * CONFIG.PAGE_SIZE - 1);
        
        // Aplicar filtros
        if (currentFilter === 'segredos') {
            query = query.eq('category', 'segredos');
        } else if (currentFilter === 'fofocas') {
            query = query.eq('category', 'fofocas');
        } else if (currentFilter === 'desabafos') {
            query = query.eq('category', 'desabafos');
        } else if (currentFilter === 'seguidos') {
            const { data: follows } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', currentUser?.id);
            
            const followedIds = follows?.map(f => f.following_id) || [];
            if (followedIds.length > 0) {
                query = query.in('user_id', followedIds);
            } else {
                query = query.limit(0);
            }
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        if (reset) {
            posts = data || [];
        } else {
            posts = [...posts, ...(data || [])];
        }
        
        hasMore = data && data.length === CONFIG.PAGE_SIZE;
        page++;
        
        renderPosts();
    } catch (error) {
        console.error('Erro ao carregar feed:', error);
        showToast('Erro ao carregar publicações', 'error');
    } finally {
        isLoading = false;
        hideLoading(container);
    }
}

function renderPosts() {
    const container = document.getElementById('feedContainer');
    
    if (posts.length === 0 && page === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox icon"></i>
                <div class="title">Nenhuma publicação encontrada</div>
                <div class="subtitle">Sê o primeiro a desabafar!</div>
                <button onclick="window.location.href='criar-post.html'" 
                        class="btn-primary" style="margin-top:16px;">
                    <i class="fas fa-pen-fancy"></i> Criar publicação
                </button>
            </div>
        `;
        document.getElementById('loadMoreBtn').style.display = 'none';
        return;
    }
    
    let html = posts.map(post => createPostHTML(post)).join('');
    container.innerHTML = html;
    
    document.getElementById('loadMoreBtn').style.display = hasMore ? 'block' : 'none';
}

function createPostHTML(post) {
    const profile = post.profiles || {};
    const displayName = profile.display_name || profile.username || 'Anónimo';
    const avatarColor = getRandomColor(profile.id || displayName);
    const isLiked = post.likes?.some(l => l.user_id === currentUser?.id) || false;
    const comments = post.comments || [];
    const isAdult = post.is_adult || false;
    
    return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-user" onclick="window.location.href='perfil.html?id=${post.user_id}'">
                    <div class="avatar" style="background:${avatarColor}">
                        ${profile.avatar_url ? 
                            `<img src="${profile.avatar_url}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : 
                            displayName.slice(0, 2).toUpperCase()
                        }
                    </div>
                    <span class="username">${displayName}</span>
                    ${post.user_id === currentUser?.id ? '<span class="badge verified">● Você</span>' : ''}
                    <span class="badge category">${post.category || 'desabafo'}</span>
                    ${isAdult ? '<span class="badge adult">🔞 18+</span>' : ''}
                    ${post.is_anonymous ? '<span class="badge anonymous">🕵️ Anónimo</span>' : ''}
                </div>
                <div class="post-actions-header">
                    <span class="post-meta"><i class="far fa-clock"></i> ${formatDate(post.created_at)}</span>
                    <button onclick="togglePostMenu('${post.id}')" class="icon-btn">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
            </div>
            
            <div class="post-content" onclick="window.location.href='post.html?id=${post.id}'">
                ${isAdult ? '<div class="adult-tag">🔞 Conteúdo Adulto</div>' : ''}
                ${post.content}
                ${post.image_url ? `<img src="${post.image_url}" class="post-image" alt="Imagem do post" loading="lazy">` : ''}
            </div>
            
            <div class="post-actions">
                <button onclick="toggleLike('${post.id}')" class="${isLiked ? 'liked' : ''}">
                    <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                    <span class="count" id="likes-${post.id}">${post.likes?.length || 0}</span>
                </button>
                <button onclick="toggleComments('${post.id}')">
                    <i class="far fa-comment"></i>
                    <span class="count">${comments.length}</span>
                </button>
                <button onclick="sharePost('${post.id}')">
                    <i class="fas fa-share-alt"></i>
                </button>
                ${post.user_id === currentUser?.id ? `
                    <button onclick="deletePost('${post.id}')" class="danger">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                ` : ''}
            </div>
            
            <div class="comments-section" id="comments-${post.id}" style="display:none;">
                ${comments.map(comment => `
                    <div class="comment">
                        <div class="comment-avatar">
                            ${comment.profiles?.avatar_url ? 
                                `<img src="${comment.profiles.avatar_url}" alt="${comment.profiles.display_name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : 
                                (comment.profiles?.display_name || '??').slice(0, 2).toUpperCase()
                            }
                        </div>
                        <div class="comment-content">
                            <div class="comment-header">
                                <span class="comment-user">${comment.profiles?.display_name || 'Anónimo'}</span>
                                <span class="comment-time">· ${formatDate(comment.created_at)}</span>
                            </div>
                            <div class="comment-text">${sanitizeHTML(comment.content)}</div>
                        </div>
                    </div>
                `).join('')}
                <div class="comment-input">
                    <input type="text" placeholder="Escreve um comentário..." 
                           id="commentInput-${post.id}" 
                           onkeydown="if(event.key==='Enter') addComment('${post.id}')">
                    <button onclick="addComment('${post.id}')" class="btn-primary">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ==================== INTERAÇÕES ====================
async function toggleLike(postId) {
    if (!currentUser) {
        showToast('Faz login para gostar', 'warning');
        return;
    }
    
    try {
        const existing = await supabase
            .from('likes')
            .select('*')
            .eq('post_id', postId)
            .eq('user_id', currentUser.id)
            .single();
        
        if (existing.data) {
            await supabase
                .from('likes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', currentUser.id);
        } else {
            await supabase
                .from('likes')
                .insert({ 
                    post_id: postId, 
                    user_id: currentUser.id,
                    created_at: new Date().toISOString()
                });
        }
        
        // Atualizar UI
        updateLikeUI(postId, !existing.data);
    } catch (error) {
        console.error('Erro ao alternar like:', error);
        showToast('Erro ao processar like', 'error');
    }
}

function updateLikeUI(postId, liked) {
    const countEl = document.getElementById(`likes-${postId}`);
    if (!countEl) return;
    
    const currentCount = parseInt(countEl.textContent) || 0;
    countEl.textContent = liked ? currentCount + 1 : currentCount - 1;
    
    const btn = document.querySelector(`.post-card[data-post-id="${postId}"] .post-actions button:first-child`);
    if (btn) {
        btn.classList.toggle('liked');
        btn.innerHTML = `
            <i class="${liked ? 'fas' : 'far'} fa-heart"></i>
            <span class="count">${countEl.textContent}</span>
        `;
    }
}

function toggleComments(postId) {
    const section = document.getElementById(`comments-${postId}`);
    if (!section) return;
    
    const isHidden = section.style.display === 'none';
    section.style.display = isHidden ? 'block' : 'none';
    
    if (isHidden) {
        setTimeout(() => {
            const input = document.getElementById(`commentInput-${postId}`);
            if (input) input.focus();
        }, 300);
    }
}

async function addComment(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    if (!input || !input.value.trim()) return;
    
    try {
        const { data, error } = await supabase
            .from('comments')
            .insert({
                post_id: postId,
                user_id: currentUser.id,
                content: input.value.trim(),
                created_at: new Date().toISOString()
            })
            .select(`
                *,
                profiles!inner(
                    username,
                    display_name,
                    avatar_url
                )
            `)
            .single();
        
        if (error) throw error;
        
        input.value = '';
        await loadComments(postId);
        
        // Atualizar contagem
        const countEl = document.querySelector(`.post-card[data-post-id="${postId}"] .post-actions button:nth-child(2) .count`);
        if (countEl) {
            countEl.textContent = parseInt(countEl.textContent) + 1;
        }
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        showToast('Erro ao comentar', 'error');
    }
}

async function loadComments(postId) {
    try {
        const { data, error } = await supabase
            .from('comments')
            .select(`
                *,
                profiles!inner(
                    username,
                    display_name,
                    avatar_url
                )
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        const section = document.getElementById(`comments-${postId}`);
        if (!section) return;
        
        const commentsHtml = data.map(comment => `
            <div class="comment">
                <div class="comment-avatar">
                    ${comment.profiles?.avatar_url ? 
                        `<img src="${comment.profiles.avatar_url}" alt="${comment.profiles.display_name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : 
                        (comment.profiles?.display_name || '??').slice(0, 2).toUpperCase()
                    }
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-user">${comment.profiles?.display_name || 'Anónimo'}</span>
                        <span class="comment-time">· ${formatDate(comment.created_at)}</span>
                    </div>
                    <div class="comment-text">${sanitizeHTML(comment.content)}</div>
                </div>
            </div>
        `).join('');
        
        section.innerHTML = commentsHtml + `
            <div class="comment-input">
                <input type="text" placeholder="Escreve um comentário..." 
                       id="commentInput-${postId}"
                       onkeydown="if(event.key==='Enter') addComment('${postId}')">
                <button onclick="addComment('${postId}')" class="btn-primary">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar comentários:', error);
    }
}

async function deletePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    showModal(
        'Apagar Publicação',
        'Tens a certeza que queres apagar esta publicação? Esta ação não pode ser desfeita.',
        [
            { label: 'Cancelar', onClick: 'this.closest(\'.modal-overlay\').remove()' },
            { label: 'Apagar', primary: true, onClick: `confirmDeletePost('${postId}')` }
        ]
    );
}

async function confirmDeletePost(postId) {
    try {
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        showToast('Publicação apagada ✅', 'success');
        posts = posts.filter(p => p.id !== postId);
        renderPosts();
        
        // Fechar modal
        document.querySelector('.modal-overlay')?.remove();
    } catch (error) {
        console.error('Erro ao apagar post:', error);
        showToast('Erro ao apagar publicação', 'error');
    }
}

function sharePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const text = `${post.content}\n\n📌 Partilhado do Piripiri Chat`;
    const url = `${window.location.origin}/post.html?id=${postId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Publicação no Piripiri Chat',
            text: text,
            url: url
        }).catch(() => {});
    } else {
        const shareData = `${text}\n\n🔗 ${url}`;
        navigator.clipboard.writeText(shareData).then(() => {
            showToast('Copiado para o clipboard 📋', 'success');
        }).catch(() => {
            showToast('Partilha disponível apenas em dispositivos compatíveis', 'warning');
        });
    }
}

// ==================== FILTROS ====================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.feed-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.feed-filters .filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            loadFeed(true);
        });
    });
});

// ==================== CARREGAR MAIS ====================
function loadMorePosts() {
    loadFeed(false);
}

// ==================== REAL-TIME ====================
function setupRealtime() {
    if (realtimeChannel) {
        realtimeChannel.unsubscribe();
    }
    
    realtimeChannel = supabase
        .channel('public:posts')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'posts'
        }, (payload) => {
            if (!posts.some(p => p.id === payload.new.id)) {
                posts.unshift(payload.new);
                renderPosts();
                showToast('Nova publicação 📢', 'info');
            }
        })
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'posts'
        }, (payload) => {
            const index = posts.findIndex(p => p.id === payload.new.id);
            if (index !== -1) {
                posts[index] = payload.new;
                renderPosts();
            }
        })
        .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'posts'
        }, (payload) => {
            posts = posts.filter(p => p.id !== payload.old.id);
            renderPosts();
        })
        .subscribe();
}

// ==================== TEMA ====================
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
    const btn = document.getElementById('themeBtn');
    btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// Aplicar tema salvo
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) === 'dark') {
        document.body.classList.add('dark');
        const btn = document.getElementById('themeBtn');
        if (btn) btn.innerHTML = '<i class="fas fa-sun"></i>';
    }
});


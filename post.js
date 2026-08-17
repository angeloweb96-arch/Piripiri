// ==================== PUBLICAÇÕES ====================
async function getPost(postId) {
    try {
        const { data, error } = await supabase
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
                        display_name,
                        avatar_url
                    )
                )
            `)
            .eq('id', postId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao carregar post:', error);
        return null;
    }
}

async function getPostsByUser(userId, limit = 10) {
    try {
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles!inner(
                    username,
                    display_name,
                    avatar_url
                ),
                likes:likes(user_id)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao carregar posts do utilizador:', error);
        return [];
    }
}

async function getTrendingPosts(limit = 5) {
    try {
        // Posts com mais likes na última semana
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles!inner(
                    username,
                    display_name,
                    avatar_url
                ),
                likes:likes(user_id)
            `)
            .gte('created_at', weekAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(limit * 3);
        
        if (error) throw error;
        
        // Ordenar por número de likes
        return data.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
                   .slice(0, limit);
    } catch (error) {
        console.error('Erro ao carregar posts populares:', error);
        return [];
    }
}

// ==================== POST MENU ====================
function togglePostMenu(postId) {
    const existingMenu = document.querySelector('.post-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }
    
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const menu = document.createElement('div');
    menu.className = 'post-menu';
    menu.style.cssText = `
        position: fixed;
        background: var(--bg-secondary);
        border-radius: var(--radius);
        box-shadow: var(--shadow-lg);
        padding: 8px;
        z-index: 1000;
        min-width: 180px;
        border: 1px solid var(--border-color);
    `;
    
    const options = [
        { icon: 'fa-share-alt', label: 'Partilhar', action: `sharePost('${postId}')` },
        { icon: 'fa-link', label: 'Copiar link', action: `copyPostLink('${postId}')` },
        { icon: 'fa-flag', label: 'Denunciar', action: `reportPost('${postId}')` },
    ];
    
    if (post.user_id === currentUser?.id) {
        options.push({ icon: 'fa-trash-alt', label: 'Apagar', action: `deletePost('${postId}')`, danger: true });
    }
    
    menu.innerHTML = options.map(opt => `
        <button onclick="${opt.action};this.closest('.post-menu').remove()" 
                style="display:flex;align-items:center;gap:10px;padding:8px 12px;width:100%;border:none;background:transparent;cursor:pointer;font-family:'Inter',sans-serif;font-size:0.85rem;color:${opt.danger ? 'var(--danger)' : 'var(--text-primary)'};border-radius:6px;transition:all 0.3s;">
            <i class="fas ${opt.icon}"></i>
            ${opt.label}
        </button>
    `).join('');
    
    // Posicionar próximo ao botão
    const btn = document.querySelector(`.post-card[data-post-id="${postId}"] .post-actions-header .icon-btn`);
    if (btn) {
        const rect = btn.getBoundingClientRect();
        menu.style.top = `${rect.bottom + 8}px`;
        menu.style.right = `${window.innerWidth - rect.right}px`;
    }
    
    document.body.appendChild(menu);
    
    // Fechar ao clicar fora
    document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    });
}

async function copyPostLink(postId) {
    const url = `${window.location.origin}/post.html?id=${postId}`;
    await navigator.clipboard.writeText(url);
    showToast('Link copiado 📋', 'success');
}

async function reportPost(postId) {
    showModal(
        'Denunciar Publicação',
        'Por favor, explica o motivo da denúncia:',
        [
            { label: 'Cancelar', onClick: 'this.closest(\'.modal-overlay\').remove()' },
            { label: 'Enviar Denúncia', primary: true, onClick: `submitReport('${postId}')` }
        ]
    );
}

async function submitReport(postId) {
    const reason = prompt('Motivo da denúncia:');
    if (!reason) return;
    
    try {
        const { error } = await supabase
            .from('reports')
            .insert({
                post_id: postId,
                user_id: currentUser.id,
                reason: reason,
                created_at: new Date().toISOString()
            });
        
        if (error) throw error;
        
        showToast('Denúncia enviada 📨', 'success');
        document.querySelector('.modal-overlay')?.remove();
    } catch (error) {
        console.error('Erro ao enviar denúncia:', error);
        showToast('Erro ao enviar denúncia', 'error');
    }
}


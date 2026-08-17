// ==================== AUTENTICAÇÃO ====================
let currentUser = null;

async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (user) {
            currentUser = user;
            await updateUserProfile(user);
            updateUIForAuthenticated(user);
            return user;
        } else {
            redirectToAuth();
            return null;
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        redirectToAuth();
        return null;
    }
}

async function updateUserProfile(user) {
    // Verificar se o perfil existe
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (error && error.code === 'PGRST116') {
        // Criar perfil se não existir
        await supabase
            .from('profiles')
            .insert({
                id: user.id,
                username: user.user_metadata?.username || `user_${user.id.slice(0, 8)}`,
                display_name: user.user_metadata?.display_name || 'Anónimo',
                avatar_url: user.user_metadata?.avatar_url || null,
                created_at: new Date().toISOString()
            });
    }
}

function updateUIForAuthenticated(user) {
    const displayName = user.user_metadata?.display_name || 
                       user.user_metadata?.username || 
                       user.email?.split('@')[0] || 
                       'Utilizador';
    
    const greeting = document.getElementById('greetingText');
    if (greeting) {
        greeting.textContent = `🌶️ Olá, ${displayName}!`;
    }
    
    // Atualizar estatísticas
    updateStats();
}

async function updateStats() {
    try {
        // Total de posts
        const { count: postsCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true });
        
        // Seguidores
        const { count: followersCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', currentUser?.id);
        
        // Utilizadores online (simulação)
        const onlineCount = Math.floor(Math.random() * 100) + 20;
        
        document.getElementById('totalPostsCount').textContent = postsCount || 0;
        document.getElementById('followersCount').textContent = followersCount || 0;
        document.getElementById('onlineCount').textContent = onlineCount;
    } catch (error) {
        console.error('Erro ao atualizar estatísticas:', error);
    }
}

function redirectToAuth() {
    if (!window.location.pathname.includes('auth.html')) {
        window.location.href = 'auth.html';
    }
}

async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        showToast('Login efetuado com sucesso! 🎉', 'success');
        window.location.href = 'index.html';
        return data;
    } catch (error) {
        showToast(error.message || 'Erro ao fazer login', 'error');
        throw error;
    }
}

async function register(email, password, username, displayName) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                    display_name: displayName || username
                }
            }
        });
        
        if (error) throw error;
        
        if (data.user) {
            // Criar perfil
            await supabase
                .from('profiles')
                .insert({
                    id: data.user.id,
                    username,
                    display_name: displayName || username,
                    created_at: new Date().toISOString()
                });
        }
        
        showToast('Registo efetuado com sucesso! Verifica o teu email 📧', 'success');
        window.location.href = 'auth.html?registered=true';
        return data;
    } catch (error) {
        showToast(error.message || 'Erro ao registar', 'error');
        throw error;
    }
}

async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        showToast('Sessão terminada 👋', 'info');
        window.location.href = 'auth.html';
    } catch (error) {
        showToast('Erro ao terminar sessão', 'error');
        console.error('Erro ao fazer logout:', error);
    }
}

async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`
        });
        
        if (error) throw error;
        
        showToast('Email de recuperação enviado 📧', 'success');
    } catch (error) {
        showToast(error.message || 'Erro ao enviar email', 'error');
        throw error;
    }
}

// ==================== PERFIL DO UTILIZADOR ====================
async function getProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        return null;
    }
}

async function updateProfile(profileData) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', currentUser.id)
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('Perfil atualizado ✅', 'success');
        return data;
    } catch (error) {
        showToast('Erro ao atualizar perfil', 'error');
        throw error;
    }
}

async function uploadAvatar(file) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}/avatar.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
        
        // Atualizar perfil com a nova URL
        await updateProfile({ avatar_url: publicUrl });
        
        showToast('Avatar atualizado ✅', 'success');
        return publicUrl;
    } catch (error) {
        showToast('Erro ao fazer upload do avatar', 'error');
        throw error;
    }
}


// ==================== CONFIGURAÇÕES ====================
const SUPABASE_URL = 'https://jjigreshcurxrijfelgw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vYVUaefjf9boNeiaCAZlLw_IyWr2Ax3';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Constantes Globais
const CONFIG = {
    PAGE_SIZE: 10,
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    CATEGORIES: ['desabafos', 'segredos', 'fofocas', 'diversos'],
    REACTION_TYPES: ['like', 'love', 'laugh', 'sad'],
    STORAGE_KEYS: {
        THEME: 'piripiri_theme',
        USER: 'piripiri_user',
        SESSION: 'piripiri_session'
    }
};

// ==================== UTILITÁRIOS ====================
function formatDate(date) {
    const now = new Date();
    const diff = now - new Date(date);
    
    if (diff < 60000) return 'agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    
    return new Date(date).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getRandomColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function truncateText(text, maxLength = 200) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

function sanitizeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== TOAST SYSTEM ====================
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer') || createToastContainer();
    
    const colors = {
        success: '#48bb78',
        error: '#fc8181',
        info: '#667eea',
        warning: '#ed8936'
    };
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
        background: ${colors[type] || '#333'};
        color: white;
        padding: 14px 24px;
        border-radius: 12px;
        font-weight: 500;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        animation: slideUp 0.3s ease;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: 'Inter', sans-serif;
        font-size: 0.9rem;
        min-width: 200px;
        max-width: 90%;
    `;
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;font-size:1.2rem;cursor:pointer;opacity:0.7;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 90%;
        pointer-events: none;
    `;
    document.body.appendChild(container);
    return container;
}

// ==================== LOADING INDICATOR ====================
function showLoading(container, message = 'A carregar...') {
    container.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner spinner"></i>
            <p>${message}</p>
        </div>
    `;
}

function hideLoading(container) {
    const loading = container.querySelector('.loading-state');
    if (loading) loading.remove();
}

// ==================== MODAL SYSTEM ====================
function showModal(title, content, actions = []) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(8px);
        animation: fadeIn 0.2s ease;
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        background: var(--bg-secondary);
        border-radius: 16px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: scaleIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h2 style="font-size:1.3rem;font-weight:700;color:var(--text-primary);">${title}</h2>
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-secondary);">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div>${content}</div>
        ${actions.length ? `
            <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
                ${actions.map(action => `
                    <button onclick="${action.onClick}" 
                            style="padding:10px 24px;border:none;border-radius:8px;font-family:'Inter',sans-serif;font-weight:600;cursor:pointer;
                                   background:${action.primary ? 'var(--primary)' : 'var(--bg-tertiary)'};
                                   color:${action.primary ? 'white' : 'var(--text-primary)'};
                                   transition:all 0.3s;">
                        ${action.label}
                    </button>
                `).join('')}
            </div>
        ` : ''}
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Fechar ao clicar fora
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}


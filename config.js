// config.js - Configurações Globais
const SUPABASE_URL = 'https://jjigreshcurxrijfelgw.supabase.co'; // ATUALIZAR
const SUPABASE_ANON_KEY = 'sb_publishable_vYVUaefjf9boNeiaCAZlLw_IyWr2Ax3'; // ATUALIZAR

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Constantes
const CONFIG = {
    PAGE_SIZE: 10,
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    CATEGORIES: ['desabafos', 'segredos', 'fofocas', 'diversos'],
};

// Utilitários
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

// Exportar para uso global
window.supabase = supabase;
window.CONFIG = CONFIG;
window.formatDate = formatDate;
window.getRandomColor = getRandomColor;

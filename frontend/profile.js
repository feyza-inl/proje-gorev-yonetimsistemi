// ========================================
// Configuration & State
// ========================================

const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // LocalStorage'dan kullanıcı bilgilerini yükle
    loadCurrentUser();

    if (currentUser) {
        initializeProfile();
    } else {
        // Giriş yapılmamışsa ana sayfaya yönlendir
        showNotification('Profil sayfasına erişmek için giriş yapmalısınız', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
});

function loadCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        currentUser = JSON.parse(userStr);
    }
}

function saveCurrentUser() {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

async function initializeProfile() {
    // Kullanıcı bilgilerini göster
    updateUserDisplay();

    // Profil verilerini yükle
    await loadProfileData();
}

// ========================================
// User Display
// ========================================

function updateUserDisplay() {
    const initials = getInitials(`${currentUser.Ad} ${currentUser.Soyad}`);

    // Nav avatar
    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('userName').textContent = `${currentUser.Ad} ${currentUser.Soyad}`;

    // Profile avatar
    document.getElementById('profileAvatarLarge').textContent = initials;
    document.getElementById('profileName').textContent = `${currentUser.Ad} ${currentUser.Soyad}`;
    document.getElementById('profileEmail').textContent = currentUser.Eposta;

    // Form fields
    document.getElementById('profileAd').value = currentUser.Ad;
    document.getElementById('profileSoyad').value = currentUser.Soyad;
    document.getElementById('profileEposta').value = currentUser.Eposta;
}

// ========================================
// Load Profile Data
// ========================================

async function loadProfileData() {
    try {
        // Profil istatistikleri
        const profile = await apiRequest(`/profil/${currentUser.KullaniciID}`);
        document.getElementById('statProjeler').textContent = profile.ProjeCount || 0;
        document.getElementById('statGorevler').textContent = profile.GorevCount || 0;

        // Görevleri yükle
        await loadMyTasks();

        // Projeleri yükle
        await loadMyProjects();

    } catch (error) {
        console.error('Profil verileri yüklenemedi:', error);

        // Eğer endpoint bulunamazsa, istatistikleri 0 olarak göster
        document.getElementById('statProjeler').textContent = '0';
        document.getElementById('statGorevler').textContent = '0';

        showNotification('Bazı profil verileri yüklenemedi', 'warning');
    }
}

async function loadMyTasks() {
    const container = document.getElementById('myTasksList');

    try {
        const tasks = await apiRequest(`/profil/${currentUser.KullaniciID}/gorevler`);

        if (!tasks || tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                        <path d="M9 11L12 14L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <p>Henüz size atanmış görev bulunmuyor.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = tasks.map(task => `
            <div class="task-item">
                <div class="task-item-header">
                    <div class="task-item-title">${task.GorevAdi}</div>
                    <div class="task-badges">
                        <span class="badge badge-priority ${getPriorityClass(task.OncelikAdi)}">
                            ${task.OncelikAdi}
                        </span>
                        <span class="badge badge-status ${getStatusClass(task.DurumAdi)}">
                            ${task.DurumAdi}
                        </span>
                    </div>
                </div>
                <div class="task-meta">
                    <span>📁 ${task.ProjeAdi}</span>
                    <span>📅 ${formatDate(task.TeslimTarihi)}</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Görevler yüklenemedi:', error);
        container.innerHTML = `
            <div class="empty-state">
                <p style="color: #EF4444;">⚠️ Görevler yüklenirken bir hata oluştu.</p>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;">
                    Lütfen daha sonra tekrar deneyin veya sistem yöneticisine başvurun.
                </p>
            </div>
        `;
    }
}

async function loadMyProjects() {
    const container = document.getElementById('myProjectsList');

    try {
        const projects = await apiRequest(`/profil/${currentUser.KullaniciID}/projeler`);

        if (!projects || projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2"/>
                        <path d="M9 3V21M15 3V21M3 9H21M3 15H21" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <p>Henüz bir projeye dahil değilsiniz.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = projects.map(project => `
            <div class="project-item">
                <div class="project-item-header">
                    <div class="project-item-title">${project.ProjeAdi}</div>
                    <span class="badge badge-role">${project.RolAdi}</span>
                </div>
                <div class="project-meta">
                    <span>📅 ${formatDate(project.BaslangicTarihi)}</span>
                    ${project.BitisTarihi ? `<span>→ ${formatDate(project.BitisTarihi)}</span>` : ''}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Projeler yüklenemedi:', error);
        container.innerHTML = `
            <div class="empty-state">
                <p style="color: #EF4444;">⚠️ Projeler yüklenirken bir hata oluştu.</p>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;">
                    Lütfen daha sonra tekrar deneyin veya sistem yöneticisine başvurun.
                </p>
            </div>
        `;
    }
}

// ========================================
// Tab Navigation
// ========================================

function showTab(tabName) {
    // Tüm tab içeriklerini gizle
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Tüm menü öğelerinden active class'ını kaldır
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    // Seçili tab'ı göster
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Seçili menü öğesine active class ekle
    event.target.closest('.menu-item').classList.add('active');
}

// ========================================
// Form Handlers
// ========================================

async function handleProfileUpdate(event) {
    event.preventDefault();

    const data = {
        Ad: document.getElementById('profileAd').value,
        Soyad: document.getElementById('profileSoyad').value,
        Eposta: document.getElementById('profileEposta').value
    };

    try {
        await apiRequest(`/profil/${currentUser.KullaniciID}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        // currentUser'ı güncelle
        currentUser.Ad = data.Ad;
        currentUser.Soyad = data.Soyad;
        currentUser.Eposta = data.Eposta;
        saveCurrentUser();

        // UI'ı güncelle
        updateUserDisplay();

        showNotification('Profil bilgileriniz güncellendi!', 'success');

    } catch (error) {
        console.error('Profil güncellenemedi:', error);
        showNotification(error.message || 'Profil güncellenirken hata oluştu', 'error');
    }
}

async function handlePasswordChange(event) {
    event.preventDefault();

    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Yeni şifre kontrolü
    if (newPassword !== confirmPassword) {
        showNotification('Yeni şifreler eşleşmiyor!', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showNotification('Şifre en az 6 karakter olmalıdır!', 'error');
        return;
    }

    try {
        await apiRequest(`/profil/${currentUser.KullaniciID}/sifre`, {
            method: 'PUT',
            body: JSON.stringify({
                EskiSifre: oldPassword,
                YeniSifre: newPassword
            })
        });

        showNotification('Şifreniz başarıyla değiştirildi!', 'success');

        // Formu temizle
        document.getElementById('passwordForm').reset();

    } catch (error) {
        console.error('Şifre değiştirilemedi:', error);
        showNotification(error.message || 'Şifre değiştirirken hata oluştu', 'error');
    }
}

// ========================================
// API Functions
// ========================================

async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// ========================================
// Utility Functions
// ========================================

function getInitials(name) {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getPriorityClass(priority) {
    const map = {
        'Kritik': '',
        'Yüksek': 'high',
        'Orta': 'medium',
        'Düşük': 'low'
    };
    return map[priority] || '';
}

function getStatusClass(status) {
    const map = {
        'Tamamlandı': 'completed',
        'Devam Ediyor': 'in-progress',
        'Test Ediliyor': 'in-progress',
        'Yeni': '',
        'Askıya Alındı': 'low'
    };
    return map[status] || '';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : type === 'warning' ? '#F59E0B' : '#3B82F6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        z-index: 3000;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
        font-weight: 500;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
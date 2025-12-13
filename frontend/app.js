// ========================================
// Configuration & State Management
// ========================================

const API_BASE_URL = 'http://localhost:5000/api'; // Flask API endpoint

let currentUser = null;
let projects = [];
let tasks = [];
let users = [];

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // LocalStorage'dan kullanıcı bilgilerini yükle
    loadCurrentUser();

    initializeApp();
    setupEventListeners();

    // Kullanıcı giriş yapmışsa nav'ı güncelle
    if (currentUser) {
        updateNavForLoggedInUser();
    }
});

function loadCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        currentUser = JSON.parse(userStr);
    }
}

function saveCurrentUser() {
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
        localStorage.removeItem('currentUser');
    }
}

function updateNavForLoggedInUser() {
    const navActions = document.querySelector('.nav-actions');
    const initials = getInitials(`${currentUser.Ad} ${currentUser.Soyad}`);

    navActions.innerHTML = `
        <div class="user-profile-dropdown">
            <div class="user-profile" onclick="toggleProfileMenu()">
                <div class="user-avatar">${initials}</div>
                <span class="user-name">${currentUser.Ad} ${currentUser.Soyad}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>
            <div class="profile-dropdown-menu" id="profileDropdown">
                <a href="profile.html" class="dropdown-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Profilim
                </a>
                <div class="dropdown-divider"></div>
                <button onclick="handleLogout()" class="dropdown-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M16 17L21 12L16 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Çıkış Yap
                </button>
            </div>
        </div>
    `;
}

function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('active');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown && !e.target.closest('.user-profile-dropdown')) {
        dropdown.classList.remove('active');
    }
});

function handleLogout() {
    currentUser = null;
    saveCurrentUser();
    showNotification('Başarıyla çıkış yapıldı', 'success');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

async function initializeApp() {
    try {
        // Kullanıcı giriş yapmadıysa, sınırlı içerik göster
        if (!currentUser) {
            renderGuestView();
            // İstatistikleri sıfırla
            document.getElementById('statProjects').textContent = '0';
            document.getElementById('statTasks').textContent = '0';
            document.getElementById('statUsers').textContent = '0';
            console.log('ℹ️ Misafir görünümü yüklendi');
            return;
        }

        // Load initial data
        await Promise.all([
            loadProjects(),
            loadTasks(),
            loadUsers()
        ]);

        // Render components
        renderProjects();
        renderTasks();
        renderTeam();

        // İstatistikleri animasyon ile göster
        animateStats();

        console.log('✅ Uygulama başarıyla yüklendi');
    } catch (error) {
        console.error('❌ Uygulama yüklenirken hata:', error);
        showNotification('Veri yüklenirken bir hata oluştu', 'error');
    }
}

function renderGuestView() {
    // Misafir kullanıcılar için boş mesajlar göster
    document.getElementById('projectsContainer').innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
            <p style="font-size: 1.1rem; margin-bottom: 1rem;">🔒 Projeleri görmek için giriş yapın</p>
            <button class="btn-primary" onclick="showLogin()">Giriş Yap</button>
        </div>
    `;

    document.getElementById('tasksContainer').innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <p style="font-size: 1.1rem; margin-bottom: 1rem;">🔒 Görevleri görmek için giriş yapın</p>
            <button class="btn-primary" onclick="showLogin()">Giriş Yap</button>
        </div>
    `;

    document.getElementById('teamContainer').innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
            <p style="font-size: 1.1rem; margin-bottom: 1rem;">🔒 Ekip üyelerini görmek için giriş yapın</p>
            <button class="btn-primary" onclick="showLogin()">Giriş Yap</button>
        </div>
    `;
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Task filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const filter = e.target.dataset.filter;
            filterTasks(filter);
        });
    });

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
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
// Data Loading Functions
// ========================================

async function loadProjects() {
    try {
        // Kullanıcı ID'sini parametre olarak gönder
        const endpoint = currentUser
            ? `/projeler?kullanici_id=${currentUser.KullaniciID}`
            : '/projeler';

        const data = await apiRequest(endpoint);
        projects = data;
        return projects;
    } catch (error) {
        console.error('Projeler yüklenemedi:', error);
        projects = [];
        return projects;
    }
}

async function loadTasks() {
    try {
        // Kullanıcı ID'sini parametre olarak gönder
        const endpoint = currentUser
            ? `/gorevler?kullanici_id=${currentUser.KullaniciID}`
            : '/gorevler';

        const data = await apiRequest(endpoint);
        tasks = data;
        return tasks;
    } catch (error) {
        console.error('Görevler yüklenemedi:', error);
        tasks = [];
        return tasks;
    }
}

async function loadUsers() {
    try {
        // Kullanıcı giriş yapmışsa, sadece kendi ekibini göster
        const endpoint = currentUser
            ? `/ekip?kullanici_id=${currentUser.KullaniciID}`
            : '/kullanicilar';

        const data = await apiRequest(endpoint);
        users = data;
        return users;
    } catch (error) {
        console.error('Kullanıcılar yüklenemedi:', error);
        users = [];
        return users;
    }
}

// ========================================
// Render Functions
// ========================================

function renderProjects() {
    const container = document.getElementById('projectsContainer');

    if (!projects || projects.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <p>Henüz proje bulunmuyor. Yeni bir proje oluşturun!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = projects.map(project => `
        <div class="project-card" onclick="viewProject(${project.ProjeID})">
            <div class="project-header">
                <div>
                    <h3 class="project-title">${project.ProjeAdi}</h3>
                    <div class="project-meta">
                        <span>📅 ${formatDate(project.BaslangicTarihi)}</span>
                        ${project.BitisTarihi ? `<span>→ ${formatDate(project.BitisTarihi)}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="project-budget">
                ${project.Butce ? formatCurrency(project.Butce) : 'Bütçe belirlenmedi'}
            </div>
            <div class="project-progress">
                <div class="card-progress">
                    <div class="progress-bar" style="width: ${calculateProgress(project.ProjeID)}%"></div>
                </div>
                <div class="card-info">${calculateProgress(project.ProjeID)}% Tamamlandı</div>
            </div>
            <div class="project-team">
                <div class="team-avatars">
                    <div class="avatar">${getInitials(project.YoneticiAd + ' ' + project.YoneticiSoyad)}</div>
                </div>
                <span style="font-size: 0.875rem; color: var(--text-muted);">
                    ${project.YoneticiAd} ${project.YoneticiSoyad}
                </span>
            </div>
            <div class="project-actions">
                <button class="btn-icon" onclick="editProject(${project.ProjeID}); event.stopPropagation();" title="Düzenle">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="btn-icon" onclick="deleteProject(${project.ProjeID}); event.stopPropagation();" title="Sil">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6H21M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6M19 6V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function renderTasks(filter = 'all') {
    const container = document.getElementById('tasksContainer');

    let filteredTasks = tasks;
    if (filter !== 'all') {
        filteredTasks = tasks.filter(task => task.DurumID == filter);
    }

    if (!filteredTasks || filteredTasks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <p>Bu filtrede görev bulunmuyor.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredTasks.map(task => `
        <div class="task-card" onclick="viewTask(${task.GorevID})">
            <div class="task-header">
                <h3 class="task-title">${task.GorevAdi}</h3>
                <div class="task-badges">
                    <span class="badge badge-priority ${getPriorityClass(task.OncelikAdi)}">
                        ${task.OncelikAdi}
                    </span>
                    <span class="badge badge-status">
                        ${task.DurumAdi}
                    </span>
                </div>
            </div>
            <p class="task-description">${task.Aciklama || 'Açıklama bulunmuyor'}</p>
            <div class="task-meta">
                <span class="task-date">📅 ${formatDate(task.TeslimTarihi)}</span>
                <span style="font-size: 0.875rem; color: var(--text-muted);">
                    📁 ${task.ProjeAdi}
                </span>
            </div>
        </div>
    `).join('');
}

function renderTeam() {
    const container = document.getElementById('teamContainer');

    if (!users || users.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <p>Henüz ekip üyesi bulunmuyor.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = users.map(user => `
        <div class="team-card">
            <div class="team-avatar">
                ${getInitials(user.Ad + ' ' + user.Soyad)}
            </div>
            <h3 class="team-name">${user.Ad} ${user.Soyad}</h3>
            <p class="team-role">${user.Rol || 'Ekip Üyesi'}</p>
            <a href="mailto:${user.Eposta}" class="team-email">${user.Eposta}</a>
        </div>
    `).join('');
}

// ========================================
// Modal Functions
// ========================================

function showLogin() {
    const modal = document.getElementById('loginModal');
    const form = document.getElementById('loginForm');
    form.reset();
    modal.classList.add('active');
}

function showRegister() {
    const modal = document.getElementById('registerModal');
    const form = document.getElementById('registerForm');
    form.reset();
    modal.classList.add('active');
}

function showProjectModal(projectId = null) {
    // Giriş kontrolü
    if (!currentUser) {
        showNotification('Proje oluşturmak için giriş yapmalısınız', 'error');
        showLogin();
        return;
    }

    const modal = document.getElementById('projectModal');
    const form = document.getElementById('projectForm');
    const title = document.getElementById('projectModalTitle');

    // Populate manager dropdown
    const managerSelect = document.getElementById('projectManager');
    managerSelect.innerHTML = '<option value="">Seçiniz...</option>' +
        users.map(user => `<option value="${user.KullaniciID}">${user.Ad} ${user.Soyad}</option>`).join('');

    if (projectId) {
        // Edit mode
        const project = projects.find(p => p.ProjeID === projectId);
        if (project) {
            title.textContent = 'Proje Düzenle';
            document.getElementById('projectId').value = project.ProjeID;
            document.getElementById('projectName').value = project.ProjeAdi;
            document.getElementById('projectBudget').value = project.Butce || '';
            document.getElementById('projectStartDate').value = project.BaslangicTarihi;
            document.getElementById('projectEndDate').value = project.BitisTarihi || '';
            document.getElementById('projectManager').value = project.YoneticiID || '';
        }
    } else {
        // Create mode
        title.textContent = 'Yeni Proje Oluştur';
        form.reset();
        document.getElementById('projectId').value = '';
    }

    modal.classList.add('active');
}

function showTaskModal(taskId = null) {
    // Giriş kontrolü
    if (!currentUser) {
        showNotification('Görev oluşturmak için giriş yapmalısınız', 'error');
        showLogin();
        return;
    }

    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const title = document.getElementById('taskModalTitle');

    // Populate project dropdown
    const projectSelect = document.getElementById('taskProject');
    projectSelect.innerHTML = '<option value="">Seçiniz...</option>' +
        projects.map(project => `<option value="${project.ProjeID}">${project.ProjeAdi}</option>`).join('');

    if (taskId) {
        // Edit mode
        const task = tasks.find(t => t.GorevID === taskId);
        if (task) {
            title.textContent = 'Görev Düzenle';
            document.getElementById('taskId').value = task.GorevID;
            document.getElementById('taskName').value = task.GorevAdi;
            document.getElementById('taskDescription').value = task.Aciklama || '';
            document.getElementById('taskProject').value = task.ProjeID;
            document.getElementById('taskDueDate').value = task.TeslimTarihi;
            document.getElementById('taskStatus').value = task.DurumID;
            document.getElementById('taskPriority').value = task.OncelikID;
        }
    } else {
        // Create mode
        title.textContent = 'Yeni Görev Oluştur';
        form.reset();
        document.getElementById('taskId').value = '';
    }

    modal.classList.add('active');
}

function showDemo() {
    showNotification('Demo videosu yakında eklenecek!', 'info');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ========================================
// Form Handlers
// ========================================

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await apiRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        currentUser = response.user;
        saveCurrentUser();

        showNotification('Giriş başarılı!', 'success');
        closeModal('loginModal');

        // Sayfayı yenile
        setTimeout(() => {
            window.location.reload();
        }, 1000);

    } catch (error) {
        console.error('Giriş hatası:', error);
        showNotification(error.message || 'Giriş yapılırken hata oluştu', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const ad = document.getElementById('registerAd').value;
    const soyad = document.getElementById('registerSoyad').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    // Şifre kontrolü
    if (password !== passwordConfirm) {
        showNotification('Şifreler eşleşmiyor!', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Şifre en az 6 karakter olmalıdır!', 'error');
        return;
    }

    try {
        const response = await apiRequest('/register', {
            method: 'POST',
            body: JSON.stringify({
                Ad: ad,
                Soyad: soyad,
                Eposta: email,
                Sifre: password
            })
        });

        showNotification(response.message || 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.', 'success');
        closeModal('registerModal');

        // Kullanıcı listesini yenile
        await loadUsers();
        renderTeam();

        // 2 saniye sonra login modalını aç
        setTimeout(() => {
            showLogin();
            // E-posta alanını otomatik doldur
            document.getElementById('loginEmail').value = email;
        }, 2000);

    } catch (error) {
        console.error('Kayıt hatası:', error);
        showNotification(error.message || 'Kayıt sırasında bir hata oluştu', 'error');
    }
}

async function handleProjectSubmit(event) {
    event.preventDefault();

    const projectId = document.getElementById('projectId').value;
    const projectData = {
        ProjeAdi: document.getElementById('projectName').value,
        BaslangicTarihi: document.getElementById('projectStartDate').value,
        BitisTarihi: document.getElementById('projectEndDate').value || null,
        Butce: parseFloat(document.getElementById('projectBudget').value) || null,
        YoneticiID: parseInt(document.getElementById('projectManager').value) || null
    };

    try {
        if (projectId) {
            // Update existing project
            await apiRequest(`/projeler/${projectId}`, {
                method: 'PUT',
                body: JSON.stringify(projectData)
            });
            showNotification('Proje güncellendi!', 'success');
        } else {
            // Create new project
            await apiRequest('/projeler', {
                method: 'POST',
                body: JSON.stringify(projectData)
            });
            showNotification('Proje oluşturuldu!', 'success');
        }

        await loadProjects();
        renderProjects();
        closeModal('projectModal');
    } catch (error) {
        console.error('Proje kaydedilemedi:', error);
        showNotification('Proje kaydedilirken hata oluştu', 'error');
    }
}

async function handleTaskSubmit(event) {
    event.preventDefault();

    const taskId = document.getElementById('taskId').value;
    const taskData = {
        GorevAdi: document.getElementById('taskName').value,
        Aciklama: document.getElementById('taskDescription').value || null,
        TeslimTarihi: document.getElementById('taskDueDate').value,
        ProjeID: parseInt(document.getElementById('taskProject').value),
        DurumID: parseInt(document.getElementById('taskStatus').value),
        OncelikID: parseInt(document.getElementById('taskPriority').value)
    };

    try {
        if (taskId) {
            // Update existing task
            await apiRequest(`/gorevler/${taskId}`, {
                method: 'PUT',
                body: JSON.stringify(taskData)
            });
            showNotification('Görev güncellendi!', 'success');
        } else {
            // Create new task
            await apiRequest('/gorevler', {
                method: 'POST',
                body: JSON.stringify(taskData)
            });
            showNotification('Görev oluşturuldu!', 'success');
        }

        await loadTasks();
        renderTasks();
        closeModal('taskModal');
    } catch (error) {
        console.error('Görev kaydedilemedi:', error);
        showNotification('Görev kaydedilirken hata oluştu', 'error');
    }
}

// ========================================
// CRUD Operations
// ========================================

function viewProject(projectId) {
    const project = projects.find(p => p.ProjeID === projectId);
    if (project) {
        showNotification(`${project.ProjeAdi} projesi görüntüleniyor`, 'info');
    }
}

function editProject(projectId) {
    showProjectModal(projectId);
}

async function deleteProject(projectId) {
    if (!confirm('Bu projeyi silmek istediğinizden emin misiniz?')) return;

    try {
        await apiRequest(`/projeler/${projectId}`, {
            method: 'DELETE'
        });

        showNotification('Proje silindi!', 'success');
        await loadProjects();
        renderProjects();
    } catch (error) {
        console.error('Proje silinemedi:', error);
        showNotification('Proje silinirken hata oluştu', 'error');
    }
}

function viewTask(taskId) {
    const task = tasks.find(t => t.GorevID === taskId);
    if (task) {
        showNotification(`${task.GorevAdi} görevi görüntüleniyor`, 'info');
    }
}

function editTask(taskId) {
    showTaskModal(taskId);
}

async function deleteTask(taskId) {
    if (!confirm('Bu görevi silmek istediğinizden emin misiniz?')) return;

    try {
        await apiRequest(`/gorevler/${taskId}`, {
            method: 'DELETE'
        });

        showNotification('Görev silindi!', 'success');
        await loadTasks();
        renderTasks();
    } catch (error) {
        console.error('Görev silinemedi:', error);
        showNotification('Görev silinirken hata oluştu', 'error');
    }
}

// ========================================
// Filter Functions
// ========================================

function filterTasks(filter) {
    renderTasks(filter);
}

// ========================================
// Utility Functions
// ========================================

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

function getInitials(name) {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();
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

function calculateProgress(projectId) {
    const projectTasks = tasks.filter(t => t.ProjeID === projectId);
    if (projectTasks.length === 0) return 0;

    const completedTasks = projectTasks.filter(t => t.DurumID === 4).length;
    return Math.round((completedTasks / projectTasks.length) * 100);
}

function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#3B82F6'};
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

function animateStats() {
    animateValue('statProjects', 0, projects.length, 1500);
    animateValue('statTasks', 0, tasks.filter(t => t.DurumID === 4).length, 1500);
    animateValue('statUsers', 0, users.length, 1500);
}

function animateValue(id, start, end, duration) {
    const element = document.getElementById(id);
    if (!element) return;

    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            element.textContent = end;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
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

    /* User Profile Dropdown Styles */
    .user-profile-dropdown {
        position: relative;
    }

    .user-profile {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 1rem;
        background: var(--bg-secondary);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all 0.3s;
    }

    .user-profile:hover {
        background: var(--border-light);
    }

    .user-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--gradient-accent);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: 0.9rem;
    }

    .user-name {
        font-weight: 600;
        color: var(--text-primary);
        font-size: 0.9rem;
    }

    .profile-dropdown-menu {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        background: white;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        border: 1px solid var(--border-light);
        min-width: 200px;
        z-index: 1000;
        display: none;
        overflow: hidden;
    }

    .profile-dropdown-menu.active {
        display: block;
        animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .dropdown-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        color: var(--text-primary);
        text-decoration: none;
        transition: all 0.3s;
        border: none;
        background: white;
        width: 100%;
        text-align: left;
        cursor: pointer;
        font-family: var(--font-secondary);
        font-size: 0.95rem;
    }

    .dropdown-item:hover {
        background: var(--bg-secondary);
    }

    .dropdown-divider {
        height: 1px;
        background: var(--border-light);
        margin: 0.25rem 0;
    }
`;
document.head.appendChild(style);
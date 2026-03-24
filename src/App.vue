<template>
  <nav class="eduvid-nav">
    <div class="nav-inner">
      <router-link to="/" class="nav-brand">
        <div class="brand-icon"><i class="bi bi-play-fill"></i></div>
        <span>EduVid</span>
      </router-link>

      <!-- Desktop Links -->
      <div class="nav-links default-desktop" v-if="authStore.user">
        <router-link to="/" class="nav-link-item" @click="menuOpen = false">Home</router-link>
        <router-link to="/courses" class="nav-link-item" @click="menuOpen = false">Courses</router-link>
        <router-link to="/upload" class="nav-link-item" @click="menuOpen = false">Upload</router-link>
        <router-link to="/my-videos" class="nav-link-item" @click="menuOpen = false">My Videos</router-link>
        <router-link v-if="authStore.isAdmin" to="/admin" class="nav-link-item admin-link" @click="menuOpen = false">Admin</router-link>
      </div>

      <div class="nav-actions">
        <!-- Theme toggle -->
        <button @click="toggleTheme" class="theme-toggle" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
          <i :class="isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill'"></i>
        </button>

        <template v-if="authStore.user">
          <div class="user-menu default-desktop">
            <router-link to="/profile" class="user-avatar-link" title="Profile">
              <img
                :src="authStore.userProfile?.photoURL || authStore.user.photoURL || `https://ui-avatars.com/api/?name=${authStore.user.email}&background=6c63ff&color=fff`"
                class="user-avatar"
                alt="Avatar"
              />
            </router-link>
            <span class="user-name">{{ authStore.userProfile?.name || authStore.user.email?.split('@')[0] }}</span>
            <button @click="handleLogout" class="btn-logout" title="Sign out">
              <i class="bi bi-box-arrow-right"></i>
            </button>
          </div>
          
          <!-- Hamburger Button -->
          <button class="mobile-menu-btn" @click="menuOpen = !menuOpen">
            <i class="bi" :class="menuOpen ? 'bi-x-lg' : 'bi-list'"></i>
          </button>
        </template>

        <template v-else>
          <router-link to="/login" class="btn-glass default-desktop">Login</router-link>
          <router-link to="/register" class="btn-gradient default-desktop">Sign Up</router-link>
        </template>
      </div>
    </div>
  </nav>

  <!-- Mobile Drawer correctly scoped as root sibling -->
  <div class="mobile-drawer-overlay" :class="{ 'drawer-open': menuOpen }" v-if="authStore.user">
    <router-link to="/profile" class="drawer-user" style="text-decoration: none;" @click="menuOpen = false">
      <img :src="authStore.userProfile?.photoURL || authStore.user.photoURL || `https://ui-avatars.com/api/?name=${authStore.user.email}&background=6c63ff&color=fff`" class="drawer-avatar" />
      <div style="display: flex; flex-direction: column;">
        <span class="drawer-name">{{ authStore.userProfile?.name || authStore.user.email?.split('@')[0] }}</span>
        <span style="font-size: 0.85rem; color: var(--accent); font-weight: 500; margin-top: 0.2rem;">View Profile & Settings</span>
      </div>
    </router-link>
    <div class="drawer-links">
      <router-link to="/" class="drawer-link" @click="menuOpen = false"><i class="bi bi-house me-3"></i>Home</router-link>
      <router-link to="/courses" class="drawer-link" @click="menuOpen = false"><i class="bi bi-book me-3"></i>Courses</router-link>
      <router-link to="/upload" class="drawer-link" @click="menuOpen = false"><i class="bi bi-cloud-arrow-up me-3"></i>Upload</router-link>
      <router-link to="/my-videos" class="drawer-link" @click="menuOpen = false"><i class="bi bi-camera-video me-3"></i>My Videos</router-link>
      <router-link v-if="authStore.isAdmin" to="/admin" class="drawer-link admin-link" @click="menuOpen = false"><i class="bi bi-shield-lock me-3"></i>Admin</router-link>
    </div>
    <button @click="handleLogout(); menuOpen = false;" class="drawer-logout"><i class="bi bi-box-arrow-right me-3"></i>Sign out</button>
  </div>

  <main class="main-content">
    <router-view></router-view>
  </main>

  <footer class="eduvid-footer">
    <p>© {{ new Date().getFullYear() }} EduVid. All rights reserved.</p>
  </footer>

  <!-- Server Wake Up Toast -->
  <div v-if="serverSpinningUp" class="server-status-toast glass-card">
    <i class="bi bi-arrow-repeat spin" style="font-size: 1.2rem; color: var(--accent)"></i>
    <span>Waking up secure server...</span>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const isDark = ref(true)
const menuOpen = ref(false)
const serverSpinningUp = ref(true)

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'light') {
    isDark.value = false
    document.documentElement.setAttribute('data-theme', 'light')
  }

  // Wake up backend and handle Spin Up delay
  fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/`)
    .then(() => { serverSpinningUp.value = false })
    .catch(() => { serverSpinningUp.value = false })
})

const toggleTheme = () => {
  isDark.value = !isDark.value
  const theme = isDark.value ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', isDark.value ? '' : 'light')
  localStorage.setItem('theme', theme)
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.eduvid-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(13, 15, 26, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
[data-theme="light"] .eduvid-nav {
  background: rgba(244,245,251,0.85);
  border-bottom-color: rgba(0,0,0,0.06);
}
.nav-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 2rem;
}
.nav-brand {
  display: flex; align-items: center; gap: 0.6rem;
  text-decoration: none; font-size: 1.2rem; font-weight: 800;
  color: var(--text-primary); flex-shrink: 0;
}
.brand-icon {
  width: 34px; height: 34px;
  background: linear-gradient(135deg, #6c63ff, #a855f7);
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; color: #fff;
}
.nav-links { display: flex; gap: 0.25rem; flex: 1; }
.nav-link-item {
  text-decoration: none; padding: 0.4rem 0.9rem;
  border-radius: 8px; color: var(--text-secondary);
  font-size: 0.9rem; font-weight: 500;
  transition: background 0.15s, color 0.15s;
}
.nav-link-item:hover,
.nav-link-item.router-link-active {
  background: rgba(108,99,255,0.12);
  color: var(--text-primary);
}
.nav-actions {
  display: flex; align-items: center; gap: 0.75rem; margin-left: auto;
}
.user-menu { display: flex; align-items: center; gap: 0.6rem; }
.user-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  object-fit: cover; border: 2px solid rgba(108,99,255,0.4);
}
.user-name {
  font-size: 0.875rem; font-weight: 500; color: var(--text-primary);
  max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.btn-logout {
  background: transparent; border: 1px solid var(--border);
  color: var(--text-secondary); border-radius: 8px;
  padding: 0.35rem 0.6rem; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.btn-logout:hover { background: rgba(255,68,68,0.12); color: #f87171; }

/* Theme toggle */
.theme-toggle {
  background: transparent; border: 1px solid var(--border);
  color: var(--text-secondary); border-radius: 8px;
  padding: 0.35rem 0.6rem; cursor: pointer; font-size: 0.95rem;
  transition: background 0.15s, color 0.15s;
}
.theme-toggle:hover { background: rgba(108,99,255,0.12); color: var(--accent); }

.admin-link { color: #fbbf24 !important; }
.admin-link:hover, .admin-link.router-link-active { background: rgba(251,191,36,0.1) !important; color: #fbbf24 !important; }
.user-avatar-link { display: flex; align-items: center; }
.main-content { flex: 1; }
.eduvid-footer {
  border-top: 1px solid var(--border);
  padding: 1.25rem; text-align: center;
  color: var(--text-secondary); font-size: 0.8rem;
}

/* Mobile Responsive Classes */
.default-desktop { display: flex; }
.mobile-menu-btn { display: none; background: transparent; border: none; font-size: 1.6rem; color: var(--text-primary); cursor: pointer; padding: 0.2rem; }
.mobile-drawer-overlay { display: none; }

@media (max-width: 860px) {
  .default-desktop { display: none !important; }
  .mobile-menu-btn { display: block; }
  
  .mobile-drawer-overlay {
    display: flex; flex-direction: column;
    position: fixed; inset: 0; top: 64px;
    background: var(--bg-primary); z-index: 9999;
    padding: 2rem 1.5rem; overflow-y: auto;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .drawer-open { transform: translateX(0); }
  
  .drawer-user { display: flex; align-items: center; gap: 1rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); margin-bottom: 1.5rem; }
  .drawer-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(108,99,255,0.4); }
  .drawer-name { font-weight: 700; font-size: 1.15rem; color: var(--text-primary); }
  
  .drawer-links { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; margin-bottom: 2rem; }
  .drawer-link { display: flex; align-items: center; padding: 1rem; font-size: 1.1rem; font-weight: 500; color: var(--text-secondary); text-decoration: none; border-radius: 12px; transition: background 0.2s, color 0.2s; }
  .drawer-link:hover, .drawer-link.router-link-active { background: rgba(108,99,255,0.1); color: var(--text-primary); }
  
  .drawer-logout { margin-top: auto; padding: 1.25rem; font-size: 1.1rem; font-weight: 600; color: #f87171; background: transparent; border: 1px solid rgba(248,113,113,0.3); border-radius: 12px; cursor: pointer; text-align: left; transition: background 0.2s; }
  .drawer-logout:hover { background: rgba(248,113,113,0.1); }
}

/* Server Status Toast */
.server-status-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--bg-card);
  border: 1px solid rgba(108,99,255,0.3);
  padding: 1rem 1.25rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  z-index: 1000;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  font-weight: 500;
  color: var(--text-primary);
  animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.spin { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
@keyframes slideUp {
  0% { transform: translateY(100%); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
</style>

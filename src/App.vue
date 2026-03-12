<template>
  <nav class="eduvid-nav">
    <div class="nav-inner">
      <router-link to="/" class="nav-brand">
        <div class="brand-icon"><i class="bi bi-play-fill"></i></div>
        <span>EduVid</span>
      </router-link>

      <div class="nav-links" v-if="authStore.user">
        <router-link to="/" class="nav-link-item">Home</router-link>
        <router-link to="/courses" class="nav-link-item">Courses</router-link>
        <router-link to="/upload" class="nav-link-item">Upload</router-link>
        <router-link to="/my-videos" class="nav-link-item">My Videos</router-link>
        <router-link v-if="authStore.isAdmin" to="/admin" class="nav-link-item admin-link">Admin</router-link>
      </div>

      <div class="nav-actions">
        <!-- Theme toggle -->
        <button @click="toggleTheme" class="theme-toggle" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
          <i :class="isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill'"></i>
        </button>

        <template v-if="authStore.user">
          <div class="user-menu">
            <router-link to="/profile" class="user-avatar-link" title="Profile">
              <img
                :src="authStore.user.photoURL || `https://ui-avatars.com/api/?name=${authStore.user.email}&background=6c63ff&color=fff`"
                class="user-avatar"
                alt="Avatar"
              />
            </router-link>
            <span class="user-name">{{ authStore.userProfile?.name || authStore.user.email?.split('@')[0] }}</span>
            <button @click="handleLogout" class="btn-logout" title="Sign out">
              <i class="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </template>
        <template v-else>
          <router-link to="/login" class="btn-glass">Login</router-link>
          <router-link to="/register" class="btn-gradient">Sign Up</router-link>
        </template>
      </div>
    </div>
  </nav>

  <main class="main-content">
    <router-view></router-view>
  </main>

  <footer class="eduvid-footer">
    <p>© {{ new Date().getFullYear() }} EduVid. All rights reserved.</p>
  </footer>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const isDark = ref(true)

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'light') {
    isDark.value = false
    document.documentElement.setAttribute('data-theme', 'light')
  }
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
</style>

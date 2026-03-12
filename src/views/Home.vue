<template>
  <div class="page-wrapper">
    <!-- Hero for guests -->
    <div v-if="!authStore.user" class="hero-section">
      <div class="hero-glow"></div>
      <div class="hero-content">
        <div class="hero-badge">🎓 Educational Video Platform</div>
        <h1 class="hero-title">Learn Anything,<br><span class="gradient-text">Upload Everything</span></h1>
        <p class="hero-sub">Share educational videos with the world. Automatically processed and published to YouTube.</p>
        <div class="hero-actions">
          <router-link to="/register" class="btn-gradient">Get Started Free</router-link>
          <router-link to="/login" class="btn-glass">Sign In</router-link>
        </div>
      </div>
    </div>

    <!-- Feed for signed-in users -->
    <div v-else class="feed-section">
      <div class="feed-header">
        <div>
          <h1 class="feed-title">Explore <span class="gradient-text">Videos</span></h1>
          <p class="feed-sub">Discover the latest educational content</p>
        </div>
        <div class="search-wrap">
          <i class="bi bi-search search-icon"></i>
          <input v-model="searchQuery" class="search-input" placeholder="Search videos..." />
        </div>
      </div>

      <div v-if="loading" class="state-center">
        <div class="spinner"></div>
        <p>Loading videos...</p>
      </div>

      <div v-else-if="filteredVideos.length === 0" class="state-center">
        <i class="bi bi-film" style="font-size:3rem; color: var(--accent); opacity:0.5;"></i>
        <p style="margin-top:1rem; color: var(--text-secondary);">
          {{ searchQuery ? `No results for "${searchQuery}"` : 'No videos yet. Be the first to upload!' }}
        </p>
        <button v-if="searchQuery" @click="searchQuery = ''" class="btn-glass" style="margin-top:0.5rem;">Clear search</button>
        <router-link v-else to="/upload" class="btn-gradient" style="margin-top:0.5rem;">Upload a video</router-link>
      </div>

      <div v-else class="video-grid">
        <VideoCard v-for="video in filteredVideos" :key="video.id" :video="video" @deleted="fetchVideos" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { db } from '../firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import VideoCard from '../components/VideoCard.vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const videos = ref([])
const loading = ref(true)
const searchQuery = ref('')

const filteredVideos = computed(() => {
  if (!searchQuery.value) return videos.value
  const q = searchQuery.value.toLowerCase()
  return videos.value.filter(v =>
    v.title?.toLowerCase().includes(q) ||
    v.description?.toLowerCase().includes(q)
  )
})

const fetchVideos = async () => {
  loading.value = true
  try {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    videos.value = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchVideos)
</script>

<style scoped>
.page-wrapper { max-width: 1280px; margin: 0 auto; padding: 0 1.5rem 3rem; }

/* Hero */
.hero-section {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.hero-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 60% 50% at 50% 30%, rgba(108,99,255,0.2) 0%, transparent 70%);
  pointer-events: none;
}
.hero-content { text-align: center; position: relative; max-width: 720px; }
.hero-badge {
  display: inline-block;
  background: rgba(108,99,255,0.15);
  border: 1px solid rgba(108,99,255,0.3);
  color: #a78bfa;
  padding: 0.35rem 1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}
.hero-title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1.25rem;
  color: var(--text-primary);
}
.hero-sub {
  font-size: 1.1rem;
  color: var(--text-secondary);
  max-width: 500px;
  margin: 0 auto 2rem;
  line-height: 1.6;
}
.hero-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }

/* Feed */
.feed-section { padding-top: 2.5rem; }
.feed-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}
.feed-title { font-size: 1.8rem; font-weight: 800; margin: 0; }
.feed-sub { color: var(--text-secondary); margin: 0.25rem 0 0; font-size: 0.9rem; }
.search-wrap { position: relative; min-width: 260px; }
.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}
.search-input {
  width: 100%;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.65rem 1rem 0.65rem 2.6rem;
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}
.search-input::placeholder { color: var(--text-secondary); }
.search-input:focus { border-color: var(--accent); }

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}
.state-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 1rem;
  color: var(--text-secondary);
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(108,99,255,0.2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>

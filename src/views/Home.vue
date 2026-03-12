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
        <!-- additional filters -->
        <div class="filter-group">
          <select v-model="filterDept" class="filter-select">
            <option value="">All Departments</option>
            <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
          </select>
          <select v-model="filterLevel" class="filter-select">
            <option value="">All Levels</option>
            <option v-for="l in [100,200,300,400,500]" :key="l" :value="l">{{ l }}L</option>
          </select>
        </div>
        <!-- sort toggle -->
        <div class="sort-group">
          <button
            class="sort-btn"
            :class="{ active: sortBy === 'recent' }"
            @click="sortBy = 'recent'"
          >Recent</button>
          <button
            class="sort-btn"
            :class="{ active: sortBy === 'trending' }"
            @click="sortBy = 'trending'"
          >Trending</button>
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
const filterDept = ref('')
const filterLevel = ref('')
const sortBy = ref('recent')

// derive list of departments from current videos for filtering
const departments = computed(() => {
  return [...new Set(videos.value.map(v => v.department).filter(d => !!d))].sort()
})

const filteredVideos = computed(() => {
  let vs = videos.value
  const q = searchQuery.value.toLowerCase()
  if (q) {
    vs = vs.filter(v =>
      v.title?.toLowerCase().includes(q) ||
      v.description?.toLowerCase().includes(q) ||
      v.courseCode?.toLowerCase().includes(q) ||
      v.topic?.toLowerCase().includes(q) ||
      v.department?.toLowerCase().includes(q)
    )
  }
  if (filterDept.value) {
    vs = vs.filter(v => v.department === filterDept.value)
  }
  if (filterLevel.value) {
    vs = vs.filter(v => v.level == filterLevel.value)
  }

  // sorting
  if (sortBy.value === 'trending') {
    vs = [...vs].sort((a, b) => (b.views || 0) - (a.views || 0))
  } else {
    vs = [...vs].sort((a, b) => {
      const da = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : 0
      const db = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : 0
      return db - da
    })
  }
  return vs
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

  /* filter & sort UI */
  .filter-group {
    display: flex; gap: 0.7rem; margin-top: 0.75rem;
    flex-wrap: wrap;
  }
  .filter-select {
    background: rgba(255,255,255,0.05); border: 1px solid var(--border);
    border-radius: 12px; padding: 0.5rem 0.9rem; color: var(--text-primary);
    font-size: 0.85rem; cursor: pointer; outline: none; min-width: 130px;
  }
  .filter-select option { background: #1a1b2e; }

  .sort-group {
    display: flex; gap: 0.5rem; margin-top: 0.75rem;
  }
  .sort-btn {
    background: transparent; border: 1px solid var(--border);
    color: var(--text-secondary); border-radius: 8px; padding: 0.4rem 0.9rem;
    font-size: 0.85rem; cursor: pointer; transition: all 0.15s;
  }
  .sort-btn.active {
    background: var(--accent); color: #fff; border-color: var(--accent);
  }
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

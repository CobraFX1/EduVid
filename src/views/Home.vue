<template>
  <div class="page-wrapper">
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

    <div v-else class="feed-section">
      <div class="feed-header">
        <div>
          <h1 class="feed-title">Explore <span class="gradient-text">Videos</span></h1>
          <p class="feed-sub">Discover the latest educational content</p>
        </div>
        
        <div class="search-wrap">
          <i class="bi bi-search search-icon"></i>
          <input v-model="searchQuery" class="search-input" placeholder="Search titles, topics..." />
        </div>

        <div class="filter-group">
          <select v-model="filterDept" class="filter-select">
            <option value="">All Departments</option>
            <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
          </select>

          <select v-model="filterCourse" class="filter-select" :disabled="!filterDept">
            <option value="">All Courses</option>
            <option v-for="c in availableCourseCodes" :key="c" :value="c">{{ c }}</option>
          </select>

          <select v-model="filterLevel" class="filter-select">
            <option value="">All Levels</option>
            <option v-for="l in [100,200,300,400,500]" :key="l" :value="l">{{ l }}L</option>
          </select>
        </div>

        <div class="sort-group">
          <button class="sort-btn" :class="{ active: sortBy === 'recent' }" @click="sortBy = 'recent'">Recent</button>
          <button class="sort-btn" :class="{ active: sortBy === 'trending' }" @click="sortBy = 'trending'">Trending</button>
        </div>
      </div>

      <div v-if="hasActiveFilters" class="results-info">
        <p><b>{{ filteredVideos.length }}</b> videos found matching your criteria</p>
        <button @click="resetFilters" class="btn-text-only">Clear All Filters</button>
      </div>

      <div v-if="loading" class="state-center">
        <div class="spinner"></div>
        <p>Syncing with campus feed...</p>
      </div>

      <div v-else-if="filteredVideos.length === 0" class="state-center">
        <i class="bi bi-film" style="font-size:3rem; color: var(--accent); opacity:0.5;"></i>
        <p style="margin-top:1rem; color: var(--text-secondary);">
          {{ searchQuery ? `No results for "${searchQuery}"` : 'No videos found in this category.' }}
        </p>
        <button @click="resetFilters" class="btn-glass" style="margin-top:0.5rem;">Reset Filters</button>
      </div>

      <div v-else class="video-grid">
        <VideoCard v-for="video in filteredVideos" :key="video.id" :video="video" />
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router' // Step 8 Imports
import { db } from '../firebase'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import VideoCard from '../components/VideoCard.vue'
import { useAuthStore } from '../stores/auth'

// --- 1. Router & Auth State ---
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// --- 2. Video Data State ---
const videos = ref([])
const loading = ref(true)
const unsubscribe = ref(null)

// --- 3. Filter State (Initialized from URL for Step 8) ---
const searchQuery = ref(route.query.q || '')
const filterDept = ref(route.query.dept || '')
const filterCourse = ref(route.query.course || '')
const filterLevel = ref(route.query.level || '')
const sortBy = ref(route.query.sort || 'recent')

// --- 4. Real-Time Firestore Listener ---
const startVideoListener = () => {
  loading.value = true
  // Query is ordered by date; Step 6 Composite Indexes handle the filtering performance
  const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'))
  
  unsubscribe.value = onSnapshot(q, (snap) => {
    videos.value = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    loading.value = false
  }, (error) => {
    console.error("Firestore Listener Error:", error)
    loading.value = false
  })
}

// --- 5. Step 8: URL Sync Logic ---
// Automatically updates the browser URL whenever any filter changes
watch([searchQuery, filterDept, filterCourse, filterLevel, sortBy], () => {
  const queryParams = {}
  if (searchQuery.value) queryParams.q = searchQuery.value
  if (filterDept.value) queryParams.dept = filterDept.value
  if (filterCourse.value) queryParams.course = filterCourse.value
  if (filterLevel.value) queryParams.level = filterLevel.value
  if (sortBy.value !== 'recent') queryParams.sort = sortBy.value

  // Replaces the current URL state without reloading the page
  router.replace({ query: queryParams })
}, { deep: true })

// --- 6. Lifecycle Hooks ---
onMounted(() => startVideoListener())
onUnmounted(() => { if (unsubscribe.value) unsubscribe.value() })

// --- 7. Metadata Framework Logic (Step 7) ---

// Get unique departments available in the current video list
// Replace the old computed 'departments' with this static array
const departments = [
  'Software Engineering',
  'Computer Science',
  'Cyber Security',
  'Information Technology'
]
// Dependent Filter: Only show course codes matching the selected department
const availableCourseCodes = computed(() => {
  if (!filterDept.value || videos.value.length === 0) return []
  
  // Get codes from videos that match the selected department
  const codes = videos.value
    .filter(v => v.department === filterDept.value)
    .map(v => v.courseCode)
    
  return [...new Set(codes)].sort()
})

// Reset dependent filters if the parent (department) changes
watch(filterDept, (newVal, oldVal) => {
  if (oldVal !== undefined) filterCourse.value = ''
})

const hasActiveFilters = computed(() => {
  return searchQuery.value || filterDept.value || filterLevel.value || filterCourse.value
})

const resetFilters = () => {
  searchQuery.value = ''
  filterDept.value = ''
  filterCourse.value = ''
  filterLevel.value = ''
  sortBy.value = 'recent'
}

// --- 8. Chained Filtering Engine ---
const filteredVideos = computed(() => {
  let vs = videos.value
  const q = searchQuery.value.toLowerCase().trim()
  
  // A. Search Bar (Title, Topic, or Code)
  if (q) {
    vs = vs.filter(v =>
      v.title?.toLowerCase().includes(q) ||
      v.topic?.toLowerCase().includes(q) ||
      v.courseCode?.toLowerCase().includes(q)
    )
  }
  
  // B. Department Filter
  if (filterDept.value) {
    vs = vs.filter(v => v.department === filterDept.value)
  }

  // C. Dependent Course Filter
  if (filterCourse.value) {
    vs = vs.filter(v => v.courseCode === filterCourse.value)
  }
  
  // D. Academic Level Filter
  if (filterLevel.value) {
    vs = vs.filter(v => v.level == filterLevel.value)
  }

  // E. Ranking/Sorting Logic
  if (sortBy.value === 'trending') {
    vs = [...vs].sort((a, b) => (b.views || 0) - (a.views || 0))
  } else {
    vs = [...vs].sort((a, b) => {
      const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
      const db = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
      return db - da
    })
  }
  return vs
})
</script>
<style scoped>
.page-wrapper { 
  max-width: 1280px; 
  margin: 0 auto; 
  padding: 0 1.5rem 3rem; 
}

/* --- Hero Section (Guests) --- */
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

.hero-content { 
  text-align: center; 
  position: relative; 
  max-width: 720px; 
}

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

.hero-actions { 
  display: flex; 
  gap: 1rem; 
  justify-content: center; 
  flex-wrap: wrap; 
}

/* --- Feed Header & Filters --- */
.feed-section { 
  padding-top: 2.5rem; 
}

.feed-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.feed-title { 
  font-size: 1.8rem; 
  font-weight: 800; 
  margin: 0; 
  color: var(--text-primary);
}

.feed-sub { 
  color: var(--text-secondary); 
  margin: 0.25rem 0 0; 
  font-size: 0.9rem; 
}

.search-wrap { 
  position: relative; 
  min-width: 280px; 
  flex: 1;
}

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
  background: var(--bg-card-hover, rgba(255,255,255,0.05));
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.75rem 1rem 0.75rem 2.8rem;
  color: var(--text-primary);
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus { 
  border-color: var(--accent); 
  box-shadow: 0 0 0 3px rgba(108,99,255,0.15);
}

/* --- Filter & Sort UI --- */
.filter-group {
  display: flex; 
  gap: 0.75rem; 
  flex-wrap: wrap;
}

.filter-select {
  background: var(--bg-card-hover, rgba(255,255,255,0.05)); 
  border: 1px solid var(--border);
  border-radius: 12px; 
  padding: 0.6rem 1rem; 
  color: var(--text-primary);
  font-size: 0.85rem; 
  cursor: pointer; 
  outline: none; 
  min-width: 140px;
  transition: all 0.2s;
  color-scheme: light dark;
}

.filter-select:hover:not(:disabled) {
  border-color: var(--accent);
}

.filter-select:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sort-group {
  display: flex; 
  gap: 0.5rem; 
}

.sort-btn {
  background: transparent; 
  border: 1px solid var(--border);
  color: var(--text-secondary); 
  border-radius: 10px; 
  padding: 0.5rem 1.2rem;
  font-size: 0.85rem; 
  font-weight: 600;
  cursor: pointer; 
  transition: all 0.2s;
}

.sort-btn.active {
  background: var(--accent); 
  color: #fff; 
  border-color: var(--accent);
  box-shadow: 0 4px 12px rgba(108,99,255,0.3);
}

/* --- 📊 Step 7: Results Meta Bar --- */
.results-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 0.75rem 1.25rem;
  background: rgba(108, 99, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(108, 99, 255, 0.2);
}

.results-info p { 
  margin: 0; 
  font-size: 0.9rem; 
  color: var(--text-secondary); 
}

.results-info b {
  color: var(--text-primary);
}

.btn-text-only {
  background: none; 
  border: none; 
  color: var(--accent);
  font-size: 0.85rem; 
  font-weight: 700; 
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.btn-text-only:hover {
  background: rgba(108, 99, 255, 0.1);
}

/* --- Video Grid & States --- */
.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.75rem;
}

.state-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6rem 1rem;
  color: var(--text-secondary);
  text-align: center;
}

.spinner {
  width: 44px;
  height: 44px;
  border: 3px solid rgba(108,99,255,0.15);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .feed-header { flex-direction: column; align-items: stretch; }
  .filter-group { justify-content: space-between; }
  .filter-select { flex: 1; }
  .search-wrap { width: 100%; }
}
</style>

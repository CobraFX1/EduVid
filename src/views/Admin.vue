<template>
  <div class="admin-page">
    <div class="admin-header">
      <div class="header-left">
        <h1 class="admin-title">Admin <span class="gradient-text">Dashboard</span></h1>
        
        <div class="admin-tabs">
          <button @click="activeTab = 'videos'" :class="{ active: activeTab === 'videos' }" class="tab-btn">Video Pipeline</button>
          <button @click="activeTab = 'courses'" :class="{ active: activeTab === 'courses' }" class="tab-btn">Curriculum Manager</button>
          <button @click="activeTab = 'users'" :class="{ active: activeTab === 'users' }" class="tab-btn">User Directory</button>
          <button @click="activeTab = 'moderation'" :class="{ active: activeTab === 'moderation' }" class="tab-btn">Moderation Queue</button>
          <button @click="activeTab = 'broken'" :class="{ active: activeTab === 'broken' }" class="tab-btn">Broken Links</button>
        </div>
      </div>
      <div v-if="activeTab === 'videos'" class="admin-filters">
        <button
          v-for="f in filters"
          :key="f.key"
          @click="activeFilter = f.key"
          class="filter-btn"
          :class="{ active: activeFilter === f.key }"
        >
          {{ f.label }}
          <span class="filter-count">{{ countByStatus(f.key) }}</span>
        </button>
        <button @click="fetchVideos" class="refresh-btn" :class="{ spinning: loading }">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      </div>
    </div>

    <!-- Video Pipeline Tab Content -->
    <div v-if="activeTab === 'videos'">
      <!-- Loading -->
      <div v-if="loading" class="state-center">
        <div class="spinner"></div>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredVideos.length === 0" class="state-center">
        <i class="bi bi-inbox" style="font-size:2.5rem; color:var(--accent); opacity:0.4;"></i>
        <p style="color:var(--text-secondary); margin-top:0.75rem;">No videos in this category.</p>
      </div>

      <!-- Table -->
      <div v-else class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Video</th>
              <th>Stage</th>
              <th>Status</th>
              <th>Uploader</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="video in filteredVideos" :key="video.id" class="table-row">
              <td class="col-video">
                <div class="video-thumb-wrap">
                  <img v-if="video.thumbnailUrl" :src="video.thumbnailUrl" class="vid-thumb" alt="" />
                  <div v-else class="vid-thumb-placeholder"><i class="bi bi-film"></i></div>
                </div>
                <div class="video-info">
                  <p class="vid-title">{{ video.title }}</p>
                  <p class="vid-id">ID: {{ video.id }}</p>
                </div>
              </td>
              <td class="col-stage">
                <div class="stage-wrap">
                  <div class="stage-icon" :class="stageClass(video)">
                    <i :class="stageIcon(video)"></i>
                  </div>
                  <span class="stage-label">{{ video.statusMessage || stageLabel(video) }}</span>
                </div>
              </td>
              <td>
                <span class="status-pill" :class="pillClass(video.status)">{{ video.status }}</span>
              </td>
              <td class="col-user">
                <span class="user-chip">{{ video.userEmail }}</span>
              </td>
              <td class="col-date">{{ formatDate(video.createdAt) }}</td>
              <td class="col-actions">
                <a
                  v-if="video.videoId"
                  :href="`https://www.youtube.com/watch?v=${video.videoId}`"
                  target="_blank"
                  class="action-btn yt-btn"
                  title="View on YouTube"
                >
                  <i class="bi bi-youtube"></i>
                </a>
                <button
                  @click="deleteVideo(video)"
                  class="action-btn del-btn"
                  title="Delete from Firestore"
                >
                  <i class="bi bi-trash3"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Course Management Tab -->
    <div v-if="activeTab === 'courses'">
      <CourseManager />
    </div>

    <!-- User Directory -->
    <div v-if="activeTab === 'users'">
      <UserManager />
    </div>

    <!-- Moderation Queue -->
    <div v-if="activeTab === 'moderation'">
      <ModerationQueue />
    </div>

    <!-- Broken Links -->
    <div v-if="activeTab === 'broken'">
      <BrokenLinks />
    </div>

    <!-- Stats cards (Videos specific) -->
    <div v-if="activeTab === 'videos'" class="stats-row">
      <div class="stat-card glass-card" v-for="stat in stats" :key="stat.label">
        <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db } from '../firebase'
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore'
import { decrementCourseCount } from '../utils/course'
import CourseManager from '../components/CourseManager.vue'
import UserManager from '../components/UserManager.vue'
import ModerationQueue from '../components/ModerationQueue.vue'
import BrokenLinks from '../components/BrokenLinks.vue'

const activeTab = ref('videos')
const videos = ref([])
const loading = ref(true)
const activeFilter = ref('all')

const filters = [
  { key: 'all', label: 'All' },
  { key: 'processing', label: 'Processing' },
  { key: 'ready', label: 'Ready' },
  { key: 'error', label: 'Error' },
]

const filteredVideos = computed(() => {
  if (activeFilter.value === 'all') return videos.value
  return videos.value.filter(v => v.status === activeFilter.value)
})

const countByStatus = (key) => {
  if (key === 'all') return videos.value.length
  return videos.value.filter(v => v.status === key).length
}

const stats = computed(() => [
  { label: 'Total Uploads', value: videos.value.length, color: 'var(--accent)' },
  { label: 'Published', value: countByStatus('ready'), color: '#4ade80' },
  { label: 'Processing', value: countByStatus('processing'), color: '#fbbf24' },
  { label: 'Errors', value: countByStatus('error'), color: '#f87171' },
])

const stageLabel = (video) => {
  const map = {
    processing: 'Queued / Processing',
    uploading_to_youtube: 'Uploading to YouTube...',
    finalizing: 'Finalizing...',
    complete: 'Complete',
    error: 'Failed',
    ready: 'Published',
  }
  return map[video.stage] || map[video.status] || video.stage || video.status
}

const stageIcon = (video) => {
  const icons = {
    processing: 'bi bi-hourglass-split',
    uploading_to_youtube: 'bi bi-cloud-upload',
    finalizing: 'bi bi-file-check',
    complete: 'bi bi-check2-circle',
    ready: 'bi bi-check2-circle',
    error: 'bi bi-x-circle',
  }
  return icons[video.stage] || icons[video.status] || 'bi bi-hourglass'
}

const stageClass = (video) => {
  const s = video.stage || video.status
  if (s === 'ready' || s === 'complete') return 'stage-ready'
  if (s === 'error') return 'stage-error'
  return 'stage-active'
}

const pillClass = (status) => ({
  ready: 'pill-ready',
  processing: 'pill-processing',
  error: 'pill-error',
}[status] || 'pill-processing')

const fetchVideos = async () => {
  loading.value = true
  try {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    videos.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const deleteVideo = async (video) => {
  if (!confirm('Delete this Firestore record?')) return
  await deleteDoc(doc(db, 'videos', video.id))
  if (video.courseCode) {
    decrementCourseCount(video.courseCode)
  }
  videos.value = videos.value.filter(v => v.id !== video.id)
}

const formatDate = (ts) => {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
}

onMounted(fetchVideos)
</script>

<style scoped>
.admin-page { max-width: 1280px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }

.admin-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  flex-wrap: wrap; gap: 1.25rem; margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem;
}
.header-left { display: flex; flex-direction: column; gap: 1rem; }
.admin-title { font-size: 1.8rem; font-weight: 800; margin: 0; }
.admin-sub { color: var(--text-secondary); font-size: 0.875rem; margin: 0.25rem 0 0; }

.admin-tabs { display: flex; gap: 1.5rem; }
.tab-btn {
  background: transparent; border: none; color: var(--text-secondary);
  font-size: 0.95rem; font-weight: 600; cursor: pointer; padding: 0 0 0.5rem;
  border-bottom: 2px solid transparent; transition: all 0.2s; position: relative; top: 1.5rem;
}
.tab-btn:hover { color: var(--text-primary); }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }

.admin-filters { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.filter-btn {
  background: var(--bg-card); border: 1px solid var(--border);
  color: var(--text-secondary); border-radius: 999px;
  padding: 0.4rem 1rem; font-size: 0.8rem; font-weight: 600;
  cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.filter-btn.active {
  background: rgba(108,99,255,0.15);
  border-color: rgba(108,99,255,0.4);
  color: var(--accent);
}
.filter-count {
  background: rgba(108,99,255,0.12); color: var(--accent);
  border-radius: 999px; padding: 0 7px; font-size: 0.7rem;
}
.refresh-btn {
  background: var(--bg-card); border: 1px solid var(--border);
  color: var(--text-secondary); border-radius: 8px;
  padding: 0.4rem 0.6rem; cursor: pointer; transition: background 0.15s;
}
.refresh-btn:hover { background: var(--bg-card-hover); color: var(--accent); }
.spinning i { animation: spin 1s linear infinite; display: inline-block; }

/* Table */
.admin-table-wrap {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 16px; overflow: hidden; margin-bottom: 2rem;
}
.admin-table { width: 100%; border-collapse: collapse; }
.admin-table th {
  font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--text-secondary);
  padding: 0.9rem 1.1rem; text-align: left;
  border-bottom: 1px solid var(--border);
  background: rgba(108,99,255,0.04);
}
.table-row { border-bottom: 1px solid var(--border); transition: background 0.12s; }
.table-row:hover { background: var(--bg-card-hover); }
.table-row:last-child { border-bottom: none; }
.admin-table td { padding: 0.9rem 1.1rem; vertical-align: middle; }

/* Video column */
.col-video { display: flex; align-items: center; gap: 0.9rem; min-width: 220px; }
.vid-thumb { width: 68px; height: 42px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
.vid-thumb-placeholder {
  width: 68px; height: 42px; border-radius: 6px; flex-shrink: 0;
  background: rgba(108,99,255,0.1); display: flex; align-items: center;
  justify-content: center; color: var(--accent); opacity: 0.5;
}
.vid-title { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); margin: 0; }
.vid-id { font-size: 0.7rem; color: var(--text-secondary); margin: 0.2rem 0 0; font-family: monospace; }

/* Stage column */
.col-stage { min-width: 200px; }
.stage-wrap { display: flex; align-items: center; gap: 0.6rem; }
.stage-icon {
  width: 30px; height: 30px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.85rem; flex-shrink: 0;
}
.stage-active { background: rgba(251,191,36,0.12); color: #fbbf24; animation: pulse 2s infinite; }
.stage-ready { background: rgba(74,222,128,0.12); color: #4ade80; }
.stage-error { background: rgba(248,113,113,0.12); color: #f87171; }
.stage-label { font-size: 0.8rem; color: var(--text-secondary); }

/* Pills */
.status-pill {
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; padding: 3px 10px; border-radius: 999px;
}
.pill-ready { background: rgba(34,197,94,0.12); color: #4ade80; }
.pill-processing { background: rgba(234,179,8,0.12); color: #fbbf24; }
.pill-error { background: rgba(239,68,68,0.12); color: #f87171; }

/* Other columns */
.col-user .user-chip {
  font-size: 0.75rem; color: var(--text-secondary);
  font-style: italic; max-width: 180px;
  display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.col-date { font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap; }
.col-actions { display: flex; gap: 0.5rem; align-items: center; }
.action-btn {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.85rem; cursor: pointer; border: 1px solid var(--border);
  text-decoration: none; transition: background 0.15s;
}
.yt-btn { background: rgba(255,0,0,0.08); color: #f87171; }
.yt-btn:hover { background: rgba(255,0,0,0.18); }
.del-btn { background: transparent; color: var(--text-secondary); }
.del-btn:hover { background: rgba(239,68,68,0.12); color: #f87171; }

/* Stats */
.stats-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
.stat-card { padding: 1.25rem 1.5rem; }
.stat-value { font-size: 2rem; font-weight: 800; }
.stat-label { font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem; }

.state-center {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 5rem 1rem;
}
.spinner {
  width: 36px; height: 36px;
  border: 3px solid rgba(108,99,255,0.15);
  border-top-color: var(--accent); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }

/* Mobile Optimizations */
@media (max-width: 860px) {
  .admin-header { flex-direction: column; align-items: flex-start; }
  .admin-tabs { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .admin-tabs::-webkit-scrollbar { display: none; }
  .tab-btn { white-space: nowrap; flex-shrink: 0; }
  .admin-table-wrap { overflow-x: auto; }
  .admin-table { min-width: 800px; }
  .stats-row { grid-template-columns: 1fr; }
}
</style>

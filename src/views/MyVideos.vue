<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h1 class="page-title">My <span class="gradient-text">Contributions</span></h1>
      <p class="page-sub">Manage your uploaded videos, view ratings and flags</p>
    </div>

    <div v-if="loading" class="state-center"><div class="spinner"></div></div>

    <div v-else-if="videos.length === 0" class="state-center">
      <i class="bi bi-camera-video-off" style="font-size:3rem; opacity:0.3;"></i>
      <p style="margin-top:1rem; color:var(--text-secondary);">You haven't uploaded any videos yet.</p>
      <router-link to="/upload" class="btn-gradient" style="margin-top:1rem;">Upload your first video</router-link>
    </div>

    <div v-else class="contributions-list">
      <div v-for="video in videos" :key="video.id" class="contribution-card glass-card">
        <div class="contrib-thumb-wrap">
          <img v-if="video.thumbnailUrl" :src="video.thumbnailUrl" class="contrib-thumb" alt="" />
          <div v-else class="contrib-thumb-ph"><i class="bi bi-film"></i></div>
        </div>

        <div class="contrib-info">
          <div class="contrib-top">
            <h3 class="contrib-title">{{ video.title }}</h3>
            <div class="contrib-tags">
              <span v-if="video.courseCode" class="course-tag">{{ video.courseCode }}</span>
              <span class="status-pill" :class="pillClass(video.status)">{{ video.status }}</span>
              <span v-if="video.isFlagged" class="flagged-tag"><i class="bi bi-flag-fill me-1"></i>Flagged</span>
            </div>
          </div>
          <p class="contrib-desc">{{ video.description || 'No description.' }}</p>
          <div class="contrib-stats">
            <span><i class="bi bi-eye me-1"></i>{{ video.views || 0 }} views</span>
            <span><i class="bi bi-star-fill me-1" style="color:#fbbf24;"></i>{{ video.avgRating?.toFixed(1) || 'No ratings' }}</span>
            <span>{{ formatDate(video.createdAt) }}</span>
          </div>
        </div>

        <div class="contrib-actions">
          <router-link v-if="video.videoId" :to="`/watch/${video.id}`" class="action-btn watch-btn" title="Watch">
            <i class="bi bi-play-circle"></i>
          </router-link>
          <a v-if="video.videoId" :href="`https://www.youtube.com/watch?v=${video.videoId}`" target="_blank" class="action-btn yt-btn" title="YouTube">
            <i class="bi bi-youtube"></i>
          </a>
          <button @click="deleteVideo(video)" class="action-btn del-btn" title="Delete">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../firebase'
import { collection, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore'
import { useAuthStore } from '../stores/auth'
import { decrementCourseCount } from '../utils/course'

const authStore = useAuthStore()
const videos = ref([])
const loading = ref(true)

const fetchVideos = async () => {
  loading.value = true
  const snap = await getDocs(
    query(collection(db, 'videos'),
      where('userId', '==', authStore.user.uid),
      orderBy('createdAt', 'desc'))
  )
  videos.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  loading.value = false
}

const deleteVideo = async (video) => {
  if (!confirm('Delete this video? This cannot be undone.')) return
  await deleteDoc(doc(db, 'videos', video.id))
  if (video.courseCode) {
    decrementCourseCount(video.courseCode)
  }
  videos.value = videos.value.filter(v => v.id !== video.id)
}

const pillClass = (status) => ({ ready: 'pill-ready', processing: 'pill-processing', error: 'pill-error' }[status] || 'pill-processing')
const formatDate = (ts) => {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
}

onMounted(fetchVideos)
</script>

<style scoped>
.page-wrapper { max-width: 1100px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
.page-header { margin-bottom: 2rem; }
.page-title { font-size: 1.8rem; font-weight: 800; margin: 0; }
.page-sub { color: var(--text-secondary); margin: 0.3rem 0 0; font-size: 0.9rem; }
.contributions-list { display: flex; flex-direction: column; gap: 1rem; }
.contribution-card { display: flex; gap: 1.25rem; padding: 1.25rem; align-items: flex-start; }
.contrib-thumb-wrap { flex-shrink: 0; }
.contrib-thumb { width: 140px; height: 84px; object-fit: cover; border-radius: 10px; }
.contrib-thumb-ph { width: 140px; height: 84px; border-radius: 10px; background: rgba(108,99,255,0.1); display: flex; align-items: center; justify-content: center; color: var(--accent); font-size: 1.5rem; opacity: 0.5; }
.contrib-info { flex: 1; min-width: 0; }
.contrib-top { display: flex; align-items: flex-start; gap: 0.75rem; justify-content: space-between; flex-wrap: wrap; margin-bottom: 0.4rem; }
.contrib-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
.contrib-tags { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.course-tag { background: rgba(108,99,255,0.12); color: var(--accent); border-radius: 999px; padding: 2px 9px; font-size: 0.7rem; font-weight: 700; }
.flagged-tag { background: rgba(251,191,36,0.12); color: #fbbf24; border-radius: 999px; padding: 2px 9px; font-size: 0.7rem; font-weight: 700; }
.status-pill { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 9px; border-radius: 999px; }
.pill-ready { background: rgba(34,197,94,0.12); color: #4ade80; }
.pill-processing { background: rgba(234,179,8,0.12); color: #fbbf24; }
.pill-error { background: rgba(239,68,68,0.12); color: #f87171; }
.contrib-desc { font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.contrib-stats { display: flex; gap: 1rem; font-size: 0.75rem; color: var(--text-secondary); }
.contrib-actions { display: flex; flex-direction: column; gap: 0.4rem; }
.action-btn { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; cursor: pointer; border: 1px solid var(--border); text-decoration: none; transition: background 0.15s; background: transparent; }
.watch-btn { color: var(--accent); }
.watch-btn:hover { background: rgba(108,99,255,0.12); }
.yt-btn { color: #f87171; }
.yt-btn:hover { background: rgba(255,0,0,0.1); }
.del-btn { color: var(--text-secondary); }
.del-btn:hover { background: rgba(239,68,68,0.1); color: #f87171; }
.state-center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem 1rem; }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(108,99,255,0.15); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

<template>
  <div class="page-wrapper">
    <div v-if="loading" class="state-center"><div class="spinner"></div></div>
    <template v-else-if="course">
      <!-- Header -->
      <div class="course-hero">
        <router-link to="/courses" class="back-btn">
          <i class="bi bi-arrow-left"></i> Course Catalog
        </router-link>
        <div class="hero-badge">{{ course.level }} Level · {{ course.department }}</div>
        <h1 class="hero-code gradient-text">{{ course.code }}</h1>
        <p class="hero-title">{{ course.title }}</p>
        <p v-if="course.description" class="hero-desc">{{ course.description }}</p>
      </div>

      <!-- Videos for this course -->
      <div class="section-header">
        <h2 class="section-title">Peer Videos <span class="count-chip">{{ videos.length }}</span></h2>
        <router-link to="/upload" class="btn-gradient">
          <i class="bi bi-upload me-1"></i> Upload for this course
        </router-link>
      </div>

      <div v-if="videos.length === 0" class="state-center" style="padding:3rem 0;">
        <i class="bi bi-camera-video" style="font-size:2.5rem; opacity:0.3;"></i>
        <p style="color:var(--text-secondary); margin-top:0.75rem;">No videos uploaded yet for this course.</p>
        <router-link to="/upload" class="btn-gradient" style="margin-top:1rem;">Be the first to upload</router-link>
      </div>
      <div v-else class="video-grid">
        <VideoCard v-for="video in videos" :key="video.id" :video="video" @deleted="fetchVideos" />
      </div>
    </template>

    <div v-else class="state-center">
      <i class="bi bi-exclamation-circle" style="font-size:2.5rem; opacity:0.3;"></i>
      <p style="color:var(--text-secondary); margin-top:0.75rem;">Course not found.</p>
      <router-link to="/courses" class="btn-glass" style="margin-top:1rem;">Back to Catalog</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { db } from '../firebase'
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore'
import VideoCard from '../components/VideoCard.vue'

const route = useRoute()
const course = ref(null)
const videos = ref([])
const loading = ref(true)

const fetchVideos = async () => {
  const snap = await getDocs(
    query(collection(db, 'videos'), where('courseCode', '==', route.params.code), where('status', '==', 'ready'))
  )
  const results = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  results.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
  videos.value = results
}

onMounted(async () => {
  try {
    // Load course info
    const courseSnap = await getDocs(
      query(collection(db, 'courses'), where('code', '==', route.params.code))
    )
    if (!courseSnap.empty) course.value = { id: courseSnap.docs[0].id, ...courseSnap.docs[0].data() }
    await fetchVideos()
  } catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>

<style scoped>
.page-wrapper { max-width: 1280px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
.back-btn {
  display: inline-flex; align-items: center; gap: 0.4rem;
  color: var(--text-secondary); text-decoration: none; font-size: 0.875rem;
  margin-bottom: 1.5rem; transition: color 0.15s;
}
.back-btn:hover { color: var(--accent); }
.course-hero { margin-bottom: 2.5rem; }
.hero-badge {
  font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--text-secondary); margin-bottom: 0.5rem;
}
.hero-code { font-size: 2.5rem; font-weight: 900; margin: 0 0 0.25rem; }
.hero-title { font-size: 1.15rem; color: var(--text-primary); margin: 0 0 0.5rem; font-weight: 600; }
.hero-desc { color: var(--text-secondary); font-size: 0.9rem; max-width: 600px; margin: 0; }
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
}
.section-title { font-size: 1.2rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
.count-chip {
  background: rgba(108,99,255,0.12); color: var(--accent);
  border-radius: 999px; padding: 2px 10px; font-size: 0.8rem;
}
.video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
.state-center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem 1rem; }
.spinner {
  width: 36px; height: 36px; border: 3px solid rgba(108,99,255,0.15);
  border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>

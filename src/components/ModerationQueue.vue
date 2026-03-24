<template>
  <div class="moderation-queue section-block">
    <div class="header">
      <h2>Moderation Queue</h2>
      <p class="sub-text">Videos formally flagged by students for inappropriate content, copyright claims, or spam.</p>
    </div>

    <div v-if="loading" class="state-center"><div class="spinner"></div></div>
    
    <div v-else-if="flaggedVideos.length === 0" class="empty-state">
      <i class="bi bi-shield-check" style="font-size: 2.5rem; color: #4ade80; margin-bottom: 0.5rem;"></i>
      <p>Clean queue! There are absolutely no community flags.</p>
    </div>

    <div v-else class="queue-grid">
      <div v-for="video in flaggedVideos" :key="video.id" class="item-card glass-card">
        <div class="video-info">
          <div class="thumb-wrap">
            <img v-if="video.thumbnailUrl" :src="video.thumbnailUrl" class="vid-thumb" />
            <div v-else class="vid-thumb-ph"><i class="bi bi-film"></i></div>
          </div>
          <div class="details">
            <p class="vid-title">{{ video.title }}</p>
            <p class="vid-sub">{{ video.courseCode }} · Uploaded by {{ video.userEmail }}</p>
          </div>
        </div>

        <div class="flag-alerts">
             <div class="alert-box" style="flex-wrap: wrap;">
               <i class="bi bi-flag-fill"></i> 
               <span v-if="video.flaggedReasons && video.flaggedReasons.length">
                 Flagged for: <strong>{{ video.flaggedReasons.join(', ') }}</strong>
               </span>
               <span v-else>Flagged for moderation review. Action required.</span>
             </div>
        </div>

        <div class="card-actions">
          <button @click="dismissFlags(video.id)" class="btn-glass"><i class="bi bi-check-circle me-1"></i> Dismiss</button>
          
          <a v-if="video.videoId" :href="`https://www.youtube.com/watch?v=${video.videoId}`" target="_blank" class="btn-glass yt-btn" title="Watch on YouTube">
            <i class="bi bi-youtube"></i> Watch
          </a>

          <button @click="banUploader(video.userId, video.userEmail)" class="btn-delete" title="Ban Uploader" style="background: rgba(0,0,0,0.4); border-color: #f87171;">
            <i class="bi bi-person-x-fill"></i> Ban User
          </button>
          
          <button @click="deleteVideo(video.id)" class="btn-delete" title="Permanently Delete Video">
            <i class="bi bi-trash3"></i> Delete Video
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../firebase'
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore'

const flaggedVideos = ref([])
const loading = ref(true)

onMounted(() => {
  const q = query(collection(db, 'videos'), where('isFlagged', '==', true))
  const unsub = onSnapshot(q, (snap) => {
    flaggedVideos.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    loading.value = false
  })
  return () => unsub()
})

const dismissFlags = async (id) => {
  if (!confirm("Dismiss all flags and restore video standing?")) return
  try {
    await updateDoc(doc(db, 'videos', id), { 
      isFlagged: false,
      flaggedReasons: [] 
    })
  } catch(e) { alert(e.message) }
}

const deleteVideo = async (id) => {
  if (!confirm("Permanently block and delete this flagged video?")) return
  try {
    await deleteDoc(doc(db, 'videos', id))
  } catch(e) { alert(e.message) }
}

const banUploader = async (uid, email) => {
  if (!confirm(`Permanently BAN ${email} from uploading?`)) return
  try {
    await updateDoc(doc(db, 'users', uid), { isBanned: true })
    alert(`${email} has been globally banned.`)
  } catch(e) { alert(e.message) }
}
</script>

<style scoped>
.section-block { padding: 1.5rem 0; width: 100%; display: flex; flex-direction: column; gap: 1rem; }
.header { border-bottom: 1px solid var(--border); padding-bottom: 1rem; }
.header h2 { font-size: 1.3rem; font-weight: 700; margin: 0; color: var(--text-primary); }
.sub-text { margin: 0.35rem 0 0; color: var(--text-secondary); font-size: 0.85rem; }

.empty-state { text-align: center; padding: 4rem 1rem; color: var(--text-primary); background: var(--bg-card); border: 1px dashed var(--border); border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.empty-state p { margin:0; font-weight: 500; }

.queue-grid { display: flex; flex-direction: column; gap: 1.25rem; }
.item-card { padding: 1.5rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; display: flex; flex-direction: column; gap: 1rem; }
.video-info { display: flex; gap: 1rem; align-items: flex-start; }
.thumb-wrap { flex-shrink: 0; }
.vid-thumb, .vid-thumb-ph { width: 140px; height: 80px; border-radius: 10px; object-fit: cover; }
.vid-thumb-ph { background: rgba(108,99,255,0.1); display: flex; align-items: center; justify-content: center; color: var(--accent); font-size: 1.5rem; }
.details { flex: 1; }
.vid-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.4rem; }
.vid-sub { font-size: 0.85rem; color: var(--text-secondary); margin: 0; }

.flag-alerts { margin: 0.5rem 0; }
.alert-box { background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); color: #fbbf24; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; }

.card-actions { display: flex; gap: 0.75rem; border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 0.5rem; justify-content: flex-end; flex-wrap: wrap;}
.btn-glass { border: 1px solid var(--border); color: var(--text-primary); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; background: transparent; font-size: 0.85rem; text-decoration: none; display: flex; align-items: center; transition: background 0.2s;}
.btn-glass:hover { background: var(--bg-card-hover); }
.yt-btn { color: #f87171; border-color: rgba(239,68,68,0.3); gap: 0.4rem;}
.yt-btn:hover { background: rgba(239,68,68,0.1); }
.btn-delete { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; transition: background 0.15s;}
.btn-delete:hover { background: rgba(239,68,68,0.25); }

.state-center { text-align: center; padding: 3rem; }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(108,99,255,0.15); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

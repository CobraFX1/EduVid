<template>
  <div class="video-card glass-card" :class="{ playing: isPlaying }">
    <!-- Thumbnail / Player -->
    <div class="video-wrapper" @click="handlePlay">
      <template v-if="video.status === 'ready' && video.videoId">
        <div class="thumbnail-overlay">
          <img :src="video.thumbnailUrl" class="thumbnail-img" alt="Thumbnail" />
          <div class="play-overlay">
            <div class="play-btn"><i class="bi bi-play-fill"></i></div>
          </div>
        </div>
      </template>

      <div v-else-if="video.status === 'processing'" class="thumb-placeholder">
        <div class="mini-spinner"></div>
        <span>Processing...</span>
      </div>

      <div v-else class="thumb-placeholder">
        <i class="bi bi-film" style="font-size:2rem; opacity:0.3;"></i>
      </div>

      <!-- Status badge -->
      <span class="status-badge" :class="statusClass">{{ video.status }}</span>
    </div>

    <!-- Card Body -->
    <div class="card-body">
      <h3 class="video-title">{{ video.title }}</h3>
      <p class="video-desc">{{ video.description || 'No description provided.' }}</p>

      <div class="card-meta">
        <div class="meta-left">
          <span class="meta-item"><i class="bi bi-eye"></i> {{ currentViews }}</span>
          <span class="meta-item">{{ formatDate(video.createdAt) }}</span>
        </div>

        <!-- Delete (only for the owner) -->
        <button
          v-if="authStore.user?.uid === video.userId"
          @click.stop="confirmDelete"
          class="delete-btn"
          title="Delete video"
          :disabled="deleting"
        >
          <i class="bi bi-trash3"></i>
        </button>
      </div>
    </div>

    <!-- Delete confirmation dialog -->
    <div v-if="showConfirm" class="confirm-overlay" @click.self="showConfirm = false">
      <div class="confirm-box glass-card">
        <i class="bi bi-exclamation-triangle-fill" style="font-size:2rem; color:#fbbf24;"></i>
        <h4>Delete video?</h4>
        <p>This will remove the Firestore record. The YouTube video will remain on your channel.</p>
        <div class="confirm-actions">
          <button class="btn-glass" @click="showConfirm = false">Cancel</button>
          <button class="btn-delete" @click="deleteVideo" :disabled="deleting">
            <span v-if="deleting"><i class="bi bi-arrow-repeat spin"></i></span>
            <span v-else>Delete</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../firebase'
import { doc, deleteDoc } from 'firebase/firestore'
import { useAuthStore } from '../stores/auth'

const props = defineProps({ video: { type: Object, required: true } })
const emit = defineEmits(['deleted'])

const authStore = useAuthStore()
const router = useRouter()
const currentViews = ref(props.video.views || 0)
const showConfirm = ref(false)
const deleting = ref(false)

const statusClass = {
  ready: 'badge-ready',
  processing: 'badge-processing',
  error: 'badge-error'
}[props.video.status] || 'badge-processing'

const handlePlay = () => {
  if (props.video.status !== 'ready') return
  router.push(`/watch/${props.video.id}`)
}

const confirmDelete = () => { showConfirm.value = true }

const deleteVideo = async () => {
  deleting.value = true
  try {
    await deleteDoc(doc(db, 'videos', props.video.id))
    emit('deleted')
  } catch (e) {
    console.error(e)
  } finally {
    deleting.value = false
    showConfirm.value = false
  }
}

const formatDate = (ts) => {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(d)
}
</script>

<style scoped>
.video-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s;
}
.video-card:hover { transform: translateY(-3px); }

/* Video area */
.video-wrapper {
  position: relative;
  aspect-ratio: 16/9;
  background: #0a0b15;
  cursor: pointer;
  overflow: hidden;
  border-radius: 16px 16px 0 0;
}
.video-frame { width: 100%; height: 100%; display: block; }
.thumbnail-overlay { position: absolute; inset: 0; }
.thumbnail-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s; }
.video-wrapper:hover .thumbnail-img { transform: scale(1.03); }

/* Play button — absolutely centered */
.play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.25);
  opacity: 0;
  transition: opacity 0.2s;
}
.video-wrapper:hover .play-overlay { opacity: 1; }

.play-btn {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #6c63ff, #a855f7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #fff;
  box-shadow: 0 4px 24px rgba(108,99,255,0.5);
  transform: scale(0.85);
  transition: transform 0.2s;
}
.video-wrapper:hover .play-btn { transform: scale(1); }

.thumb-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
}
.mini-spinner {
  width: 28px; height: 28px;
  border: 2px solid rgba(108,99,255,0.2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* Status badge */
.status-badge {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 3px 9px;
  border-radius: 999px;
}
.badge-ready { background: rgba(34,197,94,0.15); color: #4ade80; }
.badge-processing { background: rgba(234,179,8,0.15); color: #fbbf24; }
.badge-error { background: rgba(239,68,68,0.15); color: #f87171; }

/* Card text */
.card-body { padding: 1.1rem 1.25rem 1.25rem; flex: 1; display: flex; flex-direction: column; }
.video-title {
  font-size: 0.975rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.4rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.video-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0 0 0.75rem;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border);
  padding-top: 0.7rem;
}
.meta-left { display: flex; gap: 0.85rem; }
.meta-item { font-size: 0.75rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.3rem; }

/* Delete button */
.delete-btn {
  background: transparent;
  border: 1px solid rgba(239,68,68,0.2);
  color: #f87171;
  border-radius: 8px;
  padding: 0.3rem 0.55rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s;
}
.delete-btn:hover { background: rgba(239,68,68,0.12); }
.delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Confirm dialog */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  backdrop-filter: blur(4px);
}
.confirm-box {
  max-width: 360px;
  width: 90%;
  padding: 2rem;
  text-align: center;
}
.confirm-box h4 { font-weight: 700; margin: 0.75rem 0 0.5rem; color: var(--text-primary); }
.confirm-box p { color: var(--text-secondary); font-size: 0.875rem; margin: 0 0 1.5rem; }
.confirm-actions { display: flex; gap: 0.75rem; justify-content: center; }
.btn-delete {
  background: rgba(239,68,68,0.15);
  border: 1px solid rgba(239,68,68,0.3);
  color: #f87171;
  border-radius: 12px;
  padding: 0.65rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-delete:hover { background: rgba(239,68,68,0.25); }
.spin { display: inline-block; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

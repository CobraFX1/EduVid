<template>
  <div class="watch-page">
    <div v-if="loading" class="state-center"><div class="spinner"></div></div>
    <template v-else-if="video">
      <div class="watch-layout">
        <!-- Main player column -->
        <div class="player-col">
          <!-- YouTube embed -->
          <div class="player-wrap">
            <iframe
              v-if="video.videoId"
              :src="`https://www.youtube.com/embed/${video.videoId}?autoplay=1`"
              title="YouTube video player" frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen class="player-iframe"
            ></iframe>
            <div v-else class="player-placeholder">
              <i class="bi bi-hourglass-split"></i>
              <p>Video is being processed...</p>
            </div>
          </div>

          <!-- Video info -->
          <div class="video-info-card glass-card">
            <div class="info-top">
              <div>
                <span v-if="video.courseCode" class="course-tag">{{ video.courseCode }}</span>
                <span v-if="video.topic" class="topic-tag">{{ video.topic }}</span>
              </div>
              <span class="status-pill" :class="video.status === 'ready' ? 'pill-ready' : 'pill-processing'">
                {{ video.status }}
              </span>
            </div>
            <h1 class="video-title">{{ video.title }}</h1>
            <div class="video-meta">
              <span><i class="bi bi-eye me-1"></i>{{ video.views || 0 }} views</span>
              <span>·</span>
              <span>{{ formatDate(video.createdAt) }}</span>
              <span>·</span>
              <span>By {{ video.userEmail }}</span>
            </div>
            <p v-if="video.description" class="video-desc">{{ video.description }}</p>

            <!-- Actions row -->
            <div class="actions-row">
              <!-- Clarity Rating -->
              <div class="rating-group">
                <span class="action-label">Clarity</span>
                <div class="stars">
                  <button
                    v-for="s in 5" :key="s"
                    @click="submitRating(s)"
                    class="star-btn"
                    :class="{ active: s <= (myRating || video.avgRating) }"
                  >
                    <i :class="s <= (myRating || video.avgRating) ? 'bi bi-star-fill' : 'bi bi-star'"></i>
                  </button>
                </div>
                <span class="rating-avg">{{ video.avgRating?.toFixed(1) || '—' }} / 5</span>
              </div>

              <!-- Flag button -->
              <button @click="showFlagModal = true" class="flag-btn" :class="{ flagged: video.isFlagged }">
                <i :class="video.isFlagged ? 'bi bi-flag-fill' : 'bi bi-flag'"></i>
                {{ video.isFlagged ? 'Flagged' : 'Flag content' }}
              </button>
            </div>
          </div>

          <!-- Comments -->
          <div class="comments-section glass-card">
            <h3 class="comments-title">Comments <span class="count-chip">{{ comments.length }}</span></h3>

            <!-- Add comment -->
            <div v-if="authStore.user" class="add-comment">
              <textarea
                v-model="newComment"
                class="form-dark comment-input"
                placeholder="Share your thoughts or ask a question..."
                rows="2"
              ></textarea>
              <button @click="submitComment" class="btn-gradient comment-submit" :disabled="!newComment.trim() || submittingComment">
                <span v-if="submittingComment"><i class="bi bi-arrow-repeat spin"></i></span>
                <span v-else>Post</span>
              </button>
            </div>
            <p v-else class="login-prompt">
              <router-link to="/login" class="auth-link">Sign in</router-link> to leave a comment.
            </p>

            <div v-if="comments.length === 0 && !loadingComments" class="no-comments">
              <i class="bi bi-chat-dots" style="font-size:1.5rem; opacity:0.3;"></i>
              <p>No comments yet. Be the first!</p>
            </div>
            <div class="comment-list">
              <div v-for="c in comments" :key="c.id" class="comment-item">
                <div class="comment-avatar">{{ (c.userEmail || 'U')[0].toUpperCase() }}</div>
                <div class="comment-body">
                  <div class="comment-header">
                    <span class="comment-author">{{ c.userEmail }}</span>
                    <span class="comment-date">{{ formatDate(c.createdAt) }}</span>
                  </div>
                  <p class="comment-text">{{ c.text }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="sidebar-col">
          <h3 class="sidebar-title">More Videos</h3>
          <div v-for="v in relatedVideos" :key="v.id" class="related-card glass-card" @click="$router.push(`/watch/${v.id}`)">
            <img v-if="v.thumbnailUrl" :src="v.thumbnailUrl" class="related-thumb" alt="" />
            <div v-else class="related-thumb-ph"><i class="bi bi-film"></i></div>
            <div class="related-info">
              <p class="related-title">{{ v.title }}</p>
              <p class="related-meta">{{ v.courseCode }} · {{ v.views || 0 }} views</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Flag modal -->
    <div v-if="showFlagModal" class="modal-overlay" @click.self="showFlagModal = false">
      <div class="modal-box glass-card">
        <h4><i class="bi bi-flag-fill me-2" style="color:#fbbf24;"></i>Flag this content</h4>
        <p>Why are you flagging this video?</p>
        <div class="flag-options">
          <label v-for="reason in flagReasons" :key="reason" class="flag-option">
            <input type="radio" v-model="flagReason" :value="reason" />
            <span>{{ reason }}</span>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn-glass" @click="showFlagModal = false">Cancel</button>
          <button class="btn-delete" @click="submitFlag" :disabled="!flagReason || submittingFlag">
            {{ submittingFlag ? 'Submitting...' : 'Submit Flag' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { db } from '../firebase'
import {
  doc, getDoc, collection, getDocs, addDoc, updateDoc,
  query, orderBy, where, serverTimestamp, increment, limit
} from 'firebase/firestore'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const authStore = useAuthStore()
const video = ref(null)
const loading = ref(true)
const comments = ref([])
const loadingComments = ref(true)
const relatedVideos = ref([])
const newComment = ref('')
const submittingComment = ref(false)
const myRating = ref(0)
const showFlagModal = ref(false)
const flagReason = ref('')
const submittingFlag = ref(false)
const flagReasons = [
  'Inaccurate academic content',
  'Inappropriate or offensive',
  'Copyright infringement',
  'Spam or misleading',
  'Other'
]

const videoId = route.params.id

const loadComments = async () => {
  const snap = await getDocs(
    query(collection(db, 'videos', videoId, 'comments'), orderBy('createdAt', 'desc'))
  )
  comments.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  loadingComments.value = false
}

const submitComment = async () => {
  if (!newComment.value.trim() || !authStore.user) return
  submittingComment.value = true
  await addDoc(collection(db, 'videos', videoId, 'comments'), {
    text: newComment.value.trim(),
    userId: authStore.user.uid,
    userEmail: authStore.user.email,
    createdAt: serverTimestamp()
  })
  newComment.value = ''
  submittingComment.value = false
  await loadComments()
}

const submitRating = async (stars) => {
  if (!authStore.user) return
  myRating.value = stars
  const ratingsRef = collection(db, 'videos', videoId, 'ratings')
  const existing = await getDocs(query(ratingsRef, where('userId', '==', authStore.user.uid)))
  if (!existing.empty) {
    await updateDoc(existing.docs[0].ref, { rating: stars })
  } else {
    await addDoc(ratingsRef, { userId: authStore.user.uid, rating: stars, createdAt: serverTimestamp() })
  }
  // Recompute average
  const allRatings = await getDocs(ratingsRef)
  const avg = allRatings.docs.reduce((s, d) => s + d.data().rating, 0) / allRatings.size
  await updateDoc(doc(db, 'videos', videoId), { avgRating: avg })
  video.value.avgRating = avg
}

const submitFlag = async () => {
  if (!flagReason.value || !authStore.user) return
  submittingFlag.value = true
  await addDoc(collection(db, 'videos', videoId, 'flags'), {
    reason: flagReason.value,
    userId: authStore.user.uid,
    userEmail: authStore.user.email,
    createdAt: serverTimestamp()
  })
  await updateDoc(doc(db, 'videos', videoId), { isFlagged: true })
  video.value.isFlagged = true
  submittingFlag.value = false
  showFlagModal.value = false
}

// Increment view count
const trackView = async () => {
  await updateDoc(doc(db, 'videos', videoId), { views: increment(1) })
}

onMounted(async () => {
  try {
    const snap = await getDoc(doc(db, 'videos', videoId))
    if (snap.exists()) {
      video.value = { id: snap.id, ...snap.data() }
      trackView()
    }
    await loadComments()
    // Load related videos from same course
    const relSnap = await getDocs(
      query(collection(db, 'videos'),
        where('courseCode', '==', video.value?.courseCode || ''),
        orderBy('createdAt', 'desc'), limit(5))
    )
    relatedVideos.value = relSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => v.id !== videoId)
  } catch (e) { console.error(e) }
  finally { loading.value = false }
})

const formatDate = (ts) => {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
}
</script>

<style scoped>
.watch-page { max-width: 1440px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
.watch-layout { display: grid; grid-template-columns: 1fr 360px; gap: 2rem; }
@media (max-width: 960px) { .watch-layout { grid-template-columns: 1fr; } .sidebar-col { display: none; } }

/* Player */
.player-wrap { aspect-ratio: 16/9; background: #000; border-radius: 16px; overflow: hidden; margin-bottom: 1rem; }
.player-iframe { width: 100%; height: 100%; display: block; }
.player-placeholder {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.75rem;
  color: var(--text-secondary); font-size: 2rem;
}
.player-placeholder p { font-size: 1rem; }

/* Video info */
.video-info-card { padding: 1.5rem; margin-bottom: 1.5rem; }
.info-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; gap: 0.5rem; }
.course-tag {
  display: inline-block; background: rgba(108,99,255,0.15); color: var(--accent);
  border-radius: 999px; padding: 3px 10px; font-size: 0.75rem; font-weight: 700;
  margin-right: 0.35rem;
}
.topic-tag {
  display: inline-block; background: rgba(255,101,132,0.12); color: #f9a8d4;
  border-radius: 999px; padding: 3px 10px; font-size: 0.75rem; font-weight: 700;
}
.video-title { font-size: 1.4rem; font-weight: 800; margin: 0 0 0.5rem; }
.video-meta { display: flex; gap: 0.5rem; color: var(--text-secondary); font-size: 0.8rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
.video-desc { color: var(--text-secondary); font-size: 0.875rem; line-height: 1.6; margin: 0 0 1rem; }

/* Actions */
.actions-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); }
.rating-group { display: flex; align-items: center; gap: 0.6rem; }
.action-label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
.stars { display: flex; gap: 0.2rem; }
.star-btn { background: none; border: none; cursor: pointer; color: var(--text-secondary); font-size: 1.1rem; padding: 0; transition: color 0.15s; }
.star-btn.active { color: #fbbf24; }
.rating-avg { font-size: 0.8rem; color: var(--text-secondary); }
.flag-btn {
  display: flex; align-items: center; gap: 0.4rem; background: transparent;
  border: 1px solid var(--border); color: var(--text-secondary); border-radius: 10px;
  padding: 0.45rem 1rem; font-size: 0.8rem; cursor: pointer; transition: all 0.15s;
}
.flag-btn:hover { border-color: #fbbf24; color: #fbbf24; }
.flag-btn.flagged { background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.3); color: #fbbf24; }

/* Comments */
.comments-section { padding: 1.5rem; }
.comments-title { font-size: 1rem; font-weight: 700; margin: 0 0 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
.count-chip { background: rgba(108,99,255,0.12); color: var(--accent); border-radius: 999px; padding: 2px 10px; font-size: 0.75rem; }
.add-comment { display: flex; gap: 0.75rem; align-items: flex-start; margin-bottom: 1.5rem; }
.comment-input { flex: 1; resize: none; }
.comment-submit { padding: 0.5rem 1rem; height: auto; white-space: nowrap; }
.login-prompt { color: var(--text-secondary); font-size: 0.875rem; }
.auth-link { color: var(--accent); text-decoration: none; font-weight: 600; }
.no-comments { text-align: center; padding: 2rem; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.comment-list { display: flex; flex-direction: column; gap: 1rem; }
.comment-item { display: flex; gap: 0.75rem; }
.comment-avatar {
  width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #6c63ff, #a855f7);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 0.875rem; flex-shrink: 0;
}
.comment-body { flex: 1; }
.comment-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
.comment-author { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); }
.comment-date { font-size: 0.75rem; color: var(--text-secondary); }
.comment-text { font-size: 0.875rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }

/* Sidebar */
.sidebar-col { position: sticky; top: 80px; height: fit-content; }
.sidebar-title { font-size: 1rem; font-weight: 700; margin: 0 0 1rem; color: var(--text-secondary); }
.related-card { display: flex; gap: 0.75rem; padding: 0.75rem; margin-bottom: 0.75rem; cursor: pointer; border-radius: 12px; }
.related-thumb { width: 100px; height: 60px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
.related-thumb-ph { width: 100px; height: 60px; border-radius: 8px; background: rgba(108,99,255,0.1); display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
.related-title { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); margin: 0 0 0.25rem; }
.related-meta { font-size: 0.72rem; color: var(--text-secondary); margin: 0; }

/* Flag modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 999; backdrop-filter: blur(4px); }
.modal-box { max-width: 400px; width: 90%; padding: 2rem; }
.modal-box h4 { font-size: 1rem; font-weight: 700; margin: 0 0 0.5rem; color: var(--text-primary); }
.modal-box p { color: var(--text-secondary); font-size: 0.875rem; margin: 0 0 1rem; }
.flag-options { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
.flag-option { display: flex; align-items: center; gap: 0.6rem; cursor: pointer; color: var(--text-secondary); font-size: 0.875rem; }
.flag-option input { accent-color: var(--accent); }
.modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
.btn-delete { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; border-radius: 12px; padding: 0.65rem 1.5rem; font-weight: 600; cursor: pointer; }
.btn-delete:hover { background: rgba(239,68,68,0.25); }
.btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }

/* Status & spinner */
.status-pill { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 10px; border-radius: 999px; }
.pill-ready { background: rgba(34,197,94,0.12); color: #4ade80; }
.pill-processing { background: rgba(234,179,8,0.12); color: #fbbf24; }
.state-center { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(108,99,255,0.15); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
.spin { display: inline-block; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

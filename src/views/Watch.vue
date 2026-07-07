<template>
  <div class="watch-page">
    <div v-if="loading" class="state-center"><div class="spinner"></div></div>
    <div v-else-if="errorMsg" class="state-center">
      <i class="bi bi-exclamation-triangle" style="font-size:2.5rem; color:#f87171; margin-bottom:0.75rem;"></i>
      <p style="color:var(--text-secondary);">{{ errorMsg }}</p>
      <router-link to="/" class="btn-glass" style="margin-top:1rem;">Back to Home</router-link>
    </div>
    <template v-else-if="video">
      <div class="watch-layout row">
        <div class="player-col col-12 col-lg-8">
          <div class="player-wrap">
            <div v-if="video.videoId" id="player" class="player-iframe"></div>
            <div v-else class="player-placeholder">
              <i class="bi bi-hourglass-split"></i>
              <p>Video is being processed...</p>
            </div>
          </div>

          <div class="video-info-card glass-card">
            <div class="info-top">
              <div class="tags-row">
                <span v-if="video.courseCode" class="course-tag">{{ video.courseCode }}</span>
                <span v-if="video.topic" class="topic-tag">{{ video.topic }}</span>
              </div>
              
              <div class="info-actions">
                <button 
                  v-if="authStore.user?.uid === video.userId" 
                  @click="showEditModal = true" 
                  class="edit-meta-btn"
                >
                  <i class="bi bi-pencil-square"></i> Edit
                </button>

                <span class="status-pill" :class="video.status === 'ready' ? 'pill-ready' : 'pill-processing'">
                  {{ video.status }}
                </span>
              </div>
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

            <div class="actions-row">
              <div class="rating-group">
                <span class="action-label">Rating</span>
                <div class="stars">
                  <button
                    v-for="s in 5" :key="'r'+s"
                    @click="submitRating(s)"
                    class="star-btn"
                    :class="{ active: s <= (myRating || video.avgRating) }"
                  >
                    <i :class="s <= (myRating || video.avgRating) ? 'bi bi-star-fill' : 'bi bi-star'"></i>
                  </button>
                </div>
                <span class="rating-avg">{{ video.avgRating?.toFixed(1) || '—' }}</span>
              </div>

              <button @click="showFlagModal = true" class="flag-btn" :class="{ flagged: video.isFlagged }">
                <i :class="video.isFlagged ? 'bi bi-flag-fill' : 'bi bi-flag'"></i>
                {{ video.isFlagged ? 'Flagged' : 'Flag content' }}
              </button>
            </div>
          </div>

          <div class="comments-section glass-card">
            <h3 class="comments-title">Comments <span class="count-chip">{{ comments.length }}</span></h3>

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

            <div class="comment-list">
              <div v-for="c in comments" :key="c.id" class="comment-item">
                <div class="comment-avatar">{{ ((c.userName || c.userEmail) || 'U')[0].toUpperCase() }}</div>
                <div class="comment-body">
                  <div class="comment-header">
                    <span class="comment-author">{{ c.userName || (c.userEmail?.split('@')[0]) }}</span>
                    <span class="comment-date">{{ formatDate(c.createdAt) }}</span>
                    <button
                      v-if="authStore.user?.uid === c.userId"
                      @click="deleteComment(c.id)"
                      class="comment-delete-btn"
                      title="Delete comment"
                    >
                      <i class="bi bi-trash3"></i>
                    </button>
                  </div>
                  <p class="comment-text" v-html="DOMPurify.sanitize(c.text)"></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="sidebar-col col-12 col-lg-4">
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

    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal-box glass-card edit-modal">
        <h4 class="modal-title">Edit Video Details</h4>
        
        <div class="field-group">
          <label class="field-label">Title *</label>
          <input v-model="editData.title" class="form-input" placeholder="Video title" />
        </div>

        <div class="edit-row">
          <div class="field-group">
            <label class="field-label">Department *</label>
            <select v-model="editData.department" class="form-input">
              <option value="" disabled>Select department</option>
              <option v-for="d in editDepartments" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Level *</label>
            <select v-model="editData.level" class="form-input">
              <option value="" disabled>Select level</option>
              <option v-for="l in [100,200,300,400,500]" :key="l" :value="l">{{ l }}</option>
            </select>
          </div>
        </div>

        <div class="edit-row">
          <div class="field-group">
            <label class="field-label">Course Code *</label>
            <select v-model="editData.courseCode" class="form-input" :disabled="!editData.department">
              <option value="" disabled>Select course</option>
              <option v-for="c in editFilteredCourses" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Topic</label>
            <input v-model="editData.topic" class="form-input" placeholder="e.g. Linked Lists" />
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">Description</label>
          <textarea v-model="editData.description" class="form-input" rows="3"></textarea>
        </div>

        <div v-if="editError" class="edit-error">
          <i class="bi bi-exclamation-circle-fill"></i> {{ editError }}
        </div>

        <div class="modal-actions">
          <button class="btn-glass" @click="showEditModal = false">Cancel</button>
          <button class="btn-gradient" @click="updateMetadata" :disabled="updatingMeta">
            {{ updatingMeta ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showFlagModal" class="modal-overlay" @click.self="showFlagModal = false">
      <div class="modal-box glass-card">
        <h4><i class="bi bi-flag-fill me-2" style="color:#fbbf24;"></i>Flag content</h4>
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
            Submit Flag
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../firebase'
import {
  doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, serverTimestamp, increment, limit, onSnapshot, arrayUnion
} from 'firebase/firestore'
import { useAuthStore } from '../stores/auth'
import { incrementCourseCount, decrementCourseCount } from '../utils/course'
import DOMPurify from 'dompurify'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const videoId = route.params.id

// Core State
const video = ref(null)
const loading = ref(true)
const comments = ref([])
const loadingComments = ref(true)
const relatedVideos = ref([])

// Interaction State
const newComment = ref('')
const submittingComment = ref(false)
const myRating = ref(0)
const showFlagModal = ref(false)
const flagReason = ref('')
const submittingFlag = ref(false)
const errorMsg = ref('')

// ✍️ Step 10 State
const showEditModal = ref(false)
const updatingMeta = ref(false)
const editData = ref({
  title: '',
  topic: '',
  courseCode: '',
  department: '',
  level: '',
  description: ''
})
const editError = ref('')
const editDepartments = ref([])
const editCoursesByDept = ref({})

const flagReasons = ['Inaccurate academic content', 'Inappropriate or offensive', 'Copyright infringement', 'Spam or misleading', 'Other']

// Sync modal with video data
watch(video, (newVal) => {
  if (newVal) {
    editData.value = {
      title: newVal.title || '',
      topic: newVal.topic || '',
      courseCode: newVal.courseCode || '',
      department: newVal.department || '',
      level: newVal.level || '',
      description: newVal.description || ''
    }
  }
}, { immediate: true })

const editFilteredCourses = computed(() => {
  if (!editData.value.department) return []
  const codes = editCoursesByDept.value[editData.value.department] || []
  return codes.map(c => c.replace(/\s+/g, '').toUpperCase())
})

watch(() => editData.value.department, (newVal, oldVal) => {
  if (oldVal && newVal !== oldVal) editData.value.courseCode = ''
})

const loadEditOptions = async () => {
  try {
    const deptSnap = await getDocs(collection(db, 'departments'))
    editDepartments.value = deptSnap.docs.map(d => d.data().name).filter(Boolean).sort()
    const courseSnap = await getDocs(collection(db, 'courses'))
    const grouped = {}
    courseSnap.docs.forEach(d => {
      const { department, code } = d.data()
      if (department && code) {
        if (!grouped[department]) grouped[department] = []
        grouped[department].push(code)
      }
    })
    editCoursesByDept.value = grouped
  } catch (e) { console.error('Failed to load edit options:', e) }
}

watch(showEditModal, (val) => {
  if (val) { editError.value = ''; loadEditOptions() }
})

// Handle ID changes via sidebar
watch(() => route.params.id, (newId) => {
  if (newId) window.location.reload() 
})

// --- Logic Functions ---

let unsubComments = null

const loadComments = () => {
  unsubComments = onSnapshot(query(collection(db, 'videos', videoId, 'interactions'), where('type', '==', 'comment')), (snap) => {
    let data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    data.sort((a, b) => {
      const t1 = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
      const t2 = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
      return t1 - t2
    })
    comments.value = data
    loadingComments.value = false
  })
}

onUnmounted(() => {
  if (unsubComments) unsubComments()
})

const loadRecommendations = async (currentVideo) => {
  try {
    let results = []
    
    // 1. By Course
    if (currentVideo.courseCode) {
      const courseQuery = query(collection(db, 'videos'), where('courseCode', '==', currentVideo.courseCode), where('status', '==', 'ready'), limit(8))
      const courseSnap = await getDocs(courseQuery)
      results = courseSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => v.id !== videoId)
    }

    // 2. By Department
    if (results.length < 3 && currentVideo.department) {
      const deptQuery = query(collection(db, 'videos'), where('department', '==', currentVideo.department), where('status', '==', 'ready'), limit(8))
      const deptSnap = await getDocs(deptQuery)
      const deptResults = deptSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => v.id !== videoId && !results.some(r => r.id === v.id))
      results = [...results, ...deptResults].slice(0, 6)
    }
    
    // 3. Fallback to generic Recent
    if (results.length < 3) {
      const recentQuery = query(collection(db, 'videos'), where('status', '==', 'ready'), limit(6))
      const recentSnap = await getDocs(recentQuery)
      const recentResults = recentSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => v.id !== videoId && !results.some(r => r.id === v.id))
      results = [...results, ...recentResults].slice(0, 6)
    }
    
    relatedVideos.value = results
  } catch (err) { console.error("Recommendation Error:", err) }
}

// ✍️ Step 10: Update Metadata Logic
const updateMetadata = async () => {
  if (!authStore.user || updatingMeta.value) return
  editError.value = ''
  if (!editData.value.title.trim()) { editError.value = 'Title is required.'; return }
  if (!editData.value.department || !editData.value.courseCode || !editData.value.level) {
    editError.value = 'Department, Course Code, and Level are required.'; return
  }
  updatingMeta.value = true
  try {
    const videoRef = doc(db, 'videos', videoId)
    const cleanCode = editData.value.courseCode.replace(/\s+/g, '').toUpperCase()
    const oldCode = video.value.courseCode
    await updateDoc(videoRef, {
      title: editData.value.title.trim(),
      topic: editData.value.topic.trim(),
      courseCode: cleanCode,
      department: editData.value.department,
      level: parseInt(editData.value.level),
      description: editData.value.description.trim()
    })
    if (oldCode && oldCode !== cleanCode) {
      decrementCourseCount(oldCode)
      incrementCourseCount(cleanCode)
    }
    video.value.title = editData.value.title.trim()
    video.value.topic = editData.value.topic.trim()
    video.value.courseCode = cleanCode
    video.value.department = editData.value.department
    video.value.level = parseInt(editData.value.level)
    video.value.description = editData.value.description.trim()
    showEditModal.value = false
  } catch (err) {
    console.error('Update Error:', err)
    editError.value = 'Failed to update metadata. Please try again.'
  } finally {
    updatingMeta.value = false
  }
}

const submitComment = async () => {
  if (!newComment.value.trim() || !authStore.user) return
  submittingComment.value = true
  await addDoc(collection(db, 'videos', videoId, 'interactions'), {
    type: 'comment',
    text: newComment.value.trim(),
    userId: authStore.user.uid,
    userEmail: authStore.user.email,
    userName: authStore.userProfile?.name || authStore.user.displayName || '',
    createdAt: serverTimestamp()
  })
  newComment.value = ''; submittingComment.value = false;
}

const submitRating = async (stars) => {
  if (!authStore.user) return
  myRating.value = stars

  const interactionsRef = collection(db, 'videos', videoId, 'interactions')
  const existing = await getDocs(query(interactionsRef, where('type', '==', 'rating'), where('userId', '==', authStore.user.uid)))
  
  if (!existing.empty) {
    await updateDoc(existing.docs[0].ref, { rating: stars })
  } else {
    await addDoc(interactionsRef, { type: 'rating', userId: authStore.user.uid, rating: stars, createdAt: serverTimestamp() })
  }

  // Recalculate averages
  const allRatings = await getDocs(query(interactionsRef, where('type', '==', 'rating')))
  let sum = 0, count = 0
  allRatings.docs.forEach(d => {
    const data = d.data()
    if (data.rating) { sum += data.rating; count++ }
  })
  const avgRating = count > 0 ? sum / count : 0

  await updateDoc(doc(db, 'videos', videoId), { avgRating })
  video.value.avgRating = avgRating
}

const deleteComment = async (commentId) => {
  if (!authStore.user || !confirm('Delete this comment?')) return
  try {
    await deleteDoc(doc(db, 'videos', videoId, 'interactions', commentId))
  } catch (e) {
    console.error('Failed to delete comment:', e)
    alert('Failed to delete comment.')
  }
}

const submitFlag = async () => {
  if (!flagReason.value || !authStore.user) return
  submittingFlag.value = true
  await addDoc(collection(db, 'videos', videoId, 'interactions'), {
    type: 'flag',
    reason: flagReason.value,
    userId: authStore.user.uid,
    userEmail: authStore.user.email,
    createdAt: serverTimestamp()
  })
  await updateDoc(doc(db, 'videos', videoId), { 
    isFlagged: true,
    flaggedReasons: arrayUnion(flagReason.value)
  })
  video.value.isFlagged = true; submittingFlag.value = false; showFlagModal.value = false
}

let player = null;
const initYouTubePlayer = () => {
  if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    window.onYouTubeIframeAPIReady = () => {
      createPlayer();
    };
  } else {
    createPlayer();
  }
};

const createPlayer = () => {
  player = new window.YT.Player('player', {
    videoId: video.value.videoId,
    playerVars: {
      'autoplay': 1,
    }
  });
};

onMounted(async () => {
  try {
    const snap = await getDoc(doc(db, 'videos', videoId))
    if (snap.exists()) {
      video.value = { id: snap.id, ...snap.data() }
      await updateDoc(doc(db, 'videos', videoId), { views: increment(1) })
      loadRecommendations(video.value)
      initYouTubePlayer()
    }
    await loadComments()
  } catch (e) {
    console.error(e)
    errorMsg.value = 'Failed to load this video. It may have been removed or the network is unavailable.'
  }
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

@media (max-width: 960px) { 
  .watch-layout { grid-template-columns: 1fr; } 
  .sidebar-col { display: none; } 
}

/* Player */
.player-wrap { aspect-ratio: 16/9; background: #000; border-radius: 16px; overflow: hidden; margin-bottom: 1rem; }
.player-iframe { width: 100%; height: 100%; display: block; }
.player-placeholder {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.75rem;
  color: var(--text-secondary); font-size: 2rem;
}
.player-placeholder p { font-size: 1rem; }

/* Video info card */
.video-info-card { padding: 1.5rem; margin-bottom: 1.5rem; }
.info-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; gap: 0.5rem; }
.tags-row { display: flex; gap: 0.35rem; }
.info-actions { display: flex; align-items: center; gap: 0.75rem; }

.course-tag {
  display: inline-block; background: rgba(108,99,255,0.15); color: var(--accent);
  border-radius: 999px; padding: 3px 12px; font-size: 0.75rem; font-weight: 700;
}
.topic-tag {
  display: inline-block; background: rgba(255,101,132,0.12); color: #f9a8d4;
  border-radius: 999px; padding: 3px 12px; font-size: 0.75rem; font-weight: 700;
}

/* ✍️ Step 10: Edit Button Style */
.edit-meta-btn {
  background: rgba(108,99,255,0.1);
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 0.35rem 0.85rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.edit-meta-btn:hover {
  background: var(--accent);
  color: white;
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
.comment-input { flex: 1; resize: none; background: rgba(108,99,255,0.05); border: 1px solid var(--border); border-radius: 10px; color: var(--text-primary); padding: 0.75rem; transition: all 0.2s; }
.comment-input:focus { background: rgba(108,99,255,0.1); outline: none; border-color: var(--accent); }
.comment-submit { padding: 0.5rem 1.25rem; border-radius: 10px; font-weight: 600; }

.comment-list { display: flex; flex-direction: column; gap: 1.25rem; }
.comment-item { display: flex; gap: 0.75rem; }
.comment-avatar {
  width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #6c63ff, #a855f7);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 0.9rem; flex-shrink: 0;
}
.comment-body { flex: 1; }
.comment-header { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.2rem; }
.comment-author { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
.comment-date { font-size: 0.75rem; color: var(--text-secondary); }
.comment-text { font-size: 0.9rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }
.comment-delete-btn {
  background: none; border: none; color: var(--text-secondary); cursor: pointer;
  font-size: 0.8rem; padding: 2px 6px; border-radius: 4px; margin-left: auto;
  opacity: 0; transition: opacity 0.15s, color 0.15s;
}
.comment-item:hover .comment-delete-btn { opacity: 1; }
.comment-delete-btn:hover { color: #f87171; background: rgba(239,68,68,0.1); }

/* Sidebar */
.sidebar-col { position: sticky; top: 80px; height: fit-content; }
.sidebar-title { font-size: 1rem; font-weight: 700; margin: 0 0 1.25rem; color: var(--text-secondary); }
.related-card { display: flex; gap: 0.75rem; padding: 0.75rem; margin-bottom: 0.75rem; cursor: pointer; border-radius: 12px; transition: transform 0.2s; }
.related-card:hover { transform: translateX(5px); background: rgba(255,255,255,0.05); }
.related-thumb { width: 120px; height: 68px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
.related-thumb-ph { width: 120px; height: 68px; border-radius: 8px; background: rgba(108,99,255,0.1); display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
.related-title { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin: 0 0 0.25rem; line-clamp: 2; -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
.related-meta { font-size: 0.75rem; color: var(--text-secondary); margin: 0; }

/* Modals */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(6px); }
.modal-box { max-width: 450px; width: 90%; padding: 2rem; border: 1px solid var(--border); }
.modal-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--text-primary); }

/* ✍️ Step 10: Edit Modal Fields */
.field-group { margin-bottom: 1.25rem; }
.field-label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; }
.form-input { 
  width: 100%; padding: 0.75rem; background: rgba(108,99,255,0.05); 
  border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); outline: none; transition: all 0.2s;
}
.form-input:focus { border-color: var(--accent); background: rgba(108,99,255,0.1); }

.modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
.btn-delete { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; border-radius: 10px; padding: 0.6rem 1.25rem; font-weight: 600; cursor: pointer; transition: background 0.2s;}
.btn-delete:hover { background: rgba(239,68,68,0.25); }

/* Flag Options CSS */
.flag-options { display: flex; flex-direction: column; gap: 0.6rem; margin: 1.5rem 0; }
.flag-option { 
  display: flex; align-items: center; gap: 0.75rem; 
  padding: 0.8rem 1rem; border: 1px solid var(--border); 
  border-radius: 10px; cursor: pointer; transition: all 0.2s;
  background: rgba(255,255,255,0.02); color: var(--text-primary);
}
.flag-option:hover { background: var(--bg-card-hover); border-color: rgba(251,191,36,0.3); }
.flag-option input { margin: 0; width: 1.1rem; height: 1.1rem; accent-color: #fbbf24; cursor: pointer; flex-shrink: 0;}
.flag-option span { font-size: 0.95rem; font-weight: 500; }

/* Status & Utils */
.status-pill { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 10px; border-radius: 999px; }
.pill-ready { background: rgba(34,197,94,0.12); color: #4ade80; }
.pill-processing { background: rgba(234,179,8,0.12); color: #fbbf24; }

.state-center { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; }
.spinner { width: 40px; height: 40px; border: 3px solid rgba(108,99,255,0.15); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
.spin { display: inline-block; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.edit-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.edit-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #f87171; border-radius: 10px; padding: 0.65rem 1rem; font-size: 0.85rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
</style>
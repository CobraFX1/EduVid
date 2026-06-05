<template>
  <div class="comment-mod section-block">
    <div class="header">
      <h2>Comment Moderation</h2>
      <p class="sub-text">Review and moderate comments across all videos on the platform.</p>
    </div>

    <div v-if="loading" class="state-center"><div class="spinner"></div></div>

    <div v-else-if="allComments.length === 0" class="empty-state">
      <i class="bi bi-chat-square-check" style="font-size: 2.5rem; color: #4ade80; margin-bottom: 0.5rem;"></i>
      <p>No comments to review.</p>
    </div>

    <div v-else>
      <div class="search-box" style="margin-bottom: 1.25rem;">
        <i class="bi bi-search"></i>
        <input v-model="searchQuery" class="form-input" placeholder="Search comments..." />
      </div>

      <div class="comments-list">
        <div v-for="c in filteredComments" :key="c.id" class="mod-comment glass-card">
          <div class="mod-comment-top">
            <div class="mod-comment-info">
              <span class="comment-author">{{ c.userName || c.userEmail?.split('@')[0] || 'Unknown' }}</span>
              <span class="comment-sep">on</span>
              <router-link :to="`/watch/${c.videoId}`" class="video-link">{{ c.videoTitle || c.videoId }}</router-link>
              <span class="comment-date">{{ formatDate(c.createdAt) }}</span>
            </div>
          </div>
          <p class="comment-text">{{ c.text }}</p>
          <div class="mod-actions">
            <button @click="deleteComment(c)" class="btn-delete" title="Delete Comment">
              <i class="bi bi-trash3 me-1"></i> Delete
            </button>
            <button @click="banCommenter(c)" class="btn-delete" style="background: rgba(0,0,0,0.4); border-color: #f87171;" title="Ban User" v-if="c.userId">
              <i class="bi bi-person-x-fill me-1"></i> Ban User
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { db } from '../firebase'
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDocs, updateDoc, collectionGroup } from 'firebase/firestore'

const allComments = ref([])
const loading = ref(true)
const searchQuery = ref('')

const filteredComments = computed(() => {
  if (!searchQuery.value) return allComments.value
  const q = searchQuery.value.toLowerCase()
  return allComments.value.filter(c =>
    c.text?.toLowerCase().includes(q) ||
    c.userName?.toLowerCase().includes(q) ||
    c.userEmail?.toLowerCase().includes(q) ||
    c.videoTitle?.toLowerCase().includes(q)
  )
})

onMounted(async () => {
  try {
    // Fetch all videos first to map videoId -> title
    const videosSnap = await getDocs(collection(db, 'videos'))
    const videoTitles = {}
    videosSnap.docs.forEach(d => { videoTitles[d.id] = d.data().title })

    // Fetch comments from each video's subcollection
    const comments = []
    for (const vDoc of videosSnap.docs) {
      const commentsSnap = await getDocs(
        query(collection(db, 'videos', vDoc.id, 'comments'), orderBy('createdAt', 'desc'))
      )
      commentsSnap.docs.forEach(cDoc => {
        comments.push({
          id: cDoc.id,
          videoId: vDoc.id,
          videoTitle: videoTitles[vDoc.id] || vDoc.id,
          ...cDoc.data()
        })
      })
    }
    // Sort all comments by date, most recent first
    comments.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
      return tb - ta
    })
    allComments.value = comments
  } catch (e) {
    console.error('Failed to load comments:', e)
  } finally {
    loading.value = false
  }
})

const deleteComment = async (comment) => {
  if (!confirm(`Delete this comment by ${comment.userName || comment.userEmail}?`)) return
  try {
    await deleteDoc(doc(db, 'videos', comment.videoId, 'comments', comment.id))
    allComments.value = allComments.value.filter(c => c.id !== comment.id)
  } catch (e) { alert('Error: ' + e.message) }
}

const banCommenter = async (comment) => {
  if (!confirm(`Ban ${comment.userEmail || comment.userName} from uploading?`)) return
  try {
    await updateDoc(doc(db, 'users', comment.userId), { isBanned: true })
    alert(`${comment.userEmail || comment.userName} has been banned.`)
  } catch (e) { alert('Error: ' + e.message) }
}

const formatDate = (ts) => {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
}
</script>

<style scoped>
.section-block { padding: 1.5rem 0; width: 100%; display: flex; flex-direction: column; gap: 1rem; }
.header { border-bottom: 1px solid var(--border); padding-bottom: 1rem; }
.header h2 { font-size: 1.3rem; font-weight: 700; margin: 0; color: var(--text-primary); }
.sub-text { margin: 0.35rem 0 0; color: var(--text-secondary); font-size: 0.85rem; }

.search-box { position: relative; width: 100%; max-width: 400px; }
.search-box i { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary); }
.form-input { width: 100%; padding: 0.6rem 1rem 0.6rem 2.4rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; color: var(--text-primary); font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
.form-input:focus { border-color: var(--accent); }

.comments-list { display: flex; flex-direction: column; gap: 1rem; }
.mod-comment { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
.mod-comment-top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; }
.mod-comment-info { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.85rem; }
.comment-author { font-weight: 700; color: var(--text-primary); }
.comment-sep { color: var(--text-secondary); }
.video-link { color: var(--accent); text-decoration: none; font-weight: 600; }
.video-link:hover { text-decoration: underline; }
.comment-date { color: var(--text-secondary); font-size: 0.75rem; }
.comment-text { font-size: 0.95rem; color: var(--text-secondary); margin: 0; line-height: 1.5; padding: 0.75rem; background: rgba(108,99,255,0.04); border-radius: 8px; }

.mod-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
.btn-delete { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; padding: 0.45rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.8rem; display: flex; align-items: center; gap: 0.3rem; transition: background 0.15s; }
.btn-delete:hover { background: rgba(239,68,68,0.25); }

.empty-state { text-align: center; padding: 4rem 1rem; color: var(--text-primary); background: var(--bg-card); border: 1px dashed var(--border); border-radius: 16px; display: flex; flex-direction: column; align-items: center; }
.empty-state p { margin: 0; font-weight: 500; }
.state-center { text-align: center; padding: 3rem; }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(108,99,255,0.15); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

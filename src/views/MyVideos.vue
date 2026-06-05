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
          <button @click="openEdit(video)" class="action-btn edit-btn" title="Edit">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button @click="deleteVideo(video)" class="action-btn del-btn" title="Delete">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal-box glass-card">
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
          <button class="btn-gradient" @click="saveEdit" :disabled="savingEdit">
            {{ savingEdit ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { db } from '../firebase'
import { collection, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { useAuthStore } from '../stores/auth'
import { decrementCourseCount, incrementCourseCount } from '../utils/course'

const authStore = useAuthStore()
const videos = ref([])
const loading = ref(true)

// Edit state
const showEditModal = ref(false)
const savingEdit = ref(false)
const editError = ref('')
const editVideoId = ref(null)
const editOriginalCode = ref('')
const editData = ref({ title: '', topic: '', courseCode: '', department: '', level: '', description: '' })
const editDepartments = ref([])
const editCoursesByDept = ref({})

const editFilteredCourses = computed(() => {
  if (!editData.value.department) return []
  const codes = editCoursesByDept.value[editData.value.department] || []
  return codes.map(c => c.replace(/\s+/g, '').toUpperCase())
})

watch(() => editData.value.department, (newVal, oldVal) => {
  if (oldVal && newVal !== oldVal) editData.value.courseCode = ''
})

const openEdit = async (video) => {
  editVideoId.value = video.id
  editOriginalCode.value = video.courseCode || ''
  editData.value = {
    title: video.title || '',
    topic: video.topic || '',
    courseCode: video.courseCode || '',
    department: video.department || '',
    level: video.level || '',
    description: video.description || ''
  }
  editError.value = ''
  showEditModal.value = true
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

const saveEdit = async () => {
  editError.value = ''
  if (!editData.value.title.trim()) { editError.value = 'Title is required.'; return }
  if (!editData.value.department || !editData.value.courseCode || !editData.value.level) {
    editError.value = 'Department, Course Code, and Level are required.'; return
  }
  savingEdit.value = true
  try {
    const cleanCode = editData.value.courseCode.replace(/\s+/g, '').toUpperCase()
    await updateDoc(doc(db, 'videos', editVideoId.value), {
      title: editData.value.title.trim(),
      topic: editData.value.topic.trim(),
      courseCode: cleanCode,
      department: editData.value.department,
      level: parseInt(editData.value.level),
      description: editData.value.description.trim()
    })
    if (editOriginalCode.value && editOriginalCode.value !== cleanCode) {
      decrementCourseCount(editOriginalCode.value)
      incrementCourseCount(cleanCode)
    }
    const v = videos.value.find(v => v.id === editVideoId.value)
    if (v) {
      v.title = editData.value.title.trim()
      v.topic = editData.value.topic.trim()
      v.courseCode = cleanCode
      v.department = editData.value.department
      v.level = parseInt(editData.value.level)
      v.description = editData.value.description.trim()
    }
    showEditModal.value = false
  } catch (err) {
    console.error('Update Error:', err)
    editError.value = 'Failed to update. Please try again.'
  } finally {
    savingEdit.value = false
  }
}

const fetchVideos = async () => {
  loading.value = true
  try {
    const snap = await getDocs(
      query(collection(db, 'videos'), where('userId', '==', authStore.user.uid))
    )
    let data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    
    // Sort locally to completely bypass Firestore's missing composite index
    data.sort((a,b) => {
      const t1 = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0)
      const t2 = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0)
      return t2 - t1
    })
    
    videos.value = data
  } catch(e) {
    console.error("Fetch Error:", e)
  } finally {
    loading.value = false
  }
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
.edit-btn { color: var(--accent); }
.edit-btn:hover { background: rgba(108,99,255,0.12); }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(6px); }
.modal-box { max-width: 550px; width: 90%; padding: 2rem; border: 1px solid var(--border); }
.modal-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--text-primary); }
.field-group { margin-bottom: 1.25rem; }
.field-label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; }
.form-input { width: 100%; padding: 0.75rem; background: rgba(108,99,255,0.05); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); outline: none; transition: all 0.2s; font-family: inherit; }
.form-input:focus { border-color: var(--accent); background: rgba(108,99,255,0.1); }
.edit-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.edit-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #f87171; border-radius: 10px; padding: 0.65rem 1rem; font-size: 0.85rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
.modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
.btn-glass { border: 1px solid var(--border); color: var(--text-primary); padding: 0.6rem 1.25rem; border-radius: 10px; cursor: pointer; font-weight: 600; background: transparent; }
.btn-gradient { padding: 0.6rem 1.25rem; border-radius: 10px; border: none; font-weight: 600; cursor: pointer; color: white; background: linear-gradient(135deg, #6c63ff, #a855f7); }
.btn-gradient:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

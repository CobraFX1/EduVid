<template>
  <div class="upload-page">
    <div class="upload-glow"></div>
    <div class="upload-card glass-card">
      <template v-if="!uploading && !uploadComplete">
        <div class="upload-header">
          <h1 class="upload-title">Upload <span class="gradient-text">Video</span></h1>
          <p class="upload-sub">Your video will be automatically processed and published to YouTube.</p>
        </div>

        <div class="field-group">
          <label class="field-label">Video Title *</label>
          <input v-model="title" type="text" class="form-input" placeholder="Enter a descriptive title..." required />
        </div>

        <div class="form-row-2">
          <div class="field-group">
            <label class="field-label">Department *</label>
            <select v-model="department" class="form-input" required>
              <option value="" disabled>Select department</option>
              <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
            </select>
          </div>

          <div class="field-group">
            <label class="field-label">Level *</label>
            <select v-model="level" class="form-input" required>
              <option value="" disabled>Select level</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="300">300</option>
              <option value="400">400</option>
              <option value="500">500</option>
            </select>
          </div>
        </div>

        <div class="form-row-2">
          <div class="field-group">
            <label class="field-label">Course Code *</label>
            <select v-model="courseCode" class="form-input" required :disabled="!department">
              <option value="" disabled>Select course code</option>
              <option v-for="course in filteredCourses" :key="course" :value="course">{{ course }}</option>
            </select>
          </div>

          <div class="field-group">
            <label class="field-label">Topic *</label>
            <input v-model="topic" type="text" class="form-input" placeholder="e.g. Operating Systems..." required />
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">Description</label>
          <textarea v-model="description" class="form-input" rows="3"
            placeholder="What does this video cover?"></textarea>
        </div>

        <div class="drop-zone" :class="{ 'has-file': selectedFile, 'drag-over': isDragging }"
          @dragover.prevent="isDragging = true" @dragleave="isDragging = false" @drop.prevent="handleDrop"
          @click="!selectedFile && $refs.fileInput.click()">
          <input type="file" ref="fileInput" @change="handleFileSelect" accept="video/*" class="d-none" />

          <div v-if="!selectedFile" class="drop-empty">
            <div class="drop-icon"><i class="bi bi-cloud-arrow-up-fill"></i></div>
            <p class="drop-label">Drag & drop a video here</p>
            <p class="drop-sub">or click to browse — MP4, MOV, AVI supported</p>
          </div>

          <div v-else class="drop-selected">
            <i class="bi bi-file-earmark-play-fill drop-file-icon"></i>
            <div>
              <p class="drop-filename">{{ selectedFile.name }}</p>
              <p class="drop-filesize">{{ (selectedFile.size / 1024 / 1024).toFixed(1) }} MB</p>
            </div>
            <button @click.stop="selectedFile = null; $refs.fileInput.value = ''" class="clear-file" title="Remove">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <div v-if="error" class="field-error">
          <i class="bi bi-exclamation-circle-fill"></i> {{ error }}
        </div>

        <button @click="uploadVideo" class="btn-gradient upload-btn"
          :disabled="!selectedFile || !title || !department || !courseCode || !level">
          <i class="bi bi-upload me-2"></i> Upload Video
        </button>
      </template>

      <div v-if="uploading" class="state-view">
        <div class="progress-ring-wrap">
          <svg class="progress-ring" viewBox="0 0 80 80">
            <circle class="ring-bg" cx="40" cy="40" r="34" />
            <circle class="ring-fill" cx="40" cy="40" r="34" :stroke-dashoffset="ringOffset" />
          </svg>
          <span class="progress-label">{{ Math.round(progress) }}%</span>
        </div>
        <h3 class="state-title">Uploading to server...</h3>
        <p class="state-sub">Please keep this window open.</p>
      </div>

      <div v-if="uploadComplete" class="state-view">
        <div class="success-icon"><i class="bi bi-check2-circle"></i></div>
        <h3 class="state-title">Upload Complete!</h3>
        <p class="state-sub">Your video is being sent to YouTube. It will appear in the feed shortly.</p>
        <router-link to="/" class="btn-gradient"
          style="display:inline-flex; align-items:center; gap:0.4rem; text-decoration:none; padding: 0.75rem 1.5rem; border-radius: 8px; color: white;">
          <i class="bi bi-house"></i> Go to Feed
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { auth, db } from '../firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { useRouter } from 'vue-router'

const title = ref('')
const description = ref('')
const department = ref('')
const courseCode = ref('')
const level = ref('')
const topic = ref('')
const selectedFile = ref(null)
const uploading = ref(false)
const uploadComplete = ref(false)
const progress = ref(0)
const error = ref('')
const isDragging = ref(false)
const router = useRouter()

const courseDatabase = ref({})
const customDepartments = ref([])

const departments = computed(() => {
  return [...customDepartments.value].sort()
})

const filteredCourses = computed(() => {
  return department.value ? courseDatabase.value[department.value] || [] : []
})

onMounted(() => {
  const qCourses = query(collection(db, 'courses'), orderBy('code'))
  const unsubCourses = onSnapshot(qCourses, (snap) => {
    const dbData = {}
    snap.docs.forEach(doc => {
      const { department, code } = doc.data()
      if (department && code) {
        if (!dbData[department]) dbData[department] = []
        dbData[department].push(code)
      }
    })
    courseDatabase.value = dbData
  })

  const qDepts = query(collection(db, 'departments'))
  const unsubDepts = onSnapshot(qDepts, (snap) => {
    customDepartments.value = snap.docs.map(d => d.data().name).filter(Boolean)
  })

  return () => { unsubCourses(); unsubDepts() }
})

watch(department, () => {
  courseCode.value = ''
})

const CIRCUMFERENCE = 2 * Math.PI * 34
const ringOffset = computed(() => CIRCUMFERENCE - (progress.value / 100) * CIRCUMFERENCE)

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file && file.type.startsWith('video/')) {
    selectedFile.value = file
    error.value = ''
  } else {
    error.value = 'Please select a valid video file.'
  }
}

const handleDrop = (event) => {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file && file.type.startsWith('video/')) {
    selectedFile.value = file
    error.value = ''
  } else {
    error.value = 'Please drop a valid video file.'
  }
}


const uploadVideo = async () => {
  if (!selectedFile.value || !title.value || !courseCode.value || !level.value || !topic.value || !department.value) return
  if (!auth.currentUser) {
    error.value = 'You must be logged in to upload.'
    return
  }

  uploading.value = true
  error.value = ''
  progress.value = 0

  try {
    const token = await auth.currentUser.getIdToken()
    const formData = new FormData()

    // 🛡️ NORMALIZATION: Force consistent casing and types
    const cleanCourseCode = courseCode.value.replace(/\s+/g, '').toUpperCase()
    const numericLevel = parseInt(level.value)

    formData.append('video', selectedFile.value)
    formData.append('title', title.value.trim())
    formData.append('description', description.value.trim())
    formData.append('department', department.value)
    formData.append('courseCode', cleanCourseCode) // e.g., "CSC101"
    formData.append('level', numericLevel)         // e.g., 100 (as a number)
    formData.append('topic', topic.value.trim())
    formData.append('userId', auth.currentUser.uid)
    formData.append('userEmail', auth.currentUser.email)

    // ... (rest of your XHR logic remains the same)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'http://localhost:3000/api/upload', true)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) progress.value = (event.loaded / event.total) * 100
    }

    xhr.onload = () => {
      uploading.value = false
      if (xhr.status >= 200 && xhr.status < 300) {
        uploadComplete.value = true

        // ⏳ ADDED: Automatically redirect to home after 3 seconds
        setTimeout(() => {
          router.push('/')
        }, 3000)

      } else {
        const msg = xhr.responseText ? JSON.parse(xhr.responseText).error : 'Upload failed'
        error.value = `Server error: ${msg}`
      }
    }

    xhr.onerror = () => {
      error.value = 'Network error. Ensure the backend server is running on port 3000.'
      uploading.value = false
    }

    xhr.send(formData)
  } catch (err) {
    error.value = err.message
    uploading.value = false
  }
}
</script>

<style scoped>
.upload-page {
  min-height: 85vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  position: relative;
  padding: 3rem 1rem;
}

.upload-glow {
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse 40% 40% at 50% 0%, rgba(108, 99, 255, 0.08) 0%, transparent 70%);
  pointer-events: none;
}

.upload-card {
  width: 100%;
  max-width: 650px;
  padding: 2.5rem;
  position: relative;
}

.upload-header {
  margin-bottom: 2rem;
}

.upload-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
}

.upload-sub {
  color: var(--text-secondary);
  margin: 0.4rem 0 0;
  font-size: 0.9rem;
}

.gradient-text {
  background: linear-gradient(135deg, #6c63ff, #a855f7);
  /* 1. Standard property (solves the warning) */
  background-clip: text;
  /* 2. Vendor prefix (for Safari/Chrome compatibility) */
  -webkit-background-clip: text;
  /* 3. Ensure the text itself is transparent so the background shows through */
  color: transparent;
  /* 4. Fallback for very old browsers */
  display: inline-block;
}
/* Grid Layout for Dropdowns */
.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

@media (max-width: 600px) {
  .form-row-2 {
    grid-template-columns: 1fr;
    gap: 0;
  }
}

.field-group {
  margin-bottom: 1.25rem;
}

.form-row-2 .field-group {
  margin-bottom: 0;
}

.field-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

/* 🛡️ Theme Adaptive Inputs */
.form-input {
  width: 100%;
  padding: 0.875rem 1rem;
  background: var(--bg-card-hover, rgba(0, 0, 0, 0.05));
  /* Fallback added if var is missing */
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
  color-scheme: light dark;
  /* Auto-switches dropdown menus based on OS theme */
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.2);
}

textarea.form-input {
  resize: vertical;
  min-height: 80px;
}

/* Theme Adaptive Drop zone */
.drop-zone {
  border: 2px dashed var(--border);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  background: transparent;
}

.drop-zone:hover,
.drag-over {
  border-color: var(--accent);
  background: rgba(108, 99, 255, 0.04);
}

.has-file {
  border-color: rgba(108, 99, 255, 0.4);
  background: rgba(108, 99, 255, 0.05);
  cursor: default;
}

.drop-icon {
  font-size: 2.5rem;
  color: var(--accent);
  opacity: 0.8;
  margin-bottom: 0.75rem;
}

.drop-label {
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.drop-sub {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin: 0.3rem 0 0;
}

.drop-selected {
  display: flex;
  align-items: center;
  gap: 1rem;
  text-align: left;
}

.drop-file-icon {
  font-size: 2.25rem;
  color: var(--accent);
  flex-shrink: 0;
}

.drop-filename {
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  font-size: 0.9rem;
}

.drop-filesize {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin: 0.15rem 0 0;
}

.clear-file {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border-radius: 8px;
  padding: 0.35rem 0.5rem;
  cursor: pointer;
  margin-left: auto;
  transition: background 0.15s;
}

.clear-file:hover {
  background: rgba(239, 68, 68, 0.2);
}

.d-none {
  display: none;
}

.field-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border-radius: 10px;
  padding: 0.65rem 1rem;
  font-size: 0.85rem;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.upload-btn {
  width: 100%;
  justify-content: center;
  display: flex;
  padding: 1rem;
  border: none;
  border-radius: 10px;
  color: white;
  cursor: pointer;
  font-weight: 600;
  font-family: inherit;
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* States */
.state-view {
  text-align: center;
  padding: 2rem 0;
}

.state-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 1.25rem 0 0.5rem;
}

.state-sub {
  color: var(--text-secondary);
  margin: 0 0 1.75rem;
  font-size: 0.9rem;
}

.success-icon {
  font-size: 4rem;
  color: #10b981;
}

/* Progress ring */
.progress-ring-wrap {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 1.25rem;
}

.progress-ring {
  width: 80px;
  height: 80px;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: var(--border);
  stroke-width: 5;
}

.ring-fill {
  fill: none;
  stroke: var(--accent);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-dasharray: 213.6;
  transition: stroke-dashoffset 0.3s ease-out;
}

.progress-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}
</style>
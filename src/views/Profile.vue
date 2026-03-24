<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h1 class="page-title">Profile <span class="gradient-text">Settings</span></h1>
      <p class="page-sub">Manage your account and student details</p>
    </div>

    <div class="profile-layout">
      <!-- Avatar card -->
      <div class="avatar-card glass-card">
        <div class="profile-avatar-container" @click="triggerFileInput">
          <div class="profile-avatar">
            <template v-if="uploadingImage">
              <i class="bi bi-arrow-repeat spin"></i>
            </template>
            <template v-else-if="authStore.userProfile?.photoURL">
              <img :src="authStore.userProfile.photoURL" alt="Profile Avatar" class="avatar-image" />
            </template>
            <template v-else>
              {{ initials }}
            </template>
          </div>
          <div class="avatar-overlay">
            <i class="bi bi-camera-fill"></i>
          </div>
          <input ref="fileInput" type="file" accept="image/*" @change="handleImageUpload" hidden />
        </div>
        <p class="avatar-name">{{ form.name || authStore.user?.email }}</p>
        <p class="avatar-email">{{ authStore.user?.email }}</p>
        <span class="role-badge" :class="{ 'admin-badge': authStore.isAdmin }">
          {{ authStore.isAdmin ? 'Admin' : 'Student' }}
        </span>
        <div v-if="authStore.userProfile?.isVerified" class="verified-badge">
          <i class="bi bi-patch-check-fill"></i> Verified
        </div>
      </div>

      <!-- Edit form -->
      <div class="form-card glass-card">
        <h3 class="form-section-title">Personal Information</h3>

        <div class="form-row">
          <div class="field-group">
            <label class="field-label">Full Name</label>
            <input v-model="form.name" type="text" class="form-dark" placeholder="Your full name" />
          </div>
          <div class="field-group">
            <label class="field-label">Matric Number</label>
            <input v-model="form.matricNumber" type="text" class="form-dark" placeholder="DU/22/0001" />
          </div>
        </div>

        <div class="form-row">
          <div class="field-group">
            <label class="field-label">Department</label>
            <select v-model="form.department" class="form-dark">
              <option value="" disabled>Select department</option>
              <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Level</label>
            <select v-model="form.level" class="form-dark">
              <option value="" disabled>Select level</option>
              <option value="100">100 Level</option>
              <option value="200">200 Level</option>
              <option value="300">300 Level</option>
              <option value="400">400 Level</option>
              <option value="500">500 Level</option>
            </select>
          </div>
        </div>

        <div v-if="saved" class="success-msg">
          <i class="bi bi-check2-circle me-2"></i>Profile updated successfully!
        </div>

        <div v-if="error" class="field-error">
          <i class="bi bi-exclamation-circle-fill me-2"></i>{{ error }}
        </div>

        <button @click="saveProfile" class="btn-gradient save-btn" :disabled="saving">
          <span v-if="saving"><i class="bi bi-arrow-repeat spin"></i> Saving...</span>
          <span v-else>Save Changes</span>
        </button>

        <div class="danger-zone">
          <h4 class="danger-title">Session</h4>
          <button @click="handleLogout" class="logout-btn">
            <i class="bi bi-box-arrow-right me-2"></i>Sign out
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const saving = ref(false)
const saved = ref(false)
const error = ref('')

const form = ref({
  name: '',
  matricNumber: '',
  department: '',
  level: ''
})

const fileInput = ref(null)
const uploadingImage = ref(false)

const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const handleImageUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  if (!file.type.startsWith('image/')) {
    error.value = 'Please select an image file.'
    return
  }
  
  uploadingImage.value = true
  error.value = ''
  
  try {
    const formData = new FormData()
    formData.append('image', file)
    
    // Read API key from Vite environment variables
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY
    if (!apiKey) {
      throw new Error('ImgBB API key is missing. Please add VITE_IMGBB_API_KEY to your .env/env.local file.')
    }
    
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData
    })
    
    const data = await response.json()
    
    if (data.success) {
      const imageUrl = data.data.url
      
      // Update Firestore
      await updateDoc(doc(db, 'users', authStore.user.uid), {
        photoURL: imageUrl
      })
      
      // Update local store
      authStore.userProfile = { ...authStore.userProfile, photoURL: imageUrl }
      saved.value = true
      setTimeout(() => saved.value = false, 3000)
    } else {
      throw new Error(data.error?.message || 'Failed to upload image to ImgBB')
    }
  } catch (e) {
    error.value = `Image upload failed: ${e.message}`
  } finally {
    uploadingImage.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const initials = computed(() => {
  const n = form.value.name || authStore.user?.email || 'U'
  return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
})

const departments = [
  'Software Engineering', 'Computer Science', 'Information Technology',
  'Computer Engineering', 'Electrical Engineering', 'Mechanical Engineering',
  'Civil Engineering', 'Accounting', 'Business Administration',
  'Economics', 'Mass Communication', 'Law', 'Medicine', 'Nursing'
]

onMounted(() => {
  const p = authStore.userProfile
  if (p) {
    form.value.name = p.name || ''
    form.value.matricNumber = p.matricNumber || ''
    form.value.department = p.department || ''
    form.value.level = p.level || ''
  }
})

const saveProfile = async () => {
  saving.value = true; error.value = ''; saved.value = false
  try {
    await updateDoc(doc(db, 'users', authStore.user.uid), {
      name: form.value.name,
      matricNumber: form.value.matricNumber,
      department: form.value.department,
      level: form.value.level
    })
    authStore.userProfile = { ...authStore.userProfile, ...form.value }
    saved.value = true
    setTimeout(() => saved.value = false, 3000)
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.page-wrapper { max-width: 960px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
.page-header { margin-bottom: 2rem; }
.page-title { font-size: 1.8rem; font-weight: 800; margin: 0; }
.page-sub { color: var(--text-secondary); margin: 0.3rem 0 0; font-size: 0.9rem; }
.profile-layout { display: grid; grid-template-columns: 220px 1fr; gap: 1.5rem; align-items: flex-start; }
@media (max-width: 700px) { .profile-layout { grid-template-columns: 1fr; } }

.avatar-card { padding: 2rem 1.5rem; text-align: center; position: sticky; top: 80px; }
.profile-avatar-container {
  position: relative;
  width: 70px; height: 70px;
  margin: 0 auto 1rem;
  cursor: pointer;
  border-radius: 50%;
}
.profile-avatar {
  width: 100%; height: 100%; border-radius: 50%;
  background: linear-gradient(135deg, #6c63ff, #a855f7);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem; font-weight: 800; color: #fff;
  overflow: hidden;
}
.avatar-image {
  width: 100%; height: 100%; object-fit: cover;
}
.avatar-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; justify-content: center; align-items: center;
  color: white; opacity: 0; transition: opacity 0.2s ease;
  border-radius: 50%;
}
.profile-avatar-container:hover .avatar-overlay {
  opacity: 1;
}
.avatar-name { font-weight: 700; color: var(--text-primary); margin: 0; font-size: 0.95rem; }
.avatar-email { color: var(--text-secondary); font-size: 0.75rem; margin: 0.25rem 0 0.75rem; word-break: break-all; }
.role-badge {
  display: inline-block; background: rgba(108,99,255,0.12); color: var(--accent);
  border-radius: 999px; padding: 3px 12px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
}
.admin-badge { background: rgba(251,191,36,0.12); color: #fbbf24; }
.verified-badge { margin-top: 0.6rem; font-size: 0.75rem; color: #4ade80; }

.form-card { padding: 2rem; }
.form-section-title { font-size: 1rem; font-weight: 700; margin: 0 0 1.5rem; color: var(--text-primary); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.field-group { margin-bottom: 1.25rem; }
.field-label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; }
select.form-dark { cursor: pointer; }
select.form-dark option { background: #1a1b2e; }

.success-msg {
  background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25);
  color: #4ade80; border-radius: 10px; padding: 0.65rem 1rem; font-size: 0.85rem; margin-bottom: 1.25rem;
}
.field-error {
  background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
  color: #f87171; border-radius: 10px; padding: 0.65rem 1rem; font-size: 0.85rem; margin-bottom: 1.25rem;
}
.save-btn { display: flex; align-items: center; gap: 0.5rem; }
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.danger-zone { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
.danger-title { font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); margin: 0 0 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
.logout-btn {
  background: transparent; border: 1px solid rgba(239,68,68,0.25);
  color: #f87171; border-radius: 10px; padding: 0.6rem 1.25rem;
  cursor: pointer; font-size: 0.875rem; transition: background 0.15s;
}
.logout-btn:hover { background: rgba(239,68,68,0.1); }
.spin { display: inline-block; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

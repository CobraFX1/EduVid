<template>
  <div class="auth-page">
    <div class="auth-glow"></div>
    <div class="auth-card glass-card">
      <div class="auth-logo">
        <div class="brand-icon-lg"><i class="bi bi-play-fill"></i></div>
        <h2 class="auth-title">Join EduVid</h2>
        <p class="auth-sub">Dominion University Peer Learning Platform</p>
      </div>

      <button @click="handleGoogle" class="google-btn" :disabled="loadingGoogle">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" class="google-icon" />
        <span>{{ loadingGoogle ? 'Creating account...' : 'Sign up with Google' }}</span>
      </button>

      <div class="divider"><span>or register manually</span></div>

      <form @submit.prevent="handleRegister">
        <div class="form-row">
          <div class="field-group">
            <label class="field-label">Full Name *</label>
            <input v-model="name" type="text" class="form-dark" placeholder="Your full name" required />
          </div>
          <div class="field-group">
            <label class="field-label">Matric Number *</label>
            <input v-model="matricNumber" type="text" class="form-dark" placeholder="e.g. DU0123" required />
          </div>
        </div>

        <div class="form-row">
          <div class="field-group">
            <label class="field-label">Programme *</label>
            <select v-model="programme" class="form-dark" required>
              <option value="" disabled>Select programme</option>
              <option v-for="p in programmes" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Level *</label>
            <select v-model="level" class="form-dark" required>
              <option value="" disabled>Select level</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="300">300</option>
              <option value="400">400</option>
            </select>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">Email address *</label>
          <input v-model="email" type="email" class="form-dark" placeholder="name@example.com" required autocomplete="email" />
        </div>

        <div class="form-row">
          <div class="field-group">
            <label class="field-label">Password *</label>
            <input v-model="password" type="password" class="form-dark" placeholder="••••••••" required autocomplete="new-password" />
          </div>
          <div class="field-group">
            <label class="field-label">Confirm Password *</label>
            <input v-model="confirmPassword" type="password" class="form-dark" placeholder="••••••••" required autocomplete="new-password" />
          </div>
        </div>

        <div v-if="errorMessage" class="field-error">
          <i class="bi bi-exclamation-circle-fill"></i> {{ errorMessage }}
        </div>

        <button type="submit" class="btn-gradient submit-btn" :disabled="loading">
          <span v-if="loading"><i class="bi bi-arrow-repeat spin"></i> Creating account...</span>
          <span v-else>Create account</span>
        </button>
      </form>

      <p class="auth-footer">
        Already have an account?
        <router-link to="/login" class="auth-link">Sign in</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const name = ref('')
const matricNumber = ref('')
const programme = ref('') // Updated ref
const level = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const loading = ref(false)
const loadingGoogle = ref(false)
const router = useRouter()
const authStore = useAuthStore()

// Updated to University Programmes
const programmes = [
  'B.Sc. Software Engineering',
  'B.Sc. Computer Science',
  'B.Sc. Information Technology',
  'B.Sc. Cyber Security',
  'B.Sc. Computer Engineering',
  'B.Sc. Electrical Engineering',
  'B.Sc. Mechanical Engineering',
  'B.Sc. Civil Engineering',
  'B.Sc. Accounting',
  'B.Sc. Business Administration',
  'B.Sc. Economics',
  'B.Sc. Mass Communication',
  'LL.B. Law',
  'MBBS Medicine',
  'B.NSc. Nursing',
]

const handleRegister = async () => {
  errorMessage.value = ''
  
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  // Pre-Check UI validation for better User Experience
  const cleanMatric = matricNumber.value.trim().toUpperCase()
  const matricRegex = /^DU\d{4}$/
  if (!matricRegex.test(cleanMatric)) {
    errorMessage.value = 'Invalid Matric format. Must be DU followed by 4 digits (e.g., DU1234).'
    return
  }

  loading.value = true
  try {
    await authStore.register(email.value, password.value, {
      name: name.value,
      matricNumber: cleanMatric,
      programme: programme.value, // Sending 'programme'
      level: level.value,
    })
    router.push('/')
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

const handleGoogle = async () => {
  loadingGoogle.value = true
  try {
    await authStore.loginWithGoogle()
    // First-time Google users should fill in their matric details
    router.push('/profile?firstLogin=true')
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loadingGoogle.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 85vh; display: flex; align-items: center;
  justify-content: center; position: relative; padding: 2rem 1rem;
}
.auth-glow {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 40% 40% at 50% 20%, rgba(255,101,132,0.1) 0%, transparent 70%);
  pointer-events: none;
}
.auth-card { width: 100%; max-width: 580px; padding: 2.5rem; position: relative; }
.auth-logo { text-align: center; margin-bottom: 2rem; }
.brand-icon-lg {
  width: 52px; height: 52px; background: linear-gradient(135deg, #ff6584, #a855f7);
  border-radius: 14px; display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem; color: #fff; margin: 0 auto 1rem;
}
.auth-title { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin: 0; }
.auth-sub { color: var(--text-secondary); margin: 0.35rem 0 0; font-size: 0.9rem; }

.google-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.75rem;
  background: var(--bg-card-hover); border: 1px solid var(--border);
  color: var(--text-primary); border-radius: 12px; padding: 0.75rem 1rem;
  font-weight: 600; font-size: 0.9rem; cursor: pointer;
  transition: background 0.2s; margin-bottom: 1.25rem;
}
.google-btn:hover { background: rgba(255,255,255,0.1); }
.google-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.google-icon { width: 20px; height: 20px; }

.divider {
  display: flex; align-items: center; gap: 1rem;
  color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 1.25rem;
}
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.field-group { margin-bottom: 1.1rem; }
.field-label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; }
select.form-dark { cursor: pointer; }
select.form-dark option { background: #1a1b2e; color: #f0f0f8; }
.field-error {
  background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
  color: #f87171; border-radius: 10px; padding: 0.65rem 1rem;
  font-size: 0.85rem; margin-bottom: 1.25rem;
  display: flex; align-items: center; gap: 0.5rem;
}
.submit-btn { width: 100%; justify-content: center; display: flex; align-items: center; gap: 0.5rem; }
.auth-footer { text-align: center; color: var(--text-secondary); font-size: 0.875rem; margin-top: 1.5rem; }
.auth-link { color: var(--accent); text-decoration: none; font-weight: 600; }
.auth-link:hover { text-decoration: underline; }
.spin { display: inline-block; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
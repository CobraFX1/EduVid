<template>
  <div class="auth-page">
    <div class="auth-glow"></div>
    <div class="auth-card glass-card">
      <div class="auth-logo">
        <div class="brand-icon-lg"><i class="bi bi-play-fill"></i></div>
        <h2 class="auth-title">Welcome back</h2>
        <p class="auth-sub">Sign in to continue to EduVid</p>
      </div>

      <!-- Google OAuth -->
      <button @click="handleGoogle" class="google-btn" :disabled="loadingGoogle">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" class="google-icon" />
        <span>{{ loadingGoogle ? 'Signing in...' : 'Continue with Google' }}</span>
      </button>

      <div class="divider"><span>or</span></div>

      <form @submit.prevent="handleLogin">
        <div class="field-group">
          <label class="field-label">Email address</label>
          <input v-model="email" type="email" class="form-dark" placeholder="name@example.com" required autocomplete="email" />
        </div>
        <div class="field-group">
          <label class="field-label">Password</label>
          <input v-model="password" type="password" class="form-dark" placeholder="••••••••" required autocomplete="current-password" />
        </div>

        <div v-if="errorMessage" class="field-error">
          <i class="bi bi-exclamation-circle-fill"></i> {{ errorMessage }}
        </div>

        <button type="submit" class="btn-gradient submit-btn" :disabled="loading">
          <span v-if="loading"><i class="bi bi-arrow-repeat spin"></i> Signing in...</span>
          <span v-else>Sign in</span>
        </button>
      </form>

      <p class="auth-footer">
        Don't have an account?
        <router-link to="/register" class="auth-link">Sign up for free</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)
const loadingGoogle = ref(false)
const router = useRouter()
const authStore = useAuthStore()

const handleLogin = async () => {
  errorMessage.value = ''
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

const handleGoogle = async () => {
  errorMessage.value = ''
  loadingGoogle.value = true
  try {
    await authStore.loginWithGoogle()
    router.push('/')
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
  background: radial-gradient(ellipse 40% 40% at 50% 30%, rgba(108,99,255,0.15) 0%, transparent 70%);
  pointer-events: none;
}
.auth-card { width: 100%; max-width: 420px; padding: 2.5rem; position: relative; }
.auth-logo { text-align: center; margin-bottom: 2rem; }
.brand-icon-lg {
  width: 52px; height: 52px; background: linear-gradient(135deg, #6c63ff, #a855f7);
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

.field-group { margin-bottom: 1.25rem; }
.field-label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; }
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

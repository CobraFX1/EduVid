<template>
  <div class="auth-page">
    <div class="auth-glow"></div>
    <div class="auth-card glass-card">
      <div class="auth-logo">
        <div class="brand-icon-lg"><i class="bi bi-key-fill"></i></div>
        <h2 class="auth-title">Reset Password</h2>
        <p class="auth-sub">Enter your email to receive a recovery link.</p>
      </div>

      <form @submit.prevent="handleReset">
        <div class="field-group">
          <label class="field-label">Email address</label>
          <input 
            v-model="email" 
            type="email" 
            class="form-dark" 
            placeholder="name@example.com" 
            required 
            autocomplete="email" 
          />
        </div>

        <transition name="fade">
          <div v-if="errorMessage" class="field-error">
            <i class="bi bi-exclamation-triangle-fill"></i> {{ errorMessage }}
          </div>
        </transition>

        <transition name="fade">
          <div v-if="successMessage" class="field-success">
            <i class="bi bi-envelope-check-fill"></i> {{ successMessage }}
          </div>
        </transition>

        <button type="submit" class="btn-gradient submit-btn" :disabled="loading || successMessage">
          <span v-if="loading"><i class="bi bi-arrow-repeat spin"></i> Sending...</span>
          <span v-else>Send Reset Link</span>
        </button>
      </form>

      <p class="auth-footer">
        Remember your password?
        <router-link to="/login" class="auth-link">Back to Login</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const email = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const loading = ref(false)
const authStore = useAuthStore()

const handleReset = async () => {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await authStore.resetPassword(email.value)
    successMessage.value = 'Password reset email sent! Check your inbox.'
    email.value = '' // Clear the form
  } catch (error) {
    // Make Firebase errors a bit more user-friendly
    if (error.code === 'auth/user-not-found') {
      errorMessage.value = 'No account found with this email.'
    } else {
      errorMessage.value = 'Failed to send reset email. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Reuse your exact global auth styles here to keep the aesthetic identical */
.auth-page { min-height: 85vh; display: flex; align-items: center; justify-content: center; position: relative; padding: 2rem 1rem; }
.auth-glow { position: absolute; inset: 0; background: radial-gradient(ellipse 40% 40% at 50% 20%, rgba(255,101,132,0.1) 0%, transparent 70%); pointer-events: none; }
.auth-card { width: 100%; max-width: 480px; padding: 2.5rem; position: relative; }
.auth-logo { text-align: center; margin-bottom: 2rem; }
.brand-icon-lg { width: 52px; height: 52px; background: linear-gradient(135deg, #ff6584, #a855f7); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #fff; margin: 0 auto 1rem; }
.auth-title { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin: 0; }
.auth-sub { color: var(--text-secondary); margin: 0.35rem 0 0; font-size: 0.9rem; }
.field-group { margin-bottom: 1.1rem; }
.field-label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; }
.field-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #f87171; border-radius: 10px; padding: 0.65rem 1rem; font-size: 0.85rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
.field-success { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.25); color: #4ade80; border-radius: 10px; padding: 0.65rem 1rem; font-size: 0.85rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
.submit-btn { width: 100%; justify-content: center; display: flex; align-items: center; gap: 0.5rem; }
.auth-footer { text-align: center; color: var(--text-secondary); font-size: 0.875rem; margin-top: 1.5rem; }
.auth-link { color: var(--accent); text-decoration: none; font-weight: 600; }
.auth-link:hover { text-decoration: underline; }
.spin { display: inline-block; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
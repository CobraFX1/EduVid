<template>
  <div class="auth-page">
    <div class="auth-glow"></div>
    <div class="auth-card glass-card">
      <div class="auth-logo">
        <div class="brand-icon-lg"><i class="bi bi-envelope-check-fill"></i></div>
        <h2 class="auth-title">Verify Your Email</h2>
        <p class="auth-sub">We sent a 6-digit code to <strong>{{ authStore.user?.email }}</strong></p>
      </div>

      <form @submit.prevent="handleVerify">
        <div class="field-group">
          <label class="field-label">Verification Code *</label>
          <input 
            v-model="otp" 
            type="text" 
            class="form-dark otp-input" 
            placeholder="000000" 
            maxlength="6"
            pattern="\d*"
            inputmode="numeric"
            autocomplete="one-time-code"
            required 
          />
        </div>

        <div v-if="errorMessage" class="field-error">
          <i class="bi bi-exclamation-circle-fill"></i> {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="field-success">
          <i class="bi bi-check-circle-fill"></i> {{ successMessage }}
        </div>

        <button type="submit" class="btn-gradient submit-btn" :disabled="loading || otp.length < 6">
          <span v-if="loading"><i class="bi bi-arrow-repeat spin"></i> Verifying...</span>
          <span v-else>Confirm Code</span>
        </button>
      </form>

      <p class="auth-footer">
        Didn't receive the code?
        <button 
          @click="resendOtp" 
          class="auth-link btn-link" 
          :disabled="resendLoading || cooldown > 0"
        >
          <span v-if="resendLoading"><i class="bi bi-arrow-repeat spin"></i></span>
          {{ cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code' }}
        </button>
      </p>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getAuth } from 'firebase/auth'

const authStore = useAuthStore()
const router = useRouter()
const auth = getAuth()

const otp = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const loading = ref(false)
const resendLoading = ref(false)
const cooldown = ref(0)
const isVerified = ref(false)

/**
 * Unified Cooldown Logic
 * Handles both fresh starts (60s) and resumes from localStorage
 */
const startCooldown = (seconds = 60) => {
  // Clear any existing intervals to prevent "timer racing"
  if (window.otpTimer) clearInterval(window.otpTimer)
  
  cooldown.value = seconds
  
  if (seconds === 60) {
    localStorage.setItem('otp_last_sent', Date.now().toString())
  }

  window.otpTimer = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0) {
      clearInterval(window.otpTimer)
      localStorage.removeItem('otp_last_sent')
    }
  }, 1000)
}

onMounted(() => {
  // Give Firebase a moment to detect the user session
  setTimeout(() => {
    if (!auth.currentUser) {
      router.push('/login')
      return
    }

    if (authStore.userProfile?.isVerified) {
      router.push('/')
      return
    }

    // Check if we should resume a cooldown or send a fresh OTP
    const lastSent = localStorage.getItem('otp_last_sent')
    const now = Date.now()
    const oneMinute = 60000

    if (lastSent && (now - parseInt(lastSent) < oneMinute)) {
      const remaining = Math.ceil((oneMinute - (now - parseInt(lastSent))) / 1000)
      startCooldown(remaining)
      console.log(`Resuming cooldown: ${remaining}s left`)
    } else {
      resendOtp()
    }
  }, 500)
})

const handleVerify = async () => {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error("Session lost. Please log in again.")

    const token = await currentUser.getIdToken()
    
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ otp: otp.value })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Verification failed')

    successMessage.value = "Email verified successfully! Redirecting..."
    isVerified.value = true
    
    // Refresh the profile in Pinia
    await authStore._loadProfile(currentUser.uid)
    
    setTimeout(() => router.push('/'), 2000)
  } catch (error) {
    errorMessage.value = error.message
    otp.value = ''
  } finally {
    loading.value = false
  }
}

const resendOtp = async () => {
  if (cooldown.value > 0) return
  resendLoading.value = true
  errorMessage.value = ''
  
  try {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error("Session lost. Please log in again.")

    const token = await currentUser.getIdToken()
    
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ email: currentUser.email })
    })
    
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to send email.')
    
    startCooldown(60)
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    resendLoading.value = false
  }
}
</script>

<style scoped>
/* Core layout from Register.vue */
.auth-page {
  min-height: 85vh; display: flex; align-items: center;
  justify-content: center; position: relative; padding: 2rem 1rem;
}

/* Matching the pink/purple glow from Register.vue */
.auth-glow {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 40% 40% at 50% 20%, rgba(255,101,132,0.1) 0%, transparent 70%);
  pointer-events: none;
}

.auth-card { width: 100%; max-width: 580px; padding: 2.5rem; position: relative; }
.auth-logo { text-align: center; margin-bottom: 2rem; }

/* Matching the gradient icon from Register.vue */
.brand-icon-lg {
  width: 52px; height: 52px; background: linear-gradient(135deg, #ff6584, #a855f7);
  border-radius: 14px; display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem; color: #fff; margin: 0 auto 1rem;
}

.auth-title { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin: 0; }
.auth-sub { color: var(--text-secondary); margin: 0.35rem 0 0; font-size: 0.9rem; }

.field-group { margin-bottom: 1.1rem; }
.field-label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; }

/* OTP Specific overrides utilizing global form-dark variables */
.otp-input {
  text-align: center;
  font-size: 1.5rem;
  letter-spacing: 0.75rem;
  font-weight: 700;
  padding: 1rem;
}

.field-error {
  background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
  color: #f87171; border-radius: 10px; padding: 0.65rem 1rem;
  font-size: 0.85rem; margin-bottom: 1.25rem;
  display: flex; align-items: center; gap: 0.5rem;
}

/* Added success state to match error state */
.field-success {
  background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.25);
  color: #4ade80; border-radius: 10px; padding: 0.65rem 1rem;
  font-size: 0.85rem; margin-bottom: 1.25rem;
  display: flex; align-items: center; gap: 0.5rem;
}

.submit-btn { width: 100%; justify-content: center; display: flex; align-items: center; gap: 0.5rem; }
.auth-footer { text-align: center; color: var(--text-secondary); font-size: 0.875rem; margin-top: 1.5rem; }
.auth-link { color: var(--accent); text-decoration: none; font-weight: 600; }
.auth-link:hover { text-decoration: underline; }

/* Resend Button specific */
.btn-link {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 0.875rem;
  font-family: inherit;
}
.btn-link:disabled {
  color: var(--text-secondary);
  cursor: not-allowed;
  text-decoration: none;
}

.spin { display: inline-block; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
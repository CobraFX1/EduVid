<template>
    <div class="auth-glow"></div>
    <div class="auth-page">
        <div class="auth-card glass-card">
            <div class="auth-logo">
                <div class="brand-icon-lg"><i class="bi bi-person-badge-fill"></i></div>
                <h2 class="auth-title">Complete Your Profile</h2>
                <p class="auth-sub">Please provide your university details to continue.</p>
            </div>

            <form @submit.prevent="saveProfile">
                <div class="field-group">
                    <label class="field-label">Matric Number *</label>
                    <input v-model="matricNumber" type="text" class="form-dark" placeholder="e.g. DU0123" required />
                </div>

                <div class="field-group">
                    <label class="field-label">Programme *</label>
                    <select v-model="programme" class="form-dark" required>
                        <option value="" disabled>Select your programme</option>
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

                <div v-if="errorMessage" class="field-error">
                    <i class="bi bi-exclamation-circle-fill"></i> {{ errorMessage }}
                </div>

                <button type="submit" class="btn-gradient submit-btn" :disabled="loading">
                    <span v-if="loading"><i class="bi bi-arrow-repeat spin"></i> Saving...</span>
                    <span v-else>Finish Setup</span>
                </button>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const matricNumber = ref('')
const programme = ref('')
const level = ref('')
const errorMessage = ref('')
const loading = ref(false)

const programmes = [
    'B.Sc. Software Engineering',
    'B.Sc. Computer Science',
    'B.Sc. Information Technology',
    'B.Sc. Cyber Security',
    'B.Sc. Computer Engineering',
    // ... (use the same list from Register.vue)
]

const saveProfile = async () => {
    errorMessage.value = ''

    // 1. RE-ENFORCE THE RULES
    const cleanMatric = matricNumber.value.trim().toUpperCase()
    const matricRegex = /^DU\d{4}$/

    if (!matricRegex.test(cleanMatric)) {
        errorMessage.value = 'Invalid format. Use DU followed by 4 digits.'
        return
    }

    loading.value = true
    try {
        // We update the existing Google Auth user with these details
        // Note: We use the UID already stored in authStore.user
        await authStore._createUserProfile(authStore.user, {
            name: authStore.user.displayName,
            matricNumber: cleanMatric,
            programme: programme.value,
            level: level.value
        })

        router.push('/')
    } catch (error) {
        errorMessage.value = error.message
    } finally {
        loading.value = false
    }
}
</script>
<style scoped>
/* Reuse the core layout from Register.vue */
.auth-page {
    min-height: 85vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 2rem 1rem;
}

/* The ambient background glow */
.auth-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 40% 40% at 50% 20%, rgba(168, 85, 247, 0.1) 0%, transparent 70%);
    pointer-events: none;
}

/* The glassmorphic card container */
.auth-card {
    width: 100%;
    max-width: 580px;
    padding: 2.5rem;
    position: relative;
    /* Assumes .glass-card is defined globally, otherwise add backdrop-filter here */
}

.auth-logo {
    text-align: center;
    margin-bottom: 2rem;
}

.brand-icon-lg {
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, #ff6584, #a855f7);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    color: #fff;
    margin: 0 auto 1rem;
}

.auth-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
}

.auth-sub {
    color: var(--text-secondary);
    margin: 0.35rem 0 0;
    font-size: 0.9rem;
}

/* Grid layout for inputs */
.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.field-group {
    margin-bottom: 1.25rem;
}

.field-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
}

/* Standardizing the dark inputs to match Register.vue */
.form-dark {
    width: 100%;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: 0.75rem 1rem;
    border-radius: 10px;
    outline: none;
    transition: border-color 0.2s;
}

.form-dark:focus {
    border-color: var(--accent);
}

select.form-dark {
    cursor: pointer;
    appearance: none;
    /* Removes default arrow to custom style if needed */
}

/* Feedback/Error box */
.field-error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.25);
    color: #f87171;
    border-radius: 10px;
    padding: 0.65rem 1rem;
    font-size: 0.85rem;
    margin-bottom: 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.submit-btn {
    width: 100%;
    justify-content: center;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.spin {
    display: inline-block;
    animation: spin 0.6s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
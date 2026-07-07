<template>
  <div class="matric-manager">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h3 class="mb-0 text-white"><i class="bi bi-shield-check text-success me-2"></i>Valid Matric Numbers</h3>
      <span class="badge bg-primary rounded-pill px-3">{{ validMatrics.length }} Records</span>
    </div>

    <!-- Add New Matric Form -->
    <div class="add-matric-card p-4 mb-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="text-white mb-0">Whitelist New Students</h5>
        <div class="btn-group">
          <button @click="bulkMode = false" class="btn btn-sm" :class="!bulkMode ? 'btn-primary' : 'btn-outline-secondary'">Single Add</button>
          <button @click="bulkMode = true" class="btn btn-sm" :class="bulkMode ? 'btn-primary' : 'btn-outline-secondary'">Bulk Add</button>
        </div>
      </div>

      <form @submit.prevent="addMatric">
        <!-- Single Add Mode -->
        <div v-if="!bulkMode" class="d-flex flex-wrap gap-3 align-items-end">
          <div class="flex-grow-1">
            <label class="small text-muted mb-1">Matric Number</label>
            <input v-model="newRecord.matric" type="text" class="form-control form-dark" placeholder="DU1234" :required="!bulkMode" />
          </div>
          <div class="flex-grow-1">
            <label class="small text-muted mb-1">Email Address</label>
            <input v-model="newRecord.email" type="email" class="form-control form-dark" placeholder="student@gmail.com" :required="!bulkMode" />
          </div>
          <button type="submit" class="btn btn-success px-4 h-100" style="min-height: 38px;" :disabled="adding">
            <span v-if="adding" class="spinner-border spinner-border-sm"></span>
            <span v-else>Whitelist Student</span>
          </button>
        </div>

        <!-- Bulk Add Mode -->
        <div v-else>
          <label class="small text-muted mb-1">Paste bulk data (Format: Matric, Email — one per line)</label>
          <textarea v-model="bulkText" class="form-control form-dark mb-3" rows="4" placeholder="DU1234, john@gmail.com&#10;DU1235, jane@gmail.com" :required="bulkMode"></textarea>
          <button type="submit" class="btn btn-success px-4" :disabled="adding">
            <span v-if="adding" class="spinner-border spinner-border-sm"></span>
            <span v-else>Whitelist All</span>
          </button>
        </div>
      </form>
      <div v-if="errorMsg" class="text-danger mt-3 small"><i class="bi bi-exclamation-triangle-fill me-1"></i>{{ errorMsg }}</div>
      <div v-if="successMsg" class="text-success mt-3 small"><i class="bi bi-check-circle-fill me-1"></i>{{ successMsg }}</div>
    </div>

    <!-- List of Valid Matrics -->
    <div class="table-responsive">
      <table class="table table-dark table-hover align-middle custom-table">
        <thead>
          <tr>
            <th>Matric Number</th>
            <th>Email</th>
            <th>Added On</th>
            <th>Status</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="text-center py-4">
              <div class="spinner-border text-primary" role="status"></div>
            </td>
          </tr>
          <tr v-else-if="validMatrics.length === 0">
            <td colspan="5" class="text-center py-4 text-muted">No matric numbers whitelisted yet.</td>
          </tr>
          <tr v-for="m in validMatrics" :key="m.id">
            <td class="fw-bold text-white">{{ m.id }}</td>
            <td class="text-white">{{ m.email || '—' }}</td>
            <td class="text-muted small">{{ formatDate(m.createdAt) }}</td>
            <td>
              <span class="badge" :class="m.isClaimed ? 'bg-secondary' : 'bg-success'">
                {{ m.isClaimed ? 'Claimed' : 'Available' }}
              </span>
            </td>
            <td class="text-end">
              <button @click="removeMatric(m.id)" class="btn btn-sm btn-outline-danger" :disabled="m.isClaimed" title="Remove">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../firebase'
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore'

const validMatrics = ref([])
const newRecord = ref({ matric: '', email: '' })
const bulkMode = ref(false)
const bulkText = ref('')
const loading = ref(true)
const adding = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const loadMatrics = async () => {
  loading.value = true
  try {
    const snap = await getDocs(collection(db, 'valid_matric_numbers'))
    const records = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    
    // Check if they are claimed by cross-referencing users collection
    for (let record of records) {
      const userSnap = await getDocs(query(collection(db, 'users'), where('matricNumber', '==', record.id)))
      record.isClaimed = !userSnap.empty
    }
    
    validMatrics.value = records.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis())
  } catch (error) {
    console.error("Error loading matrics:", error)
  } finally {
    loading.value = false
  }
}

const addMatric = async () => {
  errorMsg.value = ''
  successMsg.value = ''
  
  let recordsToAdd = []
  const matricRegex = /^DU\d{4}$/
  
  if (!bulkMode.value) {
    // Single Add Mode
    if (!newRecord.value.matric || !newRecord.value.email) {
      errorMsg.value = 'All fields are required.'
      return
    }
    const m = newRecord.value.matric.trim().toUpperCase()
    if (!matricRegex.test(m)) {
      errorMsg.value = `Invalid format: ${m}. Must be DU followed by 4 digits.`
      return
    }
    recordsToAdd.push({
      matric: m,
      email: newRecord.value.email.trim().toLowerCase()
    })
  } else {
    // Bulk Add Mode
    if (!bulkText.value.trim()) {
      errorMsg.value = 'Please paste some data.'
      return
    }
    const lines = bulkText.value.split('\n').map(l => l.trim()).filter(l => l)
    for (let line of lines) {
      const parts = line.split(',')
      if (parts.length < 2) {
        errorMsg.value = `Invalid line format: "${line}". Expected: Matric, Email.`
        return
      }
      const m = parts[0].trim().toUpperCase()
      const e = parts.slice(1).join(',').trim().toLowerCase()
      
      if (!matricRegex.test(m)) {
        errorMsg.value = `Invalid format on line: "${line}". Must be DU followed by 4 digits.`
        return
      }
      if (!e.includes('@')) {
        errorMsg.value = `Invalid email on line: "${line}".`
        return
      }
      recordsToAdd.push({ matric: m, email: e })
    }
  }

  adding.value = true
  try {
    let addedCount = 0;
    for (const record of recordsToAdd) {
      const docRef = doc(db, 'valid_matric_numbers', record.matric)
      await setDoc(docRef, {
        email: record.email,
        createdAt: serverTimestamp()
      })
      addedCount++
    }

    successMsg.value = `Successfully whitelisted ${addedCount} student(s).`
    if (!bulkMode.value) {
      newRecord.value = { matric: '', email: '' }
    } else {
      bulkText.value = ''
    }
    await loadMatrics() // Refresh list
  } catch (error) {
    errorMsg.value = 'Failed to add matric number: ' + error.message
  } finally {
    adding.value = false
    setTimeout(() => { successMsg.value = '' }, 3000)
  }
}

const removeMatric = async (id) => {
  if (!confirm(`Are you sure you want to remove ${id} from the whitelist?`)) return
  try {
    await deleteDoc(doc(db, 'valid_matric_numbers', id))
    validMatrics.value = validMatrics.value.filter(m => m.id !== id)
  } catch (error) {
    alert('Failed to remove: ' + error.message)
  }
}

const formatDate = (ts) => {
  if (!ts) return 'Just now'
  return new Date(ts.toMillis()).toLocaleDateString()
}

onMounted(() => {
  loadMatrics()
})
</script>

<style scoped>
.add-matric-card {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.form-dark {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
}
.form-dark:focus {
  background: rgba(15, 23, 42, 1);
  border-color: var(--accent);
  box-shadow: none;
}
.custom-table {
  --bs-table-bg: transparent;
  --bs-table-color: #f1f5f9;
  --bs-table-border-color: rgba(255,255,255,0.05);
}
.custom-table th {
  background: rgba(0,0,0,0.2);
  color: #94a3b8;
  font-weight: 600;
  border-bottom: 2px solid rgba(255,255,255,0.1);
}
.custom-table td {
  padding: 1rem 0.5rem;
}
</style>

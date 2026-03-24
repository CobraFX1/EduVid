<template>
  <div class="user-manager section-block">
    <div class="header">
      <h2>User Directory</h2>
      <div class="search-box">
        <i class="bi bi-search"></i>
        <input v-model="searchQuery" class="form-input" placeholder="Search accounts..." />
      </div>
    </div>
    
    <div v-if="loading" class="state-center"><div class="spinner"></div></div>
    
    <div v-else class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Matric / Level</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in filteredUsers" :key="u.uid" class="table-row">
            <td>
              <div class="user-info">
                <p class="u-name">{{ u.name || 'No Name Provided' }}</p>
                <p class="u-email">{{ u.email }}</p>
              </div>
            </td>
            <td>
              <p class="u-matric">{{ u.matricNumber || '—' }}</p>
              <p class="u-prog">{{ u.programme || '—' }} <span v-if="u.level">· {{ u.level }}L</span></p>
            </td>
            <td>
              <span class="role-badge" :class="u.role === 'admin' ? 'role-admin' : 'role-student'">
                {{ u.role || 'student' }}
              </span>
            </td>
            <td>{{ formatDate(u.createdAt) }}</td>
            <td class="action-cell">
              <button v-if="u.role !== 'admin'" @click="toggleRole(u, 'admin')" class="btn-glass action-btn">
                Make Admin
              </button>
              <button v-else @click="toggleRole(u, 'student')" class="btn-glass action-btn text-danger">
                Revoke Admin
              </button>
              <!-- Future Ban endpoint (Blocked out visually for Milestone 3 completion) -->
              <button @click="blockUser(u)" class="btn-delete-icon ms-2" title="Ban User" v-if="u.role !== 'admin'">
                <i class="bi bi-slash-circle"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { db } from '../firebase'
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore'

const users = ref([])
const loading = ref(true)
const searchQuery = ref('')

onMounted(() => {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
  const unsub = onSnapshot(q, (snap) => {
    users.value = snap.docs.map(d => ({ uid: d.id, ...d.data() }))
    loading.value = false
  })
  return () => unsub()
})

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  const s = searchQuery.value.toLowerCase()
  return users.value.filter(u => 
    (u.name && u.name.toLowerCase().includes(s)) ||
    (u.email && u.email.toLowerCase().includes(s)) ||
    (u.matricNumber && u.matricNumber.toLowerCase().includes(s))
  )
})

const toggleRole = async (user, newRole) => {
  if (!confirm(`Are you sure you want to make ${user.email} a ${newRole}?`)) return
  try {
    await updateDoc(doc(db, 'users', user.uid), { role: newRole })
  } catch (e) { alert('Permission denied. Only admins can toggle roles. ' + e.message) }
}

const blockUser = async (user) => {
  if (!confirm(`Permanently restrict ${user.email} from uploading? (Feature visually stubbed)`)) return
  try {
    await updateDoc(doc(db, 'users', user.uid), { isBanned: true })
  } catch (e) { alert(e.message) }
}

const formatDate = (ts) => {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
}
</script>

<style scoped>
.section-block { padding: 1.5rem 0; width: 100%; display: flex; flex-direction: column; gap: 1rem; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 1rem; flex-wrap: wrap; gap: 1rem; }
.header h2 { font-size: 1.3rem; font-weight: 700; margin: 0; color: var(--text-primary); }
.search-box { position: relative; width: 100%; max-width: 320px; }
.search-box i { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary); }
.form-input { width: 100%; padding: 0.6rem 1rem 0.6rem 2.4rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; color: var(--text-primary); font-size: 0.9rem; outline: none; transition: border-color 0.2s;}
.form-input:focus { border-color: var(--accent); }
.table-wrap { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 600px; }
.admin-table th { text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; font-weight: 700; color: var(--text-secondary); background: rgba(108,99,255,0.04); text-align: left; padding: 1rem; border-bottom: 1px solid var(--border); }
.table-row { border-bottom: 1px solid var(--border); transition: background 0.15s; }
.table-row:hover { background: var(--bg-card-hover); }
.table-row:last-child { border-bottom: none; }
.admin-table td { padding: 1rem; vertical-align: middle; }
.user-info p, .u-matric { margin: 0; }
.u-name { font-weight: 600; color: var(--text-primary); font-size: 0.95rem; margin-bottom: 0.2rem; }
.u-email, .u-prog { font-size: 0.8rem; color: var(--text-secondary); }
.u-matric { font-weight: 600; color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.2rem; font-family: monospace; }
.role-badge { font-size: 0.7rem; padding: 3px 10px; border-radius: 999px; font-weight: 700; text-transform: uppercase; }
.role-admin { background: rgba(251,191,36,0.15); color: #fbbf24; }
.role-student { background: rgba(108,99,255,0.15); color: var(--accent); }
.action-cell { display: flex; align-items: center; gap: 0.5rem; }
.action-btn { padding: 0.4rem 0.8rem; font-size: 0.75rem; white-space: nowrap; }
.btn-glass { border: 1px solid var(--border); color: var(--text-primary); border-radius: 8px; cursor: pointer; font-weight: 600; background: transparent; transition: background 0.2s;}
.btn-glass:hover { background: var(--bg-card-hover); }
.text-danger { color: #f87171 !important; border-color: rgba(239,68,68,0.3) !important; }
.text-danger:hover { background: rgba(239,68,68,0.1) !important; }
.btn-delete-icon { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; transition: color 0.15s; font-size: 1.1rem; padding: 0.4rem; border-radius: 6px; }
.btn-delete-icon:hover { color: #f87171; background: rgba(248,113,113,0.1); }
.state-center { text-align: center; padding: 3rem; }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(108,99,255,0.15); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

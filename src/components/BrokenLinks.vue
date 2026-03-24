<template>
  <div class="broken-links-wrap">
    <div v-if="loading" class="state-center">
      <div class="spinner"></div>
    </div>
    
    <div v-else-if="deadVideos.length === 0" class="state-center">
      <i class="bi bi-shield-check" style="font-size:3.5rem; color:#4ade80; opacity:0.8;"></i>
      <h2 style="margin-top:1rem; font-weight:700;">All Systems Go</h2>
      <p style="color:var(--text-secondary); margin-top:0.25rem;">Platform health is 100%. No broken YouTube links detected.</p>
    </div>

    <div v-else class="dead-list">
      <div class="dead-notice">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <span>These videos were removed from YouTube but still exist in our database. You must permanently delete them here to clean up the platform.</span>
      </div>

      <div v-for="video in deadVideos" :key="video.id" class="dead-card glass-card">
        <div class="dead-info">
          <h3 class="dead-title">{{ video.title }}</h3>
          <p class="dead-meta">Course: <b>{{ video.courseCode }}</b> · Uploaded By: {{ video.userEmail }}</p>
          <p class="dead-id">YouTube ID: <code>{{ video.videoId }}</code></p>
        </div>
        
        <div class="dead-actions">
          <button @click="deleteGhostRecord(video.id)" class="btn-delete">
            <i class="bi bi-trash3 me-2"></i>Permanently Delete Record
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../firebase'
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore'

const deadVideos = ref([])
const loading = ref(true)

const fetchDeadLinks = async () => {
  loading.value = true
  try {
    const q = query(collection(db, 'videos'), where('brokenLink', '==', true))
    const snap = await getDocs(q)
    deadVideos.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const deleteGhostRecord = async (id) => {
  if (!confirm("Permanently erase this ghost record from Firestore?")) return
  try {
    await deleteDoc(doc(db, 'videos', id))
    deadVideos.value = deadVideos.value.filter(v => v.id !== id)
  } catch(e) {
    alert(e.message)
  }
}

onMounted(fetchDeadLinks)
</script>

<style scoped>
.broken-links-wrap { animation: fadeIn 0.3s ease; padding-top: 1rem; }
.state-center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem 1rem; text-align: center; }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(108,99,255,0.15); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.dead-list { display: flex; flex-direction: column; gap: 1.25rem; }
.dead-notice { 
  background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3);
  color: #f87171; padding: 1rem 1.25rem; border-radius: 12px;
  display: flex; align-items: center; gap: 0.75rem; font-size: 0.95rem; font-weight: 500;
  margin-bottom: 0.5rem; line-height: 1.5;
}

.dead-card { 
  display: flex; align-items: center; justify-content: space-between; 
  padding: 1.5rem; gap: 1.5rem; flex-wrap: wrap; 
  border-left: 4px solid #f87171; background: var(--bg-card);
}
.dead-info { flex: 1; min-width: 250px; }
.dead-title { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.4rem; }
.dead-meta { font-size: 0.85rem; color: var(--text-secondary); margin: 0 0 0.6rem; }
.dead-meta b { color: var(--text-primary); }
.dead-id code { background: rgba(255,255,255,0.05); padding: 3px 8px; border-radius: 6px; color: #fbbf24; font-size: 0.85rem;}

.btn-delete { 
  background: rgba(239,68,68,0.1) !important; border: 1px solid rgba(239,68,68,0.3); 
  color: #f87171; font-weight: 700; padding: 0.75rem 1.5rem; 
  border-radius: 10px; cursor: pointer; transition: all 0.2s; 
}
.btn-delete:hover { background: rgba(239,68,68,0.2) !important; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(239,68,68,0.15);}
</style>

<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h1 class="page-title">Course <span class="gradient-text">Catalog</span></h1>
      <p class="page-sub">Browse all curriculum-aligned peer video content at Dominion University</p>
    </div>

    <!-- Search and filter -->
    <div class="filter-bar glass-card">
      <div class="search-wrap">
        <i class="bi bi-search"></i>
        <input v-model="search" class="search-input" placeholder="Search courses or codes..." />
      </div>
      <select v-model="filterDept" class="filter-select">
        <option value="">All Departments</option>
        <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
      </select>
      <select v-model="filterLevel" class="filter-select">
        <option value="">All Levels</option>
        <option v-for="l in [100,200,300,400,500]" :key="l" :value="l">{{ l }} Level</option>
      </select>
    </div>

    <div v-if="loading" class="state-center"><div class="spinner"></div></div>

    <template v-else>
      <div v-for="(group, dept) in groupedCourses" :key="dept" class="dept-group">
        <h2 class="dept-title">{{ dept }}</h2>
        <div class="course-grid">
          <router-link
            v-for="course in group"
            :key="course.id"
            :to="`/courses/${course.code}`"
            class="course-card glass-card"
          >
            <div class="course-badge">{{ course.level }}L</div>
            <div class="course-code gradient-text">{{ course.code }}</div>
            <div class="course-name">{{ course.title }}</div>
            <div class="course-footer">
              <span><i class="bi bi-play-circle me-1"></i>{{ course.videoCount || 0 }} videos</span>
              <i class="bi bi-arrow-right-short"></i>
            </div>
          </router-link>
        </div>
      </div>

      <div v-if="Object.keys(groupedCourses).length === 0" class="state-center">
        <i class="bi bi-journal-x" style="font-size:2.5rem; opacity:0.3;"></i>
        <p style="color:var(--text-secondary); margin-top:0.75rem;">No courses match your search.</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db } from '../firebase'
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore'

const courses = ref([])
const loading = ref(true)
const search = ref('')
const filterDept = ref('')
const filterLevel = ref('')

const departments = computed(() => [...new Set(courses.value.map(c => c.department))].sort())

const filtered = computed(() => {
  return courses.value.filter(c => {
    const q = search.value.toLowerCase()
    const matchSearch = !q || c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
    const matchDept = !filterDept.value || c.department === filterDept.value
    const matchLevel = !filterLevel.value || c.level == filterLevel.value
    return matchSearch && matchDept && matchLevel
  })
})

const groupedCourses = computed(() => {
  const groups = {}
  for (const c of filtered.value) {
    if (!groups[c.department]) groups[c.department] = []
    groups[c.department].push(c)
  }
  // Sort within each group by level then code
  for (const dept in groups) {
    groups[dept].sort((a, b) => a.level - b.level || a.code.localeCompare(b.code))
  }
  return groups
})

onMounted(() => {
  const q = query(collection(db, 'courses'), orderBy('code'))
  const unsub = onSnapshot(q, snap => {
    courses.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    loading.value = false
  }, e => { console.error(e); loading.value = false })
  // cleanup on unmount
  return () => unsub()
})
</script>

<style scoped>
.page-wrapper { max-width: 1280px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
.page-header { margin-bottom: 2rem; }
.page-title { font-size: 1.9rem; font-weight: 800; margin: 0; }
.page-sub { color: var(--text-secondary); margin: 0.35rem 0 0; font-size: 0.9rem; }

.filter-bar {
  display: flex; gap: 1rem; align-items: center; padding: 1rem 1.25rem;
  margin-bottom: 2.5rem; flex-wrap: wrap;
}
.search-wrap { position: relative; flex: 1; min-width: 200px; }
.search-wrap i { position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary); }
.search-input {
  width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--border);
  border-radius: 10px; padding: 0.6rem 1rem 0.6rem 2.4rem;
  color: var(--text-primary); font-size: 0.875rem; outline: none;
}
.search-input:focus { border-color: var(--accent); }
.filter-select {
  background: rgba(255,255,255,0.05); border: 1px solid var(--border);
  border-radius: 10px; padding: 0.6rem 1rem; color: var(--text-primary);
  font-size: 0.875rem; cursor: pointer; outline: none; min-width: 150px;
}
.filter-select option { background: #1a1b2e; }

.dept-group { margin-bottom: 2.5rem; }
.dept-title {
  font-size: 1.1rem; font-weight: 700; color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.08em;
  margin: 0 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border);
}
.course-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
.course-card {
  padding: 1.25rem; text-decoration: none; display: flex; flex-direction: column; gap: 0.4rem;
  transition: transform 0.2s, box-shadow 0.2s;
}
.course-card:hover { transform: translateY(-3px); }
.course-badge {
  font-size: 0.7rem; font-weight: 700; background: rgba(108,99,255,0.12);
  color: var(--accent); padding: 2px 9px; border-radius: 999px;
  width: fit-content; text-transform: uppercase; letter-spacing: 0.05em;
}
.course-code { font-size: 1.15rem; font-weight: 800; }
.course-name { font-size: 0.85rem; color: var(--text-secondary); flex: 1; }
.course-footer {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;
  padding-top: 0.75rem; border-top: 1px solid var(--border);
}
.state-center {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 4rem 1rem; color: var(--text-secondary);
}
.spinner {
  width: 36px; height: 36px; border: 3px solid rgba(108,99,255,0.15);
  border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>

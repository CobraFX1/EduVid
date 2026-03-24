<template>
  <div class="course-manager">
    
    <!-- DEPARTMENTS SECTION -->
    <div class="section-block">
      <div class="header">
        <h2>Departments</h2>
        <button @click="showAddDeptModal = true" class="btn-gradient">
          <i class="bi bi-plus-lg"></i> Add Department
        </button>
      </div>
      <div v-if="loading" class="state-center"><div class="spinner"></div></div>
      <div v-else-if="customDepartments.length === 0" class="empty-state">No departments configured. Add one above.</div>
      <div v-else class="items-grid depts-grid">
        <div v-for="dept in customDepartments" :key="dept.id" class="item-card glass-card">
          <h3 class="item-title">{{ dept.name }}</h3>
          <button @click="deleteDepartment(dept.id)" class="btn-delete-icon" title="Delete Department">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- COURSES SECTION -->
    <div class="section-block">
      <div class="header">
        <h2>Courses</h2>
        <button @click="showAddCourseModal = true" class="btn-gradient" :disabled="customDepartments.length === 0">
          <i class="bi bi-plus-lg"></i> Add Course
        </button>
      </div>
      <div v-if="loading" class="state-center"><div class="spinner"></div></div>
      <div v-else-if="courses.length === 0" class="empty-state">No courses configured.</div>
      <div v-else class="items-grid courses-grid">
        <div v-for="course in courses" :key="course.id" class="item-card glass-card course-variant">
          <div class="card-top">
            <span class="dept-badge">{{ course.department }}</span>
            <span class="level-badge">{{ course.level }}L</span>
          </div>
          <h3 class="course-code">{{ course.code }}</h3>
          <p class="course-title">{{ course.title }}</p>
          <button @click="deleteCourse(course.id)" class="btn-delete-icon corner-delete" title="Delete Course">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Add Department Modal -->
    <div v-if="showAddDeptModal" class="modal-overlay" @click.self="showAddDeptModal = false">
      <div class="modal-box glass-card">
        <h3 class="modal-title">Add Department</h3>
        <form @submit.prevent="addDepartment">
          <div class="field-group">
            <label>Department Name</label>
            <input v-model="newDeptName" required placeholder="e.g. Graphic Design" class="form-input"/>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showAddDeptModal = false" class="btn-glass">Cancel</button>
            <button type="submit" class="btn-gradient" :disabled="submitting">Add</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Course Modal -->
    <div v-if="showAddCourseModal" class="modal-overlay" @click.self="showAddCourseModal = false">
      <div class="modal-box glass-card">
        <h3 class="modal-title">Add Course</h3>
        <form @submit.prevent="addCourse">
          <div class="field-group">
            <label>Department</label>
            <select v-model="newCourse.department" required class="form-input">
              <option value="" disabled>Select Department</option>
              <option v-for="dept in customDepartments" :key="dept.id" :value="dept.name">{{ dept.name }}</option>
            </select>
          </div>
          <div class="field-group">
            <label>Level</label>
            <select v-model.number="newCourse.level" required class="form-input">
              <option value="100">100</option><option value="200">200</option>
              <option value="300">300</option><option value="400">400</option>
              <option value="500">500</option>
            </select>
          </div>
          <div class="field-group">
            <label>Course Code</label>
            <input v-model="newCourse.code" required placeholder="e.g. SEN401" class="form-input"/>
          </div>
          <div class="field-group">
            <label>Course Title</label>
            <input v-model="newCourse.title" required placeholder="e.g. Operating Systems" class="form-input"/>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showAddCourseModal = false" class="btn-glass">Cancel</button>
            <button type="submit" class="btn-gradient" :disabled="submitting">Add</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../firebase'
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, writeBatch, where, getDocs } from 'firebase/firestore'

const courses = ref([])
const customDepartments = ref([])
const loading = ref(true)

const showAddCourseModal = ref(false)
const showAddDeptModal = ref(false)
const submitting = ref(false)

const newCourse = ref({ department: '', level: '100', code: '', title: '' })
const newDeptName = ref('')

onMounted(() => {
  // Fetch Courses
  const qCourses = query(collection(db, 'courses'))
  const unsubCourses = onSnapshot(qCourses, (snap) => {
    let data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    data.sort((a,b) => {
      if (a.department !== b.department) return (a.department || '').localeCompare(b.department || '')
      if (a.level !== b.level) return (a.level || 0) - (b.level || 0)
      return (a.code || '').localeCompare(b.code || '')
    })
    courses.value = data
    loading.value = false
  })

  // Fetch Departments
  const qDepts = query(collection(db, 'departments'))
  const unsubDepts = onSnapshot(qDepts, (snap) => {
    let data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    data.sort((a,b) => (a.name || '').localeCompare(b.name || ''))
    customDepartments.value = data
  })

  return () => { unsubCourses(); unsubDepts() }
})

const addDepartment = async () => {
  if (submitting.value || !newDeptName.value.trim()) return
  submitting.value = true
  try {
    await addDoc(collection(db, 'departments'), { name: newDeptName.value.trim(), createdAt: serverTimestamp() })
    showAddDeptModal.value = false
    newDeptName.value = ''
  } catch (err) { alert('Error: ' + err.message) }
  finally { submitting.value = false }
}

const deleteDepartment = async (id) => {
  const dept = customDepartments.value.find(d => d.id === id)
  if (!dept) return
  if (!confirm(`Are you sure you want to delete ${dept.name} and ALL connected courses?`)) return
  
  try {
    const qCourses = query(collection(db, 'courses'), where('department', '==', dept.name))
    const snap = await getDocs(qCourses)
    
    const batch = writeBatch(db)
    snap.docs.forEach(docSnap => {
      batch.delete(docSnap.ref)
    })
    
    batch.delete(doc(db, 'departments', id))
    await batch.commit()
  } catch (err) { alert('Error: ' + err.message) }
}

const addCourse = async () => {
  if (submitting.value) return
  submitting.value = true
  try {
    const cleanCode = newCourse.value.code.replace(/\s+/g, '').toUpperCase()
    await addDoc(collection(db, 'courses'), {
      department: newCourse.value.department,
      level: Number(newCourse.value.level),
      code: cleanCode,
      title: newCourse.value.title.trim(),
      videoCount: 0,
      createdAt: serverTimestamp()
    })
    showAddCourseModal.value = false
    newCourse.value.code = ''
    newCourse.value.title = ''
  } catch (err) { alert('Error: ' + err.message) }
  finally { submitting.value = false }
}

const deleteCourse = async (id) => {
  if (!confirm('Delete this course?')) return
  await deleteDoc(doc(db, 'courses', id))
}
</script>

<style scoped>
.course-manager { padding: 1rem 0; width: 100%; display: flex; flex-direction: column; gap: 3rem; }
.section-block { display: flex; flex-direction: column; gap: 1rem; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 1rem; }
.header h2 { font-size: 1.3rem; font-weight: 700; margin: 0; color: var(--text-primary); }

.items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.depts-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
.item-card { 
  display: flex; align-items: center; justify-content: space-between; 
  padding: 1rem 1.25rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px;
}
.item-title { font-size: 1rem; font-weight: 600; color: var(--text-primary); margin: 0; }

.course-variant { flex-direction: column; align-items: flex-start; position: relative; padding-bottom: 1.25rem; }
.card-top { display: flex; gap: 0.5rem; margin-bottom: 0.8rem; }
.dept-badge { font-size: 0.7rem; background: rgba(108,99,255,0.15); color: var(--accent); padding: 3px 10px; border-radius: 999px; font-weight: 700; }
.level-badge { font-size: 0.7rem; background: var(--border); color: var(--text-primary); padding: 3px 10px; border-radius: 999px; font-weight: 700; }
.course-code { font-size: 1.25rem; font-weight: 800; margin: 0 0 0.4rem; color: var(--text-primary); }
.course-title { font-size: 0.85rem; color: var(--text-secondary); margin: 0; line-height: 1.4; }
.corner-delete { position: absolute; bottom: 0.8rem; right: 0.8rem; }

.btn-delete-icon { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 0.4rem; transition: color 0.15s; font-size: 1.1rem; border-radius: 6px; }
.btn-delete-icon:hover { color: #f87171; background: rgba(248,113,113,0.1); }

.empty-state { color: var(--text-secondary); font-size: 0.9rem; padding: 2rem; border: 1px dashed var(--border); border-radius: 12px; text-align: center; }

/* Modals - fixed colors for theme support */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
.modal-box { max-width: 400px; width: 90%; padding: 2rem; border: 1px solid var(--border); border-radius: 16px; background: var(--bg-primary); box-shadow: var(--shadow); }
.modal-title { margin: 0 0 1.5rem; font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
.field-group { margin-bottom: 1.25rem; }
.field-group label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.4rem; }

/* THEME SUPPORTED INPUTS */
.form-input { 
  width: 100%; padding: 0.75rem 1rem; 
  background: var(--bg-card); border: 1px solid var(--border); 
  border-radius: 10px; color: var(--text-primary); 
  outline: none; transition: border-color 0.2s; font-family: inherit; 
}
.form-input:focus { border-color: var(--accent); }
select.form-input option { color: initial; background: initial; }

.modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 2rem; }
.btn-glass { border: 1px solid var(--border); color: var(--text-primary); padding: 0.6rem 1.25rem; border-radius: 10px; cursor: pointer; font-weight: 600; background: transparent; }
.btn-glass:hover { background: var(--bg-card-hover); }
.btn-gradient { padding: 0.6rem 1.25rem; border-radius: 10px; border: none; font-weight: 600; cursor: pointer; color: white; background: linear-gradient(135deg, #6c63ff, #a855f7); opacity: 1; transition: opacity 0.2s; }
.btn-gradient:hover { opacity: 0.9; }
.btn-gradient:disabled { opacity: 0.5; cursor: not-allowed; }

.state-center { text-align: center; padding: 2rem; }
.spinner { width: 30px; height: 30px; border: 3px solid rgba(108,99,255,0.15); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

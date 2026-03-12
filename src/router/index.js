import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Upload from '../views/Upload.vue'
import Admin from '../views/Admin.vue'
import Courses from '../views/Courses.vue'
import CourseDetail from '../views/CourseDetail.vue'
import Watch from '../views/Watch.vue'
import MyVideos from '../views/MyVideos.vue'
import Profile from '../views/Profile.vue'
import { useAuthStore } from '../stores/auth'

const routes = [
    { path: '/', name: 'Home', component: Home },
    { path: '/login', name: 'Login', component: Login },
    { path: '/register', name: 'Register', component: Register },
    { path: '/courses', name: 'Courses', component: Courses },
    { path: '/courses/:code', name: 'CourseDetail', component: CourseDetail },
    { path: '/watch/:id', name: 'Watch', component: Watch },
    { path: '/upload', name: 'Upload', component: Upload, meta: { requiresAuth: true } },
    { path: '/my-videos', name: 'MyVideos', component: MyVideos, meta: { requiresAuth: true } },
    { path: '/profile', name: 'Profile', component: Profile, meta: { requiresAuth: true } },
    { path: '/admin', name: 'Admin', component: Admin, meta: { requiresAuth: true } },
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach((to, from, next) => {
    const authStore = useAuthStore()
    if (to.meta.requiresAuth && !authStore.user) {
        next('/login')
    } else {
        next()
    }
})

export default router

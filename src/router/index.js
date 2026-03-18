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
import CompleteProfile from '../views/CompleteProfile.vue' // 1. Import it
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
    {
        path: '/complete-profile',
        name: 'CompleteProfile',
        component: CompleteProfile,
        meta: { requiresAuth: true }
    },
    {
        path: '/verify-email',
        name: 'VerifyEmail',
        component: () => import('../views/VerifyEmail.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/forgot-password',
        name: 'ForgotPassword',
        component: () => import('../views/ForgotPassword.vue'),
        meta: { requiresAuth: false }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})
router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    if (authStore.loading) return

    const isLoggedIn = !!authStore.user
    const profile = authStore.userProfile
    const isVerified = profile?.isVerified === true

    const isGoingToVerify = to.path === '/verify-email'
    const isGoingToCompleteProfile = to.path === '/complete-profile'
    const isGoingToLogin = to.path === '/login'
    const isGoingToRegister = to.path === '/register'

    // Check if the route requires Admin role
    if (to.meta.requiresAdmin) {
        if (!isLoggedIn) return '/login'
        if (profile?.role !== 'admin') {
            console.warn("Unauthorized access attempt to Admin Panel")
            return '/' // Redirect students to Home
        }
    }
    // 1. Handle "Ghost" Google Users first
    if (isLoggedIn && !profile && !isGoingToCompleteProfile) {
        return '/complete-profile'
    }

    // 2. 🛡️ THE NEW LOCKDOWN: Handle Unverified Users
    // If logged in, has a profile, but NOT verified... 
    // Force them to verify-email unless they are already there.
    if (isLoggedIn && profile && !isVerified && !isGoingToVerify) {
        return '/verify-email'
    }

    // 3. Normal Protected Route Check
    if (to.meta.requiresAuth && !isLoggedIn) {
        return '/login'
    }

    // 4. Prevent verified users from going back to auth pages
    if (isLoggedIn && isVerified && (isGoingToVerify || isGoingToLogin || isGoingToRegister)) {
        return '/'
    }
    // Add this inside your router.beforeEach
    if (isLoggedIn && isVerified && to.path === '/verify-email') {
        return '/'
    }
})
export default router

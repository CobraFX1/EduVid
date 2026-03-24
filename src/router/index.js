import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import { useAuthStore } from '../stores/auth'

const routes = [
    { path: '/', name: 'Home', component: Home },
    { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
    { path: '/register', name: 'Register', component: () => import('../views/Register.vue') },
    { path: '/courses', name: 'Courses', component: () => import('../views/Courses.vue') },
    { path: '/courses/:code', name: 'CourseDetail', component: () => import('../views/CourseDetail.vue') },
    { path: '/watch/:id', name: 'Watch', component: () => import('../views/Watch.vue') },
    { path: '/upload', name: 'Upload', component: () => import('../views/Upload.vue'), meta: { requiresAuth: true } },
    { path: '/my-videos', name: 'MyVideos', component: () => import('../views/MyVideos.vue'), meta: { requiresAuth: true } },
    { path: '/profile', name: 'Profile', component: () => import('../views/Profile.vue'), meta: { requiresAuth: true } },
    { path: '/admin', name: 'Admin', component: () => import('../views/Admin.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
    {
        path: '/complete-profile',
        name: 'CompleteProfile',
        component: () => import('../views/CompleteProfile.vue'),
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

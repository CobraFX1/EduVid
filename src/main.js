import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()

authStore.initializeAuth().then(() => {
    app.use(router)
    app.mount('#app')
})

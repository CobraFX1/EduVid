import { defineStore } from 'pinia'
import { auth, db, googleProvider } from '../firebase'
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        userProfile: null,
        loading: true
    }),
    getters: {
        isAdmin: (state) => state.userProfile?.role === 'admin'
    },
    actions: {
        async register(email, password, profileData = {}) {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            this.user = userCredential.user
            try { await this._createUserProfile(userCredential.user, profileData) }
            catch (e) { console.warn('Profile write skipped (check Firestore rules):', e.message) }
        },

        async loginWithGoogle() {
            const result = await signInWithPopup(auth, googleProvider)
            this.user = result.user
            // Create profile only if it doesn't exist yet
            const profileRef = doc(db, 'users', result.user.uid)
            const snap = await getDoc(profileRef)
            if (!snap.exists()) {
                await this._createUserProfile(result.user, {})
            } else {
                this.userProfile = snap.data()
            }
        },

        async login(email, password) {
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            this.user = userCredential.user
            try { await this._loadProfile(userCredential.user.uid) }
            catch (e) { console.warn('Profile load skipped:', e.message) }
        },

        async logout() {
            await signOut(auth)
            this.user = null
            this.userProfile = null
        },

        async _createUserProfile(user, extra = {}) {
            const profile = {
                uid: user.uid,
                email: user.email,
                name: extra.name || user.displayName || '',
                matricNumber: extra.matricNumber || '',
                department: extra.department || '',
                level: extra.level || '',
                role: 'student',
                isVerified: false,
                createdAt: serverTimestamp()
            }
            await setDoc(doc(db, 'users', user.uid), profile)
            this.userProfile = profile
        },

        async _loadProfile(uid) {
            const snap = await getDoc(doc(db, 'users', uid))
            if (snap.exists()) this.userProfile = snap.data()
        },

        initializeAuth() {
            return new Promise((resolve) => {
                onAuthStateChanged(auth, async (user) => {
                    this.user = user
                    if (user) {
                        try { await this._loadProfile(user.uid) }
                        catch (e) { console.warn('Profile load skipped:', e.message) }
                    }
                    this.loading = false
                    resolve()
                })
            })
        }
    }
})

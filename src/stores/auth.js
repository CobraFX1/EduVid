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
            // 1. Enforce Regex & Uppercase formatting
            const rawMatric = profileData.matricNumber.trim().toUpperCase();
            const matricRegex = /^DU\d{4}$/; // Pattern: DU followed by exactly 4 digits

            if (!matricRegex.test(rawMatric)) {
                throw new Error('Invalid Matric format. Must be DU followed by 4 numbers (e.g., DU1234).');
            }

            // 2. Perform the Uniqueness Check against the Database
            const response = await fetch('http://localhost:3000/api/auth/check-matric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matricNumber: rawMatric })
            });

            const { exists } = await response.json();
            if (exists) throw new Error('This Matric Number is already registered.');

            // Reassign the clean matric number back into the data object
            profileData.matricNumber = rawMatric;

            // 3. Proceed to Firebase Auth Creation
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            this.user = userCredential.user;

            // 4. Save the extra data to Firestore
            try { 
                await this._createUserProfile(userCredential.user, profileData) 
            } catch (e) { 
                console.warn('Profile write skipped (check Firestore rules):', e.message) 
            }
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
                programme: extra.programme || '', // UPDATED: Saved as 'programme' instead of 'department'
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
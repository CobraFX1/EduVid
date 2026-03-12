import { db } from '../firebase'
import { collection, query, where, getDocs, updateDoc, increment } from 'firebase/firestore'

async function adjustCourseCount(code, delta) {
    if (!code) return
    try {
        const q = query(collection(db, 'courses'), where('code', '==', code))
        const snap = await getDocs(q)
        if (!snap.empty) {
            const ref = snap.docs[0].ref
            await updateDoc(ref, { videoCount: increment(delta) })
        }
    } catch (e) {
        console.error('adjustCourseCount error', e)
    }
}

export const incrementCourseCount = (code) => adjustCourseCount(code, 1)
export const decrementCourseCount = (code) => adjustCourseCount(code, -1)

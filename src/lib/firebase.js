import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Collection reference
const COLLECTION_NAME = 'tenants';

export async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user, error: null };
    } catch (error) {
        console.error("Login error:", error);
        return { user: null, error: error.message };
    }
}

export async function logout() {
    try {
        await signOut(auth);
        return { success: true, error: null };
    } catch (error) {
        console.error("Logout error:", error);
        return { success: false, error: error.message };
    }
}

export async function loadFromFirebase(plotName) {
    try {
        const tenantsRef = collection(db, COLLECTION_NAME);
        let q;
        if (plotName) {
            q = query(tenantsRef, where("plot", "==", plotName));
        } else {
            q = tenantsRef;
        }

        const querySnapshot = await getDocs(q);
        const tenants = [];
        querySnapshot.forEach((doc) => {
            tenants.push({ id: doc.id, ...doc.data() });
        });
        return tenants;
    } catch (error) {
        console.error("Error loading documents: ", error);
        return null;
    }
}

export async function loadAllFromFirebase() {
    return loadFromFirebase(null);
}

export async function saveAllToFirebase(tenants) {
    try {
        const batch = writeBatch(db);
        tenants.forEach(tenant => {
            const docRef = doc(db, COLLECTION_NAME, tenant.id);
            batch.set(docRef, tenant);
        });
        await batch.commit();
        return true;
    } catch (error) {
        console.error("Error saving documents: ", error);
        return false;
    }
}

export async function deleteTenantFromFirebase(tenantId) {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, tenantId));
        return true;
    } catch (error) {
        console.error("Error deleting document: ", error);
        return false;
    }
}

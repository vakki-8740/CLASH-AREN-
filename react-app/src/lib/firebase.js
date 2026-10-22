import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCHYRqHF__EqHOxEXap-QvkHLmamfdaotU",
    authDomain: "clash-arena-cb69a.firebaseapp.com",
    projectId: "clash-arena-cb69a",
    storageBucket: "clash-arena-cb69a.firebasestorage.app",
    messagingSenderId: "300063887305",
    appId: "1:300063887305:web:6db4678be2ef60a91ba218"
};

export const FIREBASE_CONFIGURED = FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";

export const BOOTSTRAP_ADMIN_UIDS = ["E8mVnZXrGhQVvVFr5Sj3tdLZrSg1"];

export const firebaseApp = FIREBASE_CONFIGURED ? firebase.initializeApp(FIREBASE_CONFIG) : null;
export const auth = FIREBASE_CONFIGURED ? firebase.auth() : null;
export const db = FIREBASE_CONFIGURED ? firebase.firestore() : null;

export default firebase;

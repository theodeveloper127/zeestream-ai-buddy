import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAu5-XdEMDNbi5M_vUTx5BMHJR8YfXRBt0",
  authDomain: "zeestream-d2c97.firebaseapp.com",
  projectId: "zeestream-d2c97",
  storageBucket: "zeestream-d2c97.appspot.com",
  messagingSenderId: "165448607899",
  appId: "1:165448607899:web:b87275759789ed95ba7e3e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
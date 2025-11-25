// Firebase Configuration - QuickEarn PK
const firebaseConfig = {
    apiKey: "AIzaSyD9_IkfPhX1V1X-XoqO-G7gOyMnReubgdU",
    authDomain: "quickearn-web.firebaseapp.com",
    projectId: "quickearn-web",
    storageBucket: "quickearn-web.firebasestorage.app",
    messagingSenderId: "391883213034",
    appId: "1:391883213034:web:319fc5758377540de8af93"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const db = firebase.firestore();
const auth = firebase.auth();
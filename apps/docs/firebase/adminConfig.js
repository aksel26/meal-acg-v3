// firebase/adminConfig.js
import admin from "firebase-admin";

// .env.local에서 서비스 계정 키를 가져옵니다.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// 이미 초기화된 앱이 있는지 확인하여 중복 초기화를 방지합니다.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // .env.local의 버킷 주소
  });
}

const adminStorage = admin.storage();

export { admin, adminStorage };

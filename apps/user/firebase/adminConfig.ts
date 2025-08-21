// firebase/adminConfig.js
import admin from "firebase-admin";

// .env.local에서 서비스 계정 키를 가져옵니다.
const getServiceAccount = () => {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set');
    return null;
  }

  try {
    const parsed = JSON.parse(serviceAccountKey);
    
    // 필수 속성들이 있는지 확인
    if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
      console.error('Service account object is missing required properties');
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
    return null;
  }
};

// 이미 초기화된 앱이 있는지 확인하여 중복 초기화를 방지합니다.
if (!admin.apps.length) {
  const serviceAccount = getServiceAccount();
  
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    console.error('Cannot initialize Firebase Admin: Service account configuration is invalid');
  }
}

const adminStorage: admin.storage.Storage = admin.storage();

export { admin, adminStorage };

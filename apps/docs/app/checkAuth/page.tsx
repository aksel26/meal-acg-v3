import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// 구글 드라이브 접근을 위한 Google OAuth체크 페이지
export default async function CheckAuthPage() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.has("google_access_token");

  if (isAuthenticated) {
    redirect("/dashboard");
  } else {
    redirect("/api/auth/google");
  }
}

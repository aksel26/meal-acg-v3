import { redirect } from "next/navigation";

export default function ContentHomePage() {
  // Server-side redirect to dashboard as the default content page
  redirect("/dashboard");
}

import { redirect } from "next/navigation";

export default function Home() {
  // Tự động chuyển hướng root (/) sang (/dashboard)
  redirect("/dashboard"); 
}
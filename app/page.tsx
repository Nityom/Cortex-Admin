import { redirect } from "next/navigation";
// import LoginForm from "./auth/login/page";

export default function Home() {
  // Auth commented out for now - redirect directly to admin appointments
  redirect("/admin/appointments");
  // return <LoginForm />;
}

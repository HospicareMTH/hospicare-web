import { redirect } from "next/navigation";

import { SIGN_IN_PATH } from "@/modules/access";

export default function HomePage() {
  redirect(SIGN_IN_PATH);
}

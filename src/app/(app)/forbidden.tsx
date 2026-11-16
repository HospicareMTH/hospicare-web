import { AccessRestricted } from "@/modules/access";

export default function Forbidden() {
  return <AccessRestricted />;
}

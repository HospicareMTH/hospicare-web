import { getCurrentUser } from "@/modules/access";

import { listSearchEntries } from "../service";
import { GlobalSearchDialog } from "./global-search-dialog";

export async function GlobalSearch() {
  const { access } = await getCurrentUser();
  return <GlobalSearchDialog entries={listSearchEntries(access)} />;
}

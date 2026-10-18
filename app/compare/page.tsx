import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Price check lives on `/` — keep this route as a friendly alias. */
export default async function ComparePage({ searchParams }: Props) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0]);
  }
  const query = qs.toString();
  redirect(query ? `/?${query}` : "/");
}

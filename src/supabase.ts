import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../utils/supabase/info";

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
);

const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a36e6fc5`;

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(`${serverUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
      ...options.headers,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Ошибка сервера");
  }
  return data;
}

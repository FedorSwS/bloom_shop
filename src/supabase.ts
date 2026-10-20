import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../utils/supabase/info";

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
);

const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a36e6fc5`;

export type DemoUser = {
  id: string;
  email: string;
  isDemo?: boolean;
};

const DEMO_SESSION_KEY = "bloom-demo-user-session";
const memoryStore: Record<string, unknown> = {};

export function getDemoSession(): DemoUser | null {
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback to memoryStore
  }
  return (memoryStore[DEMO_SESSION_KEY] as DemoUser) || null;
}

export function setDemoSession(user: DemoUser | null): void {
  if (!user) {
    delete memoryStore[DEMO_SESSION_KEY];
  } else {
    memoryStore[DEMO_SESSION_KEY] = user;
  }
  try {
    if (!user) {
      localStorage.removeItem(DEMO_SESSION_KEY);
    } else {
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user));
    }
  } catch {
    // ignore storage errors in sandboxed iframes
  }
}

function getLocalStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return key in memoryStore ? (memoryStore[key] as T) : fallback;
}

function setLocalStore(key: string, value: unknown): void {
  memoryStore[key] = value;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors in sandboxed iframes
  }
}

function handleLocalApi<T>(
  userId: string,
  userEmail: string,
  path: string,
  options: RequestInit = {},
): T {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? JSON.parse(String(options.body)) : {};

  if (path === "/cart") {
    if (method === "PUT") {
      const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
      setLocalStore(`bloom-cart:${userId}`, items);
      return { items } as unknown as T;
    }
    const items = getLocalStore(`bloom-cart:${userId}`, []);
    return { items } as unknown as T;
  }

  if (path === "/account") {
    const orders = getLocalStore(`bloom-orders:${userId}`, []);
    const consultations = getLocalStore(`bloom-consultations:${userId}`, []);
    return {
      email: userEmail,
      orders,
      consultations,
    } as unknown as T;
  }

  if (path === "/orders" && method === "POST") {
    const order = {
      id: `BL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: "Принят в работу",
      items: Array.isArray(body.items) ? body.items.slice(0, 50) : [],
      subtotal: Number(body.subtotal) || Number(body.total) || 0,
      discount: Number(body.discount) || 0,
      deliveryFee: Number(body.deliveryFee) || 0,
      total: Number(body.total) || 0,
      promoCode: body.promoCode || "",
      fulfillmentMethod: body.fulfillmentMethod || "delivery",
      pickupPoint: body.pickupPoint || "",
      senderName: body.senderName || "",
      senderPhone: body.senderPhone || "",
      senderEmail: body.senderEmail || userEmail,
      isAnonymous: Boolean(body.isAnonymous),
      recipientName: body.recipientName || "",
      recipientPhone: body.recipientPhone || "",
      address: body.address || "",
      apartment: body.apartment || "",
      entrance: body.entrance || "",
      floor: body.floor || "",
      intercom: body.intercom || "",
      date: body.date || "",
      interval: body.interval || "",
      cardNote: body.cardNote || "",
      courierComment: body.courierComment || "",
    };
    const existing = getLocalStore<any[]>(`bloom-orders:${userId}`, []);
    setLocalStore(`bloom-orders:${userId}`, [order, ...existing].slice(0, 30));
    setLocalStore(`bloom-cart:${userId}`, []);
    return { order, emailSent: false } as unknown as T;
  }

  if (path === "/consultations" && method === "POST") {
    const consultation = {
      id: `CN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: "Новая заявка",
      name: body.name || "",
      phone: body.phone || "",
      topic: body.topic || "Подбор букета",
    };
    const existing = getLocalStore<any[]>(`bloom-consultations:${userId}`, []);
    setLocalStore(
      `bloom-consultations:${userId}`,
      [consultation, ...existing].slice(0, 30),
    );
    return { consultation, emailSent: false } as unknown as T;
  }

  return {} as T;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const demoUser = getDemoSession();

  if (session?.access_token && session.user) {
    try {
      const response = await fetch(`${serverUrl}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          ...options.headers,
        },
      });

      const data = await response.json();
      if (response.ok) {
        handleLocalApi(session.user.id, session.user.email || "", path, options);
        return data;
      }
    } catch {
      // Fallback to local storage if Edge Function is unreachable
    }
    return handleLocalApi<T>(
      session.user.id,
      session.user.email || "",
      path,
      options,
    );
  }

  if (demoUser) {
    return handleLocalApi<T>(demoUser.id, demoUser.email, path, options);
  }

  throw new Error("Необходима авторизация");
}

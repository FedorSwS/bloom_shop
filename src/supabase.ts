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
  name?: string;
  phone?: string;
  defaultAddress?: string;
  defaultApartment?: string;
  bonusPoints?: number;
  isDemo?: boolean;
};

export type UserProfile = {
  name: string;
  phone: string;
  defaultAddress: string;
  defaultApartment: string;
  bonusPoints: number;
};

export type AppNotification = {
  id: string;
  createdAt: string;
  title: string;
  message: string;
  category: "order" | "bonus" | "florist" | "info";
  read: boolean;
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

export function mergeCartItems<
  T extends { id: string; quantity: number; price: number; name: string },
>(remoteItems: T[], guestItems: T[]): T[] {
  if (!guestItems.length) return remoteItems;
  if (!remoteItems.length) return guestItems;
  const mergedMap = new Map<string, T>();
  for (const item of remoteItems) {
    mergedMap.set(item.id, { ...item });
  }
  for (const gItem of guestItems) {
    const existing = mergedMap.get(gItem.id);
    if (existing) {
      mergedMap.set(gItem.id, {
        ...existing,
        quantity: Math.min(99, existing.quantity + gItem.quantity),
      });
    } else {
      mergedMap.set(gItem.id, { ...gItem });
    }
  }
  return Array.from(mergedMap.values()).slice(0, 50);
}

function getDefaultProfile(userId: string, userEmail: string): UserProfile {
  const defaultName = userEmail.split("@")[0] || "Покупатель";
  return getLocalStore<UserProfile>(`bloom-profile:${userId}`, {
    name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
    phone: "",
    defaultAddress: "",
    defaultApartment: "",
    bonusPoints: 500,
  });
}

function pushLocalNotification(
  userId: string,
  title: string,
  message: string,
  category: AppNotification["category"] = "info",
): AppNotification[] {
  const existing = getLocalStore<AppNotification[]>(`bloom-notifications:${userId}`, []);
  const item: AppNotification = {
    id: `NT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    title,
    message,
    category,
    read: false,
  };
  const next = [item, ...existing].slice(0, 40);
  setLocalStore(`bloom-notifications:${userId}`, next);
  return next;
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

  if (path === "/profile" && method === "PUT") {
    const current = getDefaultProfile(userId, userEmail);
    const updated: UserProfile = {
      name: typeof body.name === "string" ? body.name.trim() : current.name,
      phone: typeof body.phone === "string" ? body.phone.trim() : current.phone,
      defaultAddress:
        typeof body.defaultAddress === "string"
          ? body.defaultAddress.trim()
          : current.defaultAddress,
      defaultApartment:
        typeof body.defaultApartment === "string"
          ? body.defaultApartment.trim()
          : current.defaultApartment,
      bonusPoints:
        typeof body.bonusPoints === "number"
          ? body.bonusPoints
          : current.bonusPoints,
    };
    setLocalStore(`bloom-profile:${userId}`, updated);
    const notifications = pushLocalNotification(
      userId,
      "Профиль сохранён",
      "Ваши контактные данные и основной адрес доставки в Туле обновлены.",
      "info",
    );
    return { profile: updated, notifications } as unknown as T;
  }

  if (path === "/notifications/read" && method === "PUT") {
    const existing = getLocalStore<AppNotification[]>(`bloom-notifications:${userId}`, []);
    const updated = existing.map((n) => ({ ...n, read: true }));
    setLocalStore(`bloom-notifications:${userId}`, updated);
    return { notifications: updated } as unknown as T;
  }

  if (path === "/account") {
    const orders = getLocalStore(`bloom-orders:${userId}`, []);
    const consultations = getLocalStore(`bloom-consultations:${userId}`, []);
    const profile = getDefaultProfile(userId, userEmail);
    let notifications = getLocalStore<AppNotification[]>(`bloom-notifications:${userId}`, []);
    if (!notifications.length) {
      notifications = pushLocalNotification(
        userId,
        "Добро пожаловать в Bloom Club!",
        "Вам начислено 500 приветственных бонусов (1 Б = 1 ₽). Оплачивайте ими до 30% стоимости букетов.",
        "bonus",
      );
    }
    return {
      email: userEmail,
      orders,
      consultations,
      profile,
      notifications,
    } as unknown as T;
  }

  if (path === "/orders" && method === "POST") {
    const subtotal = Number(body.subtotal) || Number(body.total) || 0;
    const discount = Number(body.discount) || 0;
    const bonusUsed = Number(body.bonusUsed) || 0;
    const deliveryFee = Number(body.deliveryFee) || 0;
    const total = Number(body.total) || 0;
    const bonusEarned = Math.round(total * 0.05);

    const profile = getDefaultProfile(userId, userEmail);
    const nextBonus = Math.max(0, profile.bonusPoints - bonusUsed) + bonusEarned;
    const updatedProfile: UserProfile = {
      name: body.senderName || profile.name,
      phone: body.senderPhone || profile.phone,
      defaultAddress:
        body.fulfillmentMethod === "delivery" && body.address
          ? body.address
          : profile.defaultAddress,
      defaultApartment:
        body.fulfillmentMethod === "delivery" && body.apartment
          ? body.apartment
          : profile.defaultApartment,
      bonusPoints: nextBonus,
    };
    setLocalStore(`bloom-profile:${userId}`, updatedProfile);

    const order = {
      id: `BL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: "Принят в работу",
      items: Array.isArray(body.items) ? body.items.slice(0, 50) : [],
      subtotal,
      discount,
      bonusUsed,
      bonusEarned,
      deliveryFee,
      total,
      promoCode: body.promoCode || "",
      paymentMethod: body.paymentMethod || "sbp",
      deliveryZone: body.deliveryZone || "city",
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
      isPrivateHouse: Boolean(body.isPrivateHouse),
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

    const modeSummary =
      order.fulfillmentMethod === "pickup"
        ? `Самовывоз из салона: ${order.pickupPoint}`
        : `Доставка курьером: ${order.address}${order.apartment ? `, кв. ${order.apartment}` : ""}`;

    const notifications = pushLocalNotification(
      userId,
      `Заказ ${order.id} принят в работу`,
      `${modeSummary}. Сумма: ${order.total.toLocaleString("ru-RU")} ₽. Начислено +${bonusEarned} бонусов Bloom Club.`,
      "order",
    );

    return { order, emailSent: true, profile: updatedProfile, notifications } as unknown as T;
  }

  if (path === "/orders/status" && method === "PUT") {
    const orderId = String(body.orderId || "");
    const nextStatus = String(body.status || "Собирается флористом");
    const existing = getLocalStore<any[]>(`bloom-orders:${userId}`, []);
    const updated = existing.map((o) =>
      o.id === orderId ? { ...o, status: nextStatus } : o,
    );
    setLocalStore(`bloom-orders:${userId}`, updated);

    const notifications = pushLocalNotification(
      userId,
      `Заказ ${orderId}: ${nextStatus}`,
      nextStatus === "Отменён"
        ? `Заказ ${orderId} был отменён.`
        : `Статус вашего заказа ${orderId} обновлён: «${nextStatus}».`,
      "order",
    );

    return { orders: updated, notifications } as unknown as T;
  }

  if (path === "/consultations" && method === "POST") {
    const consultation = {
      id: `CN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: "Назначен шеф-флорист",
      name: body.name || "",
      phone: body.phone || "",
      topic: body.topic || "Подбор букета",
    };
    const existing = getLocalStore<any[]>(`bloom-consultations:${userId}`, []);
    setLocalStore(
      `bloom-consultations:${userId}`,
      [consultation, ...existing].slice(0, 30),
    );
    const notifications = pushLocalNotification(
      userId,
      `Заявка флористу ${consultation.id}`,
      `${consultation.name}, шеф-флорист свяжется с вами по тел. ${consultation.phone} (${consultation.topic}).`,
      "florist",
    );
    return { consultation, emailSent: true, notifications } as unknown as T;
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
  const activeId = session?.user?.id || demoUser?.id || "";
  const activeEmail = session?.user?.email || demoUser?.email || "";

  if (!activeId) {
    throw new Error("Необходима авторизация");
  }

  // Try local Node.js backend (/api) first if running in dev/production server
  try {
    const localApiRes = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": activeId,
        "X-User-Email": activeEmail,
        ...options.headers,
      },
    });
    if (localApiRes.ok) {
      const contentType = localApiRes.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await localApiRes.json();
        handleLocalApi(activeId, activeEmail, path, options);
        return data as T;
      }
    }
  } catch {
    // Fallback to Supabase Edge Function or browser storage
  }

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
        const localResult = handleLocalApi<any>(
          session.user.id,
          session.user.email || "",
          path,
          options,
        );
        return { ...localResult, ...data };
      }
    } catch {
      // Fallback to local storage if Edge Function is unreachable
    }
  }

  return handleLocalApi<T>(activeId, activeEmail, path, options);
}

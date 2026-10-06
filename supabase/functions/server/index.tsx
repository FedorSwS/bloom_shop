import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();
const prefix = "/make-server-a36e6fc5";

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

type User = { id: string; email?: string };

async function authorizedUser(c: any): Promise<User | null> {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email };
}

function safe(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function sendEmail(
  to: string,
  subject: string,
  heading: string,
  content: string,
) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Bloom Shop <onboarding@resend.dev>",
      to: [to],
      subject,
      html: `
        <div style="background:#f8f5ef;padding:32px;font-family:Arial,sans-serif;color:#272824">
          <div style="max-width:560px;margin:auto;background:#fff;padding:32px;border-top:4px solid #c96372">
            <p style="margin:0 0 8px;color:#c96372;font-size:12px;font-weight:bold;letter-spacing:1px">BLOOM SHOP</p>
            <h1 style="margin:0 0 20px;font-size:26px">${safe(heading)}</h1>
            ${content}
            <p style="margin:28px 0 0;color:#6d7169;font-size:12px">С любовью, команда Bloom Shop</p>
          </div>
        </div>`,
    }),
  });

  if (!response.ok) {
    console.error("Resend error:", await response.text());
    return false;
  }
  return true;
}

app.get(`${prefix}/health`, (c) => c.json({ status: "ok" }));

app.get(`${prefix}/cart`, async (c) => {
  const user = await authorizedUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const items = (await kv.get(`cart:${user.id}`)) ?? [];
  return c.json({ items });
});

app.put(`${prefix}/cart`, async (c) => {
  const user = await authorizedUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();
  const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  await kv.set(`cart:${user.id}`, items);
  return c.json({ items });
});

app.get(`${prefix}/account`, async (c) => {
  const user = await authorizedUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const [orders, consultations] = await Promise.all([
    kv.get(`orders:${user.id}`),
    kv.get(`consultations:${user.id}`),
  ]);
  return c.json({
    email: user.email,
    orders: orders ?? [],
    consultations: consultations ?? [],
  });
});

app.post(`${prefix}/orders`, async (c) => {
  const user = await authorizedUser(c);
  if (!user?.email) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return c.json({ error: "Корзина пуста" }, 400);
  }

  const total = Number(body.total);
  if (!Number.isFinite(total) || total <= 0) {
    return c.json({ error: "Некорректная сумма заказа" }, 400);
  }

  const order = {
    id: `BL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: "Принят",
    items: body.items.slice(0, 50),
    subtotal: Number(body.subtotal) || total,
    discount: Number(body.discount) || 0,
    total,
    promoCode: safe(body.promoCode),
    address: safe(body.address),
    date: safe(body.date),
    interval: safe(body.interval),
  };

  const orders = (await kv.get(`orders:${user.id}`)) ?? [];
  await Promise.all([
    kv.set(`orders:${user.id}`, [order, ...orders].slice(0, 30)),
    kv.set(`cart:${user.id}`, []),
  ]);

  const itemRows = order.items
    .map(
      (item: any) =>
        `<li>${safe(item.name)} — ${Number(item.quantity) || 1} шт. × ${Number(item.price).toLocaleString("ru-RU")} ₽</li>`,
    )
    .join("");
  const emailSent = await sendEmail(
    user.email,
    `Заказ ${order.id} принят`,
    "Спасибо за ваш заказ",
    `<p>Мы получили заказ <strong>${order.id}</strong> и уже передали его флористу.</p>
     <ul style="padding-left:20px;line-height:1.8">${itemRows}</ul>
     <p>Итого: <strong>${total.toLocaleString("ru-RU")} ₽</strong></p>
     <p>Доставка: ${safe(order.date)}, ${safe(order.interval)}<br>${safe(order.address)}</p>`,
  );

  return c.json({ order, emailSent });
});

app.post(`${prefix}/consultations`, async (c) => {
  const user = await authorizedUser(c);
  if (!user?.email) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();
  if (!body.name || !body.phone) {
    return c.json({ error: "Заполните имя и телефон" }, 400);
  }

  const consultation = {
    id: `CN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: "Новая заявка",
    name: safe(body.name),
    phone: safe(body.phone),
  };
  const consultations = (await kv.get(`consultations:${user.id}`)) ?? [];
  await kv.set(
    `consultations:${user.id}`,
    [consultation, ...consultations].slice(0, 30),
  );

  const emailSent = await sendEmail(
    user.email,
    `Консультация ${consultation.id} подтверждена`,
    "Заявка принята",
    `<p>${safe(consultation.name)}, флорист свяжется с вами по номеру <strong>${safe(consultation.phone)}</strong> в ближайшее время.</p>
     <p>Номер заявки: <strong>${consultation.id}</strong></p>`,
  );

  return c.json({ consultation, emailSent });
});

Deno.serve(app.fetch);

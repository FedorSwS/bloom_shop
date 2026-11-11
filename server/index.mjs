import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "db.json");
const PORT = Number(process.env.API_PORT || 3001);

function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    }
  } catch (err) {
    console.error("DB read error:", err);
  }
  return { carts: {}, orders: {}, consultations: {}, profiles: {}, notifications: {} };
}

function saveDb(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("DB write error:", err);
  }
}

function getDefaultProfile(db, userId, email) {
  if (!db.profiles[userId]) {
    const baseName = (email || "Покупатель").split("@")[0];
    db.profiles[userId] = {
      name: baseName.charAt(0).toUpperCase() + baseName.slice(1),
      phone: "",
      defaultAddress: "",
      defaultApartment: "",
      bonusPoints: 500,
    };
  }
  return db.profiles[userId];
}

function pushNotification(db, userId, title, message, category = "info") {
  const list = db.notifications[userId] || [];
  const item = {
    id: `NT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    title,
    message,
    category,
    read: false,
  };
  db.notifications[userId] = [item, ...list].slice(0, 40);
  return item;
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id, X-User-Email");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const route = url.pathname.replace(/^\/api/, "").replace(/^\/make-server-a36e6fc5/, "");
  const userId = String(req.headers["x-user-id"] || "guest-user");
  const userEmail = String(req.headers["x-user-email"] || "client@bloomshop.ru");

  let rawBody = "";
  req.on("data", (chunk) => {
    rawBody += chunk;
  });

  req.on("end", () => {
    const db = loadDb();
    let body = {};
    try {
      if (rawBody) body = JSON.parse(rawBody);
    } catch {
      body = {};
    }

    const sendJson = (status, payload) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(payload));
    };

    if (route === "/health" && req.method === "GET") {
      return sendJson(200, { status: "ok", service: "bloom-shop-backend", time: new Date().toISOString() });
    }

    if (route === "/cart") {
      if (req.method === "PUT") {
        db.carts[userId] = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
        saveDb(db);
        return sendJson(200, { items: db.carts[userId] });
      }
      return sendJson(200, { items: db.carts[userId] || [] });
    }

    if (route === "/account" && req.method === "GET") {
      const profile = getDefaultProfile(db, userId, userEmail);
      if (!db.notifications[userId] || db.notifications[userId].length === 0) {
        pushNotification(
          db,
          userId,
          "Добро пожаловать в Bloom Club!",
          "Вам начислено 500 приветственных бонусов (1 бонус = 1 ₽). Оплачивайте ими до 30% заказа.",
          "bonus"
        );
      }
      saveDb(db);
      return sendJson(200, {
        email: userEmail,
        orders: db.orders[userId] || [],
        consultations: db.consultations[userId] || [],
        profile,
        notifications: db.notifications[userId] || [],
      });
    }

    if (route === "/profile" && req.method === "PUT") {
      const current = getDefaultProfile(db, userId, userEmail);
      const updated = {
        ...current,
        name: typeof body.name === "string" ? body.name.trim() : current.name,
        phone: typeof body.phone === "string" ? body.phone.trim() : current.phone,
        defaultAddress: typeof body.defaultAddress === "string" ? body.defaultAddress.trim() : current.defaultAddress,
        defaultApartment: typeof body.defaultApartment === "string" ? body.defaultApartment.trim() : current.defaultApartment,
      };
      db.profiles[userId] = updated;
      pushNotification(db, userId, "Профиль обновлён", "Ваши контактные данные и адрес доставки сохранены.", "info");
      saveDb(db);
      return sendJson(200, { profile: updated, notifications: db.notifications[userId] });
    }

    if (route === "/notifications/read" && req.method === "PUT") {
      const list = db.notifications[userId] || [];
      db.notifications[userId] = list.map((n) => ({ ...n, read: true }));
      saveDb(db);
      return sendJson(200, { notifications: db.notifications[userId] });
    }

    if (route === "/orders" && req.method === "POST") {
      const subtotal = Number(body.subtotal) || Number(body.total) || 0;
      const discount = Number(body.discount) || 0;
      const bonusUsed = Number(body.bonusUsed) || 0;
      const deliveryFee = Number(body.deliveryFee) || 0;
      const total = Number(body.total) || 0;
      const bonusEarned = Math.round(total * 0.05);

      const profile = getDefaultProfile(db, userId, userEmail);
      const updatedProfile = {
        ...profile,
        name: body.senderName || profile.name,
        phone: body.senderPhone || profile.phone,
        defaultAddress: body.fulfillmentMethod === "delivery" && body.address ? body.address : profile.defaultAddress,
        defaultApartment: body.fulfillmentMethod === "delivery" && body.apartment ? body.apartment : profile.defaultApartment,
        bonusPoints: Math.max(0, (profile.bonusPoints || 0) - bonusUsed) + bonusEarned,
      };
      db.profiles[userId] = updatedProfile;

      const order = {
        id: `BL-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
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

      const existing = db.orders[userId] || [];
      db.orders[userId] = [order, ...existing].slice(0, 30);
      db.carts[userId] = [];

      const modeText =
        order.fulfillmentMethod === "pickup"
          ? `Самовывоз: ${order.pickupPoint} (${order.date}, ${order.interval})`
          : `Доставка курьером: ${order.address} (${order.date}, ${order.interval})`;

      pushNotification(
        db,
        userId,
        `Заказ ${order.id} принят в работу`,
        `${modeText}. Сумма: ${order.total.toLocaleString("ru-RU")} ₽. Начислено +${bonusEarned} бонусов Bloom Club.`,
        "order"
      );

      saveDb(db);
      return sendJson(200, {
        order,
        emailSent: true,
        profile: updatedProfile,
        notifications: db.notifications[userId],
      });
    }

    if (route === "/orders/status" && req.method === "PUT") {
      const orderId = String(body.orderId || "");
      const nextStatus = String(body.status || "Собирается флористом");
      const existing = db.orders[userId] || [];
      db.orders[userId] = existing.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o));

      pushNotification(
        db,
        userId,
        `Статус заказа ${orderId}: ${nextStatus}`,
        nextStatus === "Отменён"
          ? `Заказ ${orderId} был отменён по вашему запросу.`
          : `Ваш заказ ${orderId} перешёл на этап «${nextStatus}».`,
        "order"
      );

      saveDb(db);
      return sendJson(200, {
        orders: db.orders[userId],
        notifications: db.notifications[userId],
      });
    }

    if (route === "/consultations" && req.method === "POST") {
      const consultation = {
        id: `CN-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        createdAt: new Date().toISOString(),
        status: "Назначен шеф-флорист",
        name: body.name || "",
        phone: body.phone || "",
        topic: body.topic || "Подбор свадебного / авторского букета",
      };
      const existing = db.consultations[userId] || [];
      db.consultations[userId] = [consultation, ...existing].slice(0, 30);

      pushNotification(
        db,
        userId,
        `Заявка флористу ${consultation.id}`,
        `Шеф-флорист свяжется с вами по номеру ${consultation.phone} по теме «${consultation.topic}».`,
        "florist"
      );

      saveDb(db);
      return sendJson(200, {
        consultation,
        emailSent: true,
        notifications: db.notifications[userId],
      });
    }

    return sendJson(404, { error: "Not found" });
  });
});

server.listen(PORT, () => {
  console.log(`Bloom Shop API Server running on http://localhost:${PORT}`);
});

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  AppNotification,
  DemoUser,
  getDemoSession,
  mergeCartItems,
  setDemoSession,
  supabase,
  UserProfile,
} from "./supabase";
import { BOUQUET_IMGS, FLOWER_IMGS, ADDON_IMGS } from "./catalogImages";

type FlowerId =
  | "rose"
  | "spray_rose"
  | "austin"
  | "peony"
  | "coral_peony"
  | "tulip"
  | "hydrangea"
  | "calla"
  | "ranunculus"
  | "orchid"
  | "eustoma"
  | "gypsophila"
  | "freesia"
  | "chrysanthemum"
  | "gerbera"
  | "alstroemeria"
  | "lily"
  | "iris"
  | "lavender"
  | "chamomile"
  | "dianthus"
  | "protea"
  | "eucalyptus_branch"
  | "cotton_lagurus";

type CategoryId =
  | "all"
  | "wedding"
  | "author"
  | "mono"
  | "box"
  | "basket"
  | "dried";

type Bouquet = {
  id: string;
  name: string;
  description: string;
  composition: string;
  price: number;
  image: string;
  tag: string;
  category: Exclude<CategoryId, "all">;
  flowers: FlowerId[];
  color: "white" | "pink" | "red" | "peach" | "lavender" | "yellow" | "pastel";
  occasion: "wedding" | "birthday" | "love" | "anniversary" | "just_because";
  size: "S" | "M" | "L" | "XL";
  stems: number;
  rating: number;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  details?: string;
};

type DeliveryZoneId = "city" | "express" | "suburb";
type PaymentMethodId = "sbp" | "card" | "cash";

type Order = {
  id: string;
  createdAt: string;
  status: string;
  items: CartItem[];
  subtotal?: number;
  discount?: number;
  bonusUsed?: number;
  bonusEarned?: number;
  deliveryFee?: number;
  total: number;
  promoCode?: string;
  paymentMethod?: PaymentMethodId | string;
  deliveryZone?: DeliveryZoneId | string;
  fulfillmentMethod?: "delivery" | "pickup";
  pickupPoint?: string;
  senderName?: string;
  senderPhone?: string;
  senderEmail?: string;
  isAnonymous?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  address?: string;
  apartment?: string;
  isPrivateHouse?: boolean;
  entrance?: string;
  floor?: string;
  intercom?: string;
  date?: string;
  interval?: string;
  cardNote?: string;
  courierComment?: string;
};

type Consultation = {
  id: string;
  createdAt: string;
  status: string;
  name: string;
  phone: string;
  topic?: string;
};

type AccountData = {
  email: string;
  orders: Order[];
  consultations: Consultation[];
  profile?: UserProfile;
  notifications?: AppNotification[];
};


const TULA_CENTER: [number, number] = [54.1918, 37.6189];

const pickupPoints = [
  {
    id: "tula-lenina-74",
    shortName: "Пр-т Ленина, 74 (Флагманский)",
    name: "г. Тула, пр-т Ленина, 74 (Флагманский салон у ТулГУ)",
    district: "Советский р-н",
    address: "г. Тула, пр-т Ленина, 74",
    hours: "08:00–22:00",
    prepTime: "Готовность от 20 мин",
    parking: "Бесплатная парковка у входа",
    stockNote: "Полный ассортимент 36 букетов и 24 сортов цветов в холодильной камере",
    phone: "+7 (4872) 55-10-74",
    lat: 54.176573,
    lng: 37.598519,
  },
  {
    id: "tula-sovetskaya-47",
    shortName: "Ул. Советская, 47 (Центр)",
    name: "г. Тула, ул. Советская, 47 (Салон у Тульского Кремля)",
    district: "Центральный р-н",
    address: "г. Тула, ул. Советская, 47",
    hours: "09:00–21:00",
    prepTime: "Готовность от 25 мин",
    parking: "Городская парковка у ТРЦ «Гостиный двор»",
    stockNote: "В наличии свадебная коллекция, шляпные коробки и свежие пионы",
    phone: "+7 (4872) 55-20-47",
    lat: 54.1918,
    lng: 37.6189,
  },
  {
    id: "tula-proletarskaya-2",
    shortName: "Ул. Пролетарская, 2 (ТРЦ Макси)",
    name: "г. Тула, ул. Пролетарская, 2 (Цветочный бар в ТРЦ «Макси»)",
    district: "Пролетарский р-н",
    address: "г. Тула, ул. Пролетарская, 2",
    hours: "10:00–22:00",
    prepTime: "Готовность от 25 мин",
    parking: "Большая бесплатная парковка ТРЦ «Макси»",
    stockNote: "В наличии монобукеты, корзины, шары и подарочные наборы",
    phone: "+7 (4872) 55-30-02",
    lat: 54.193415,
    lng: 37.638205,
  },
];

const deliveryZones: {
  id: DeliveryZoneId;
  name: string;
  sub: string;
  price: number;
  fee: number;
  freeFrom: number | null;
  eta: string;
  radiusMeters: number;
}[] = [
  {
    id: "city",
    name: "По Туле (Центральный, Советский, Привокзальный, Зареченский, Пролетарский р-ны)",
    sub: "Бережная доставка курьером в аквабоксе · Бесплатно от 5 000 ₽",
    price: 350,
    fee: 350,
    freeFrom: 5000,
    eta: "45–60 минут",
    radiusMeters: 4800,
  },
  {
    id: "express",
    name: "Экспресс-доставка по Туле к точному времени (±10 мин)",
    sub: "Приоритетный выезд курьера сразу после сборки",
    price: 600,
    fee: 600,
    freeFrom: null,
    eta: "от 30 минут",
    radiusMeters: 4800,
  },
  {
    id: "suburb",
    name: "Пригород Тулы (Косая Гора, Скуратово, Иншинский, Горелки, Ленинский — до 20 км)",
    sub: "Доставка на автомобиле с климат-контролем · Бесплатно от 8 000 ₽",
    price: 650,
    fee: 650,
    freeFrom: 8000,
    eta: "60–90 минут",
    radiusMeters: 12000,
  },
];

const paymentMethods: {
  id: PaymentMethodId;
  name: string;
  sub: string;
  badge: string;
}[] = [
  {
    id: "sbp",
    name: "СБП (Система быстрых платежей)",
    sub: "Мгновенная оплата по QR-коду без комиссии в приложении банка",
    badge: "+5% кэшбэк",
  },
  {
    id: "card",
    name: "Банковской картой онлайн (МИР, Visa, Mastercard)",
    sub: "Безопасный платёжный шлюз с электронным чеком 54-ФЗ",
    badge: "Онлайн",
  },
  {
    id: "cash",
    name: "При получении (картой терминалом или наличными)",
    sub: "Оплата курьеру при вручении или флористу в салоне самовывоза",
    badge: "В салоне / курьеру",
  },
];

const deliveryTimeIntervals = [
  "Срочная — 30 минут",
  "09:00 – 11:00 (Утренний сюрприз)",
  "11:00 – 14:00 (Дневной интервал)",
  "14:00 – 17:00 (После обеда)",
  "17:00 – 20:00 (Вечерний интервал)",
  "20:00 – 22:00 (Поздний вечер)",
];

const pickupTimeIntervals = [
  "Через 20–30 минут (экспресс-сборка)",
  "10:00 – 13:00",
  "13:00 – 16:00",
  "16:00 – 19:00",
  "19:00 – 22:00",
];

const promoCatalog: Record<
  string,
  { code: string; type: "percent" | "fixed"; value: number; discountRate?: number; flatDiscount?: number; label: string }
> = {
  BLOOM2026: {
    code: "BLOOM2026",
    type: "percent",
    value: 15,
    discountRate: 0.15,
    label: "−15% на первый заказ (BLOOM2026)",
  },
  WEDDING10: {
    code: "WEDDING10",
    type: "percent",
    value: 10,
    discountRate: 0.1,
    label: "−10% на свадебную коллекцию (WEDDING10)",
  },
  TULA500: {
    code: "TULA500",
    type: "fixed",
    value: 500,
    flatDiscount: 500,
    label: "−500 ₽ подарок жителям Тулы (TULA500)",
  },
};

const IMAGES = { rose_peony: BOUQUET_IMGS[0], wedding: BOUQUET_IMGS[2], wedding_cascade: BOUQUET_IMGS[7] };

const bouquets: Bouquet[] = [
  // === СВАДЕБНЫЕ БУКЕТЫ (8 шт.) ===
  {
    id: "elegia-wedding",
    name: "Элегия невесты",
    description: "Белоснежные каллы, пионовидные розы Дэвид Остин и воздушная гипсофила. Бутоньерка жениха в подарок.",
    composition: "Каллы белоснежные (7 шт.), Розы Дэвид Остин (6 шт.), Гипсофила облачная (2 ветки), атласная лента",
    price: 6200,
    image: BOUQUET_IMGS[2],
    tag: "Свадебный хит",
    category: "wedding",
    flowers: ["calla", "austin", "gypsophila"],
    color: "white",
    occasion: "wedding",
    size: "M",
    stems: 15,
    rating: 5.0,
  },
  {
    id: "white-silk-bride",
    name: "Белый шёлк",
    description: "Классический круглый букет невесты из белых роз Эквадор, махровой эустомы и фрезии с тонким ароматом.",
    composition: "Розы Эквадор белые (11 шт.), Эустома махровая (5 веток), Фрезия ароматная (5 шт.), шёлковая лента",
    price: 5400,
    image: BOUQUET_IMGS[11],
    tag: "Свадебный",
    category: "wedding",
    flowers: ["rose", "eustoma", "freesia"],
    color: "white",
    occasion: "wedding",
    size: "M",
    stems: 21,
    rating: 4.9,
  },
  {
    id: "pearl-cascade",
    name: "Жемчужный каскад",
    description: "Торжественный ниспадающий букет с королевскими орхидеями Цимбидиум, каллами и серебристым эвкалиптом.",
    composition: "Орхидея Цимбидиум (7 цветков), Каллы (5 шт.), Эвкалипт серебристый (3 ветки)",
    price: 7800,
    image: BOUQUET_IMGS[10],
    tag: "Премиум невесте",
    category: "wedding",
    flowers: ["orchid", "calla", "eucalyptus_branch"],
    color: "white",
    occasion: "wedding",
    size: "L",
    stems: 15,
    rating: 5.0,
  },
  {
    id: "bride-tenderness",
    name: "Нежность утра",
    description: "Воздушный свадебный букет из пионов Сара Бернар, персиковых ранункулюсов и кустовых пионовидных роз.",
    composition: "Пионы Сара Бернар (5 шт.), Ранункулюсы (6 шт.), Кустовые розы (4 ветки)",
    price: 6900,
    image: BOUQUET_IMGS[12],
    tag: "Свадебный",
    category: "wedding",
    flowers: ["peony", "ranunculus", "spray_rose"],
    color: "pink",
    occasion: "wedding",
    size: "M",
    stems: 15,
    rating: 4.9,
  },
  {
    id: "powder-waltz",
    name: "Пудровый вальс",
    description: "Романтичная композиция из роз Джульетта (Дэвид Остин), белой фрезии и пудровой гвоздики Диантус.",
    composition: "Роза Дэвид Остин (7 шт.), Фрезия (5 шт.), Диантус сортовой (5 шт.)",
    price: 5800,
    image: BOUQUET_IMGS[13],
    tag: "Свадебный",
    category: "wedding",
    flowers: ["austin", "freesia", "dianthus"],
    color: "peach",
    occasion: "wedding",
    size: "M",
    stems: 17,
    rating: 4.8,
  },
  {
    id: "ivory-luxe",
    name: "Айвори Делюкс + Дублёр",
    description: "Комплект для невесты: основной букет из 15 пионовидных роз и ранункулюсов + лёгкий букет-дублёр и бутоньерка.",
    composition: "Розы Дэвид Остин (9 шт.), Ранункулюсы (6 шт.), Эустома (4 ветки), букет-дублёр",
    price: 8900,
    image: BOUQUET_IMGS[14],
    tag: "Комплект 3 в 1",
    category: "wedding",
    flowers: ["austin", "ranunculus", "eustoma"],
    color: "white",
    occasion: "wedding",
    size: "L",
    stems: 19,
    rating: 5.0,
  },
  {
    id: "lace-fairytale",
    name: "Кружевная сказка",
    description: "Лёгкий облачный букет из белоснежной гипсофилы и кустовых роз в обрамлении натурального кружева.",
    composition: "Гипсофила облачная (7 веток), Кустовые розы (6 веток), кружевная лента",
    price: 4200,
    image: BOUQUET_IMGS[15],
    tag: "Свадебный",
    category: "wedding",
    flowers: ["gypsophila", "spray_rose"],
    color: "white",
    occasion: "wedding",
    size: "S",
    stems: 13,
    rating: 4.8,
  },
  {
    id: "presidium-harmony",
    name: "Гармония (на президиум)",
    description: "Пышная настольная композиция для свадебного президиума молодожёнов из гортензий, роз, эустомы и эвкалипта.",
    composition: "Гортензия белая (3 шт.), Розы Эквадор (11 шт.), Эустома (7 веток), Эвкалипт",
    price: 9500,
    image: BOUQUET_IMGS[7],
    tag: "Декор зала",
    category: "wedding",
    flowers: ["hydrangea", "rose", "eustoma", "eucalyptus_branch"],
    color: "white",
    occasion: "wedding",
    size: "XL",
    stems: 25,
    rating: 5.0,
  },

  // === АВТОРСКИЕ БУКЕТЫ (8 шт.) ===
  {
    id: "rose-breeze",
    name: "Розовый бриз",
    description: "Французские кустовые розы, пышные пионы Сара Бернар и ароматный серебристый эвкалипт.",
    composition: "Кустовые розы (7 шт.), Пионы Сара Бернар (5 шт.), Эвкалипт (3 ветки)",
    price: 4500,
    image: BOUQUET_IMGS[0],
    tag: "Бестселлер",
    category: "author",
    flowers: ["spray_rose", "peony", "eucalyptus_branch"],
    color: "pink",
    occasion: "birthday",
    size: "M",
    stems: 15,
    rating: 5.0,
  },
  {
    id: "sunny-mix",
    name: "Солнечный микс",
    description: "Яркое сочетание солнечных мини-гербер, кустовой хризантемы, жёлтой фрезии и садовой ромашки.",
    composition: "Гербера мини (5 шт.), Хризантема кустовая (4 ветки), Фрезия (4 шт.), Матрикария (4 ветки)",
    price: 3400,
    image: BOUQUET_IMGS[1],
    tag: "Новинка",
    category: "author",
    flowers: ["gerbera", "chrysanthemum", "freesia", "chamomile"],
    color: "yellow",
    occasion: "just_because",
    size: "M",
    stems: 17,
    rating: 4.9,
  },
  {
    id: "peony-dawn",
    name: "Пионовый рассвет",
    description: "Коралловые пионы Coral Charm, персиковые ранункулюсы и розовая альстромерия в матовой корейской плёнке.",
    composition: "Пион Корал Шарм (5 шт.), Ранункулюсы (4 шт.), Альстромерия (6 шт.)",
    price: 5900,
    image: BOUQUET_IMGS[9],
    tag: "Выбор флориста",
    category: "author",
    flowers: ["coral_peony", "ranunculus", "alstroemeria"],
    color: "peach",
    occasion: "birthday",
    size: "L",
    stems: 15,
    rating: 5.0,
  },
  {
    id: "citrus-fresh",
    name: "Цитрусовый фреш",
    description: "Сочный витаминный букет из жёлтых тюльпанов, персиковых ранункулюсов, фрезии и кустовых роз.",
    composition: "Тюльпаны (9 шт.), Ранункулюсы (5 шт.), Фрезия (5 шт.), Кустовые розы (4 ветки)",
    price: 4800,
    image: BOUQUET_IMGS[19],
    tag: "Яркий акцент",
    category: "author",
    flowers: ["tulip", "ranunculus", "freesia", "spray_rose"],
    color: "yellow",
    occasion: "birthday",
    size: "M",
    stems: 23,
    rating: 4.9,
  },
  {
    id: "caramel-latte",
    name: "Карамельный латте",
    description: "Тёплая осенне-весенняя палитра: розы Джульетта, сортовой диантус, протея и веточки эвкалипта.",
    composition: "Протея экзотическая (1 шт.), Роза Дэвид Остин (5 шт.), Диантус (7 шт.), Эвкалипт (4 ветки)",
    price: 5600,
    image: BOUQUET_IMGS[20],
    tag: "Авторский",
    category: "author",
    flowers: ["protea", "austin", "dianthus", "eucalyptus_branch"],
    color: "peach",
    occasion: "anniversary",
    size: "L",
    stems: 17,
    rating: 4.9,
  },
  {
    id: "autumn-warmth",
    name: "Тёплый комплимент",
    description: "Уютный сборный букет из персиковых ранункулюсов, гербер, альстромерии и кустовых роз.",
    composition: "Ранункулюсы (5 шт.), Гербера мини (4 шт.), Альстромерия (4 шт.), Кустовые розы (4 ветки)",
    price: 4100,
    image: BOUQUET_IMGS[8],
    tag: "Популярный",
    category: "author",
    flowers: ["ranunculus", "gerbera", "alstroemeria", "spray_rose"],
    color: "peach",
    occasion: "just_because",
    size: "M",
    stems: 17,
    rating: 4.8,
  },
  {
    id: "raspberry-sunset",
    name: "Малиновый закат",
    description: "Экспрессивный авторский букет из малиновых пионов, голландских ирисов, орхидей и эустомы.",
    composition: "Пионы (5 шт.), Ирис голландский (7 шт.), Орхидея Цимбидиум (3 шт.), Эустома (4 ветки)",
    price: 6400,
    image: BOUQUET_IMGS[34],
    tag: "Эксклюзив",
    category: "author",
    flowers: ["peony", "iris", "orchid", "eustoma"],
    color: "pink",
    occasion: "anniversary",
    size: "L",
    stems: 19,
    rating: 5.0,
  },
  {
    id: "emerald-pearl",
    name: "Изумруд и жемчуг",
    description: "Утончённая композиция из королевских белых лилий, зелёной хризантемы, калл и эвкалипта.",
    composition: "Лилия Королевская (3 ветки), Каллы (5 шт.), Хризантема (5 шт.), Эвкалипт (4 ветки)",
    price: 5700,
    image: BOUQUET_IMGS[35],
    tag: "Премиум",
    category: "author",
    flowers: ["lily", "calla", "chrysanthemum", "eucalyptus_branch"],
    color: "white",
    occasion: "anniversary",
    size: "L",
    stems: 17,
    rating: 4.9,
  },

  // === МОНОБУКЕТЫ (6 шт.) ===
  {
    id: "velvet-passion",
    name: "Бархатная страсть (25 роз)",
    description: "Классический монобукет из 25 отборных красных роз Эквадор (70 см) с бархатными лепестками.",
    composition: "Розы Эквадор Freedom 70 см (25 шт.), атласная лента",
    price: 5900,
    image: BOUQUET_IMGS[3],
    tag: "Хит любви",
    category: "mono",
    flowers: ["rose"],
    color: "red",
    occasion: "love",
    size: "L",
    stems: 25,
    rating: 5.0,
  },
  {
    id: "grand-amour-101",
    name: "Гранд Амур (51 роза Эквадор)",
    description: "Роскошный объёмный монобукет из 51 премиальной розы для самого главного признания.",
    composition: "Розы Эквадор 70 см (51 шт.), дизайнерская матовая упаковка",
    price: 11500,
    image: BOUQUET_IMGS[16],
    tag: "WOW-эффект",
    category: "mono",
    flowers: ["rose"],
    color: "red",
    occasion: "love",
    size: "XL",
    stems: 51,
    rating: 5.0,
  },
  {
    id: "peony-cloud-mono",
    name: "Облако пионов Сара Бернар",
    description: "Пышный монобукет из 15 крупных ароматных французских пионов нежно-розового оттенка.",
    composition: "Пионы Сара Бернар (15 шт.), матовая калька и тишью",
    price: 6500,
    image: BOUQUET_IMGS[5],
    tag: "Сезонный хит",
    category: "mono",
    flowers: ["peony"],
    color: "pink",
    occasion: "birthday",
    size: "L",
    stems: 15,
    rating: 5.0,
  },
  {
    id: "spring-tulips-mono",
    name: "Весеннее дыхание (35 тюльпанов)",
    description: "Охапка хрустящих голландских тюльпанов пастельных и розовых тонов в крафтовой бумаге.",
    composition: "Тюльпаны Голландия (35 шт.), дизайнерский крафт",
    price: 5600,
    image: BOUQUET_IMGS[6],
    tag: "Свежесть",
    category: "mono",
    flowers: ["tulip"],
    color: "pastel",
    occasion: "just_because",
    size: "L",
    stems: 35,
    rating: 4.9,
  },
  {
    id: "blue-lagoon-hydrangea",
    name: "Голубая лагуна (5 гортензий)",
    description: "Воздушное облако из 5 крупных шапок небесно-голубой голландской гортензии.",
    composition: "Гортензия пышная голубая (5 веток), корейская матовая плёнка",
    price: 4400,
    image: BOUQUET_IMGS[18],
    tag: "Тренд 2026",
    category: "mono",
    flowers: ["hydrangea"],
    color: "lavender",
    occasion: "birthday",
    size: "L",
    stems: 5,
    rating: 4.9,
  },
  {
    id: "amsterdam-iris-tulip",
    name: "Амстердам (Ирисы и Тюльпаны)",
    description: "Контрастный дуэт синих голландских ирисов и бело-розовых тюльпанов в стильном оформлении.",
    composition: "Ирис голландский (15 шт.), Тюльпаны (14 шт.), лента в тон",
    price: 4600,
    image: BOUQUET_IMGS[17],
    tag: "Стильный дуэт",
    category: "mono",
    flowers: ["iris", "tulip"],
    color: "lavender",
    occasion: "just_because",
    size: "M",
    stems: 29,
    rating: 4.8,
  },

  // === В ШЛЯПНОЙ КОРОБКЕ (5 шт.) ===
  {
    id: "paris-chic-box",
    name: "Парижский шик в коробке",
    description: "Изящная шляпная коробка с пионовидными розами, эустомой и эвкалиптом на флористическом оазисе.",
    composition: "Роза Дэвид Остин (7 шт.), Эустома (6 веток), Эвкалипт, шляпная коробка M",
    price: 5200,
    image: BOUQUET_IMGS[21],
    tag: "Не нужна ваза",
    category: "box",
    flowers: ["austin", "eustoma", "eucalyptus_branch"],
    color: "pink",
    occasion: "birthday",
    size: "M",
    stems: 15,
    rating: 5.0,
  },
  {
    id: "velvet-peony-box",
    name: "Бархатный бокс с пионами",
    description: "Премиальная высокая бархатная коробка с розовыми пионами, кустовыми розами и гипсофилой.",
    composition: "Пионы Сара Бернар (9 шт.), Кустовые розы (6 веток), Гипсофила (3 ветки), бархатный бокс L",
    price: 7400,
    image: BOUQUET_IMGS[22],
    tag: "Делюкс",
    category: "box",
    flowers: ["peony", "spray_rose", "gypsophila"],
    color: "pink",
    occasion: "anniversary",
    size: "L",
    stems: 18,
    rating: 5.0,
  },
  {
    id: "ruby-heart-box",
    name: "Рубиновое сердце в боксе",
    description: "Композиция в шляпной коробке из красных роз Эквадор, орхидей и сортового диантуса.",
    composition: "Розы Эквадор (15 шт.), Орхидея Цимбидиум (3 шт.), Диантус (5 шт.), коробка",
    price: 6100,
    image: BOUQUET_IMGS[23],
    tag: "Для любимой",
    category: "box",
    flowers: ["rose", "orchid", "dianthus"],
    color: "red",
    occasion: "love",
    size: "M",
    stems: 23,
    rating: 4.9,
  },
  {
    id: "lilac-fog-box",
    name: "Сиреневый туман",
    description: "Нежная шляпная коробка с голубой гортензией, сиреневой эустомой, фрезией и веточками лаванды.",
    composition: "Гортензия (2 шт.), Эустома (7 веток), Фрезия (5 шт.), Лаванда, шляпная коробка",
    price: 4900,
    image: BOUQUET_IMGS[24],
    tag: "Ароматный",
    category: "box",
    flowers: ["hydrangea", "eustoma", "freesia", "lavender"],
    color: "lavender",
    occasion: "birthday",
    size: "M",
    stems: 17,
    rating: 4.9,
  },
  {
    id: "sunny-morning-box",
    name: "Солнечное утро в боксе",
    description: "Компактная шляпная коробка с ромашками матрикария, жёлтыми герберами и кустовой хризантемой.",
    composition: "Ромашка садовая (7 веток), Гербера мини (5 шт.), Хризантема (5 веток), коробка S",
    price: 3600,
    image: BOUQUET_IMGS[25],
    tag: "Комплимент",
    category: "box",
    flowers: ["chamomile", "gerbera", "chrysanthemum"],
    color: "yellow",
    occasion: "just_because",
    size: "S",
    stems: 17,
    rating: 4.8,
  },

  // === В КОРЗИНЕ (5 шт.) ===
  {
    id: "royal-rose-basket",
    name: "Королевская корзина роз",
    description: "Плетёная корзина ручной работы с 35 розами разных сортов, ранункулюсами и эвкалиптом.",
    composition: "Розы Эквадор (21 шт.), Кустовые розы (9 веток), Ранункулюсы (5 шт.), корзина с оазисом",
    price: 9800,
    image: BOUQUET_IMGS[26],
    tag: "Юбилейный VIP",
    category: "basket",
    flowers: ["rose", "spray_rose", "ranunculus"],
    color: "peach",
    occasion: "anniversary",
    size: "XL",
    stems: 35,
    rating: 5.0,
  },
  {
    id: "french-garden-basket",
    name: "Корзина «Французский сад»",
    description: "Пышная садовая корзина с пионами, гортензией, королевской лилией и махровой эустомой.",
    composition: "Пионы (7 шт.), Гортензия (2 шт.), Лилия (3 ветки), Эустома (7 веток), корзина",
    price: 8400,
    image: BOUQUET_IMGS[27],
    tag: "Бестселлер",
    category: "basket",
    flowers: ["peony", "hydrangea", "lily", "eustoma"],
    color: "pink",
    occasion: "anniversary",
    size: "L",
    stems: 19,
    rating: 5.0,
  },
  {
    id: "spring-tulip-basket",
    name: "Весенняя корзина тюльпанов (45 шт.)",
    description: "Большая плетёная корзина с разноцветными голландскими тюльпанами, ирисами и фрезией.",
    composition: "Тюльпаны (31 шт.), Ирисы (9 шт.), Фрезия (5 шт.), плетёная корзина",
    price: 7200,
    image: BOUQUET_IMGS[28],
    tag: "Весенний хит",
    category: "basket",
    flowers: ["tulip", "iris", "freesia"],
    color: "pastel",
    occasion: "birthday",
    size: "L",
    stems: 45,
    rating: 4.9,
  },
  {
    id: "eden-white-basket",
    name: "Белоснежная корзина «Эдем»",
    description: "Торжественная корзина из белых лилий, калл, роз Дэвид Остин и воздушной гипсофилы.",
    composition: "Лилия Королевская (3 шт.), Каллы (7 шт.), Роза Остин (7 шт.), Гипсофила (4 ветки)",
    price: 8900,
    image: BOUQUET_IMGS[29],
    tag: "Торжество",
    category: "basket",
    flowers: ["lily", "calla", "austin", "gypsophila"],
    color: "white",
    occasion: "wedding",
    size: "XL",
    stems: 21,
    rating: 5.0,
  },
  {
    id: "provence-meadow-basket",
    name: "Плетёная корзина «Прованс»",
    description: "Душевная корзина с садовыми ромашками, хризантемами, лавандой и альстромерией.",
    composition: "Ромашка Матрикария (11 веток), Хризантема (6 веток), Альстромерия (6 шт.), Лаванда",
    price: 5300,
    image: BOUQUET_IMGS[30],
    tag: "Уютный стиль",
    category: "basket",
    flowers: ["chamomile", "chrysanthemum", "alstroemeria", "lavender"],
    color: "pastel",
    occasion: "birthday",
    size: "M",
    stems: 25,
    rating: 4.9,
  },

  // === СУХОЦВЕТЫ И ДОЛГОВЕЧНЫЕ КОМПОЗИЦИИ (4 шт.) ===
  {
    id: "lavender-provence",
    name: "Лавандовый Прованс",
    description: "Ароматный интерьерный букет из крымской лаванды, стабилизированной гипсофилы и лагуруса. Стоит до 3 лет.",
    composition: "Лаванда крымская (3 пучка), Гипсофила стабилизированная (5 веток), Лагурус",
    price: 3200,
    image: BOUQUET_IMGS[4],
    tag: "Стоит до 3 лет",
    category: "dried",
    flowers: ["lavender", "gypsophila", "cotton_lagurus"],
    color: "lavender",
    occasion: "just_because",
    size: "M",
    stems: 25,
    rating: 4.9,
  },
  {
    id: "lavender-deluxe-dried",
    name: "Лаванда и хлопок Премиум",
    description: "Большой интерьерный сноп из лаванды, коробочек натурального хлопка и пушистого лагуруса в крафте.",
    composition: "Лаванда (5 пучков), Хлопок (7 коробочек), Лагурус (15 колосьев)",
    price: 4300,
    image: BOUQUET_IMGS[31],
    tag: "Эко-декор",
    category: "dried",
    flowers: ["lavender", "cotton_lagurus"],
    color: "lavender",
    occasion: "birthday",
    size: "L",
    stems: 27,
    rating: 5.0,
  },
  {
    id: "boho-cotton-protea",
    name: "Бохо с протеей и хлопком",
    description: "Стильная композиция для современного интерьера с экзотической протеей, хлопком, эвкалиптом и сухоцветами.",
    composition: "Протея (1 шт.), Хлопок и лагурус (9 шт.), Эвкалипт стабилизированный (5 веток)",
    price: 4900,
    image: BOUQUET_IMGS[32],
    tag: "Интерьерный",
    category: "dried",
    flowers: ["protea", "cotton_lagurus", "eucalyptus_branch"],
    color: "pastel",
    occasion: "anniversary",
    size: "M",
    stems: 15,
    rating: 4.9,
  },
  {
    id: "eternal-tenderness-dried",
    name: "Вечная нежность (стабилизированный)",
    description: "Композиция в шляпной коробке из стабилизированных пионовидных роз, гортензии, хлопка и гипсофилы.",
    composition: "Стабилизированные розы (5 шт.), Гортензия (2 ветки), Гипсофила, Хлопок",
    price: 5500,
    image: BOUQUET_IMGS[33],
    tag: "Не увядает 2 года",
    category: "dried",
    flowers: ["austin", "hydrangea", "gypsophila", "cotton_lagurus"],
    color: "pink",
    occasion: "love",
    size: "M",
    stems: 15,
    rating: 5.0,
  },
];

const flowers: {
  id: FlowerId;
  name: string;
  price: number;
  image: string;
  unit: string;
  group: "roses" | "spring" | "classic" | "exotic";
  desc: string;
}[] = [
  { id: "rose", name: "Роза Эквадор Explorer", price: 250, image: FLOWER_IMGS[0], unit: "шт.", group: "roses", desc: "Крупный бокал 70 см, бархатный лепесток" },
  { id: "spray_rose", name: "Кустовая пионовидная роза", price: 290, image: FLOWER_IMGS[1], unit: "ветка", group: "roses", desc: "До 5–7 нежных бутонов на одной ветке" },
  { id: "peony", name: "Пион Сара Бернар", price: 380, image: FLOWER_IMGS[2], unit: "шт.", group: "roses", desc: "Ароматный махровый пион нежно-розового тона" },
  { id: "tulip", name: "Тюльпан Голландия", price: 180, image: FLOWER_IMGS[3], unit: "шт.", group: "spring", desc: "Свежий хрустящий тюльпан премиум-разбора" },
  { id: "hydrangea", name: "Гортензия пышная", price: 650, image: FLOWER_IMGS[4], unit: "ветка", group: "classic", desc: "Объёмная шапка 20+ см небесного и белого оттенка" },
  { id: "calla", name: "Калла белоснежная", price: 390, image: FLOWER_IMGS[5], unit: "шт.", group: "classic", desc: "Идеальная строгая пластика для свадебных букетов" },
  { id: "ranunculus", name: "Ранункулюс персиковый", price: 360, image: FLOWER_IMGS[6], unit: "шт.", group: "roses", desc: "Азиатский лютик с десятками тонких лепестков" },
  { id: "orchid", name: "Орхидея Цимбидиум", price: 520, image: FLOWER_IMGS[7], unit: "цветок", group: "exotic", desc: "Экзотический стойкий цветок премиум-класса" },
  { id: "eustoma", name: "Эустома махровая", price: 240, image: FLOWER_IMGS[8], unit: "ветка", group: "classic", desc: "Ирландская роза с воздушными бутонами" },
  { id: "gypsophila", name: "Гипсофила облачная", price: 220, image: FLOWER_IMGS[9], unit: "ветка", group: "exotic", desc: "Создаёт эффект невесомого цветочного облака" },
  { id: "freesia", name: "Фрезия ароматная", price: 210, image: FLOWER_IMGS[10], unit: "ветка", group: "spring", desc: "Изящный весенний цветок с тонким парфюмерным ароматом" },
  { id: "chrysanthemum", name: "Хризантема кустовая", price: 200, image: FLOWER_IMGS[11], unit: "ветка", group: "classic", desc: "Стойкость в вазе до 3 недель" },
  { id: "gerbera", name: "Гербера мини солнечная", price: 190, image: FLOWER_IMGS[12], unit: "шт.", group: "spring", desc: "Яркий солнечный акцент для тёплых композиций" },
  { id: "alstroemeria", name: "Альстромерия перуанская", price: 210, image: FLOWER_IMGS[13], unit: "ветка", group: "classic", desc: "Перуанская лилия с пёстрыми нежными лепестками" },
  { id: "lily", name: "Лилия Королевская белая", price: 480, image: FLOWER_IMGS[14], unit: "ветка", group: "classic", desc: "Крупные белоснежные соцветия на высокой ветке" },
  { id: "iris", name: "Ирис голландский синий", price: 170, image: FLOWER_IMGS[15], unit: "шт.", group: "spring", desc: "Насыщенный сапфировый оттенок весеннего сада" },
  { id: "lavender", name: "Лаванда крымская ароматная", price: 260, image: FLOWER_IMGS[16], unit: "пучок", group: "exotic", desc: "Натуральный релакс-аромат Прованса" },
  { id: "chamomile", name: "Ромашка садовая (Матрикария)", price: 180, image: FLOWER_IMGS[17], unit: "ветка", group: "spring", desc: "Трогательная полевая свежесть и уют" },
  { id: "dianthus", name: "Диантус сортовой (Гвоздика)", price: 190, image: FLOWER_IMGS[18], unit: "шт.", group: "spring", desc: "Пудровые кружевные лепестки высокой стойкости" },
  { id: "protea", name: "Протея экзотическая", price: 890, image: FLOWER_IMGS[19], unit: "шт.", group: "exotic", desc: "Центральный экзотический цветок для авторских работ" },
  { id: "eucalyptus_branch", name: "Эвкалипт серебристый Цинерея", price: 220, image: FLOWER_IMGS[20], unit: "ветка", group: "exotic", desc: "Благородная матовая листва с эфирным ароматом" },
  { id: "austin", name: "Роза Дэвид Остин (Juliet)", price: 420, image: FLOWER_IMGS[21], unit: "шт.", group: "roses", desc: "Английская пионовидная роза оттенка шампань и персик" },
  { id: "coral_peony", name: "Пион Корал Шарм (Coral Charm)", price: 440, image: FLOWER_IMGS[22], unit: "шт.", group: "roses", desc: "Крупный полумахровый пион кораллового оттенка" },
  { id: "cotton_lagurus", name: "Хлопок и пушистый Лагурус", price: 240, image: FLOWER_IMGS[23], unit: "связка", group: "exotic", desc: "Мягкие коробочки хлопка и бархатные колоски" },
];

const greeneryOptions = [
  { id: "none", name: "Без зелени", price: 0 },
  { id: "eucalyptus", name: "Эвкалипт Цинерея", price: 300 },
  { id: "pistachio", name: "Фисташка и Рускус", price: 250 },
  { id: "lush_mix", name: "Пышный микс зелени и гипсофилы", price: 450 },
];

const packagingOptions = [
  { id: "ribbon", name: "Атласная лента", sub: "Эко-минимализм в тон букета", price: 100 },
  { id: "craft", name: "Крафтовая бумага", sub: "Дизайнерский крафт с тишью", price: 200 },
  { id: "korean_film", name: "Матовая корейская плёнка", sub: "Нежная пудра / слоновая кость", price: 350 },
  { id: "tracing", name: "Матовая калька и лента", sub: "Полупрозрачная многослойная", price: 400 },
  { id: "foamiran", name: "Мягкий фоамиран премиум", sub: "Бархатистая пластичная упаковка", price: 450 },
  { id: "felt", name: "Натуральный фетр и кружево", sub: "Уютный рустик / свадебный стиль", price: 450 },
  { id: "organza", name: "Воздушная органза и сетка", sub: "Объёмное праздничное оформление", price: 500 },
  { id: "gift_box", name: "Подарочная коробка", sub: "Круглая шляпная коробка M с губкой", price: 500 },
  { id: "basket", name: "Плетёная корзина с оазисом", sub: "Натуральная лоза ручной работы", price: 1100 },
  { id: "velvet_box", name: "Бархатная коробка Deluxe L", sub: "Премиальная высокая коробка", price: 1200 },
];

const addons = [
  { id: "card-love", name: "Открытка ручной работы", category: "cards", sub: "Плотный хлопковый картон + сургуч", price: 150, icon: "card", image: ADDON_IMGS[0] },
  { id: "satin-ribbon", name: "Атласная лента с каллиграфией", category: "cards", sub: "Ваша надпись золотом на ленте", price: 200, icon: "bow", image: ADDON_IMGS[1] },
  { id: "bear-25", name: "Плюшевый мишка Тедди 25 см", category: "toys", sub: "Мягкий кремовый мишка с бантом", price: 850, icon: "gift", image: ADDON_IMGS[2] },
  { id: "belgian-choc", name: "Бельгийский шоколад пралине", category: "sweets", sub: "Набор трюфелей ручной работы", price: 890, icon: "gift", image: ADDON_IMGS[3] },
  { id: "glass-vase", name: "Ваза из рифлёного стекла", category: "vases", sub: "Прозрачное стекло, высота 25 см", price: 950, icon: "package", image: ADDON_IMGS[4] },
  { id: "peony-candle", name: "Ароматическая свеча «Пион»", category: "vases", sub: "Натуральный соевый воск, 35 ч горения", price: 690, icon: "sparkle", image: ADDON_IMGS[5] },
  { id: "helium-balloons", name: "Связка гелиевых шаров (5 шт.)", category: "toys", sub: "Пастельный латекс с обработкой Hi-Float", price: 750, icon: "sparkle", image: ADDON_IMGS[6] },
  { id: "lush-bow", name: "Пышный шёлковый бант", category: "cards", sub: "Праздничное оформление ножки букета", price: 250, icon: "bow", image: ADDON_IMGS[7] },
  { id: "topper-wood", name: "Деревянный топпер «С любовью»", category: "cards", sub: "Эко-берёза с гравировкой в букет", price: 250, icon: "heart", image: ADDON_IMGS[8] },
  { id: "raffaello", name: "Конфеты Raffaello 150 г", category: "sweets", sub: "Подарочная коробка с бантом", price: 590, icon: "gift", image: ADDON_IMGS[9] },
  { id: "chrysal-pack", name: "Набор ухода (секатор + Chrysal)", category: "vases", sub: "Флористический секатор и 3 саше подкормки", price: 490, icon: "heart", image: ADDON_IMGS[10] },
  { id: "gift-bag", name: "Подарочный пакет-аквабокс", category: "vases", sub: "Удобная транспортировка с водой", price: 350, icon: "package", image: ADDON_IMGS[11] },
];

const faqs = [
  {
    question: "Как быстро осуществляется доставка по Туле и где находятся точки самовывоза?",
    answer:
      "Доставка курьером в аквабоксе осуществляется от 30 минут (бесплатно при заказе от 5 000 ₽). Самовывоз (0 ₽, готовность от 20 минут) доступен в 3 салонах Тулы: пр-т Ленина, 74 (Флагманский), ул. Советская, 47 и ул. Пролетарская, 2.",
  },
  {
    question: "Как работает программа лояльности Bloom Club и уведомления о заказе?",
    answer:
      "При входе в личный кабинет вы получаете 500 приветственных бонусов (1 бонус = 1 ₽) и 5% кэшбэк с каждого заказа. Все этапы сборки и доставки букета сопровождаются мгновенными уведомлениями в Центре уведомлений (🔔).",
  },
  {
    question: "Можно ли заказать свадебный букет невесты и бутоньерку?",
    answer:
      "Да! В отдельной категории «Свадебные цветы» представлены букеты невесты, дублёры и композиции на президиум. К каждому свадебному букету мы дарим бутоньерку жениха в едином стиле.",
  },
  {
    question: "Можно ли отправить цветы анонимно или без знания квартиры получателя?",
    answer:
      "Да! При оформлении доставки отметьте галочку «Анонимная доставка» или «Частный дом / встречу у входа» — курьер деликатно свяжется с получателем и вручит букет.",
  },
];

function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
}) {
  const paths: Record<string, ReactNode> = {
    bag: (
      <>
        <path d="M6 8h12l-1 12H7L6 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    ),
    chevron: <path d="m7 10 5 5 5-5" />,
    truck: (
      <>
        <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    sparkle: (
      <>
        <path d="M12 3c.7 4.2 2.8 6.3 7 7-4.2.7-6.3 2.8-7 7-.7-4.2-2.8-6.3-7-7 4.2-.7 6.3-2.8 7-7Z" />
        <path d="M19 3v4M21 5h-4" />
      </>
    ),
    heart: (
      <path d="M20.8 5.7a5.4 5.4 0 0 0-7.6 0L12 6.9l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-8.7a5.4 5.4 0 0 0 0-7.6Z" />
    ),
    phone: (
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    ),
    card: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    gift: (
      <>
        <rect x="3" y="9" width="18" height="12" rx="1" />
        <path d="M12 9v12M3 13h18M12 9H8.5a2.5 2.5 0 1 1 0-5C11 4 12 9 12 9Zm0 0h3.5a2.5 2.5 0 1 0 0-5C13 4 12 9 12 9Z" />
      </>
    ),
    bow: (
      <>
        <path d="M12 11C9 6 4 5 3 8s4 5 9 3Zm0 0c3-5 8-6 9-3s-4 5-9 3Z" />
        <path d="m10 12-3 9 5-3 5 3-3-9" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
      </>
    ),
    package: (
      <>
        <path d="m3 7 9 5 9-5-9-4-9 4Z" />
        <path d="M3 7v10l9 4 9-4V7M12 12v9" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </>
    ),
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
    store: (
      <>
        <path d="M3 9l2-5h14l2 5" />
        <path d="M4 9v11h16V9" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
    pin: (
      <>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    check: <path d="m5 12 5 5L20 7" />,
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    >
      {paths[name] || paths.sparkle}
    </svg>
  );
}


function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return localStorage.getItem("bloom-theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  const [user, setUser] = useState<DemoUser | null>(() => getDemoSession());
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("bloom-guest-cart") || "[]"); return Array.isArray(parsed) ? parsed.filter((x: any) => x && typeof x.price === "number" && typeof x.quantity === "number") : [];
    } catch {
      return [];
    }
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("bloom-favorites") || "[]"); return Array.isArray(parsed) ? parsed.filter((x: any) => typeof x === "string") : [];
    } catch {
      return [];
    }
  });

  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("all");
  const [filterFlower, setFilterFlower] = useState<string>("all");
  const [filterColor, setFilterColor] = useState<string>("all");
  const [filterOccasion, setFilterOccasion] = useState<string>("all");
  const [filterSize, setFilterSize] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<number>(12000);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("popular");
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [catalogMode, setCatalogMode] = useState<"bouquets" | "flowers">("bouquets");
  const [catalogPage, setCatalogPage] = useState<number>(1);
  const [showAllBouquets, setShowAllBouquets] = useState<boolean>(false);
  const [constructorGroup, setConstructorGroup] = useState<"all" | "roses" | "spring" | "classic" | "exotic">("all");
  const [showAllConstructorFlowers, setShowAllConstructorFlowers] = useState<boolean>(true);
  const [selectedBouquetModal, setSelectedBouquetModal] = useState<Bouquet | null>(null);
  const [modalPackagingId, setModalPackagingId] = useState<string>("craft");

  const [quantities, setQuantities] = useState<Record<FlowerId, number>>({
    rose: 9,
    spray_rose: 0,
    austin: 0,
    peony: 5,
    coral_peony: 0,
    tulip: 0,
    hydrangea: 0,
    calla: 0,
    ranunculus: 0,
    orchid: 0,
    eustoma: 0,
    gypsophila: 1,
    freesia: 0,
    chrysanthemum: 0,
    gerbera: 0,
    alstroemeria: 0,
    lily: 0,
    iris: 0,
    lavender: 0,
    chamomile: 0,
    dianthus: 0,
    protea: 0,
    eucalyptus_branch: 0,
    cotton_lagurus: 0,
  });
  const [selectedGreenery, setSelectedGreenery] = useState<string>("eucalyptus");
  const [selectedPackagingId, setSelectedPackagingId] = useState<string>("craft");
  const [addonCategory, setAddonCategory] = useState<string>("all");

  const [fulfillmentMethod, setFulfillmentMethodState] = useState<"delivery" | "pickup">("delivery");
  const [pickupPointId, setPickupPointId] = useState<string>("tula-lenina-74");
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZoneId>("city");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("sbp");
  const [senderName, setSenderName] = useState<string>("");
  const [senderPhone, setSenderPhone] = useState<string>("");
  const [senderEmail, setSenderEmail] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [sameAsSender, setSameAsSender] = useState<boolean>(false);
  const [recipientName, setRecipientName] = useState<string>("");
  const [recipientPhone, setRecipientPhone] = useState<string>("");
  const [streetAddress, setStreetAddress] = useState<string>("");
  const [apartment, setApartment] = useState<string>("");
  const [isPrivateHouse, setIsPrivateHouse] = useState<boolean>(false);
  const [entrance, setEntrance] = useState<string>("");
  const [floor, setFloor] = useState<string>("");
  const [intercom, setIntercom] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [deliveryInterval, setDeliveryInterval] = useState<string>("Срочная — 30 минут");
  const [cardNote, setCardNote] = useState<string>("");
  const [courierComment, setCourierComment] = useState<string>("");
  const [useBonusPoints, setUseBonusPoints] = useState<boolean>(false);

  const [cartReady, setCartReady] = useState(false);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [accountTab, setAccountTab] = useState<"orders" | "notifications" | "favorites" | "profile">("orders");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileApartment, setProfileApartment] = useState("");

  const [guestNotifications, setGuestNotifications] = useState<AppNotification[]>(() => [
    {
      id: "NT-WELCOME",
      createdAt: new Date().toISOString(),
      title: "Скидка 15% на первый заказ",
      message: "Используйте промокод BLOOM2026 в корзине. При входе в кабинет начисляем 500 бонусов!",
      category: "bonus",
      read: false,
    },
  ]);

  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authSent, setAuthSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAllSalonsOnMap, setShowAllSalonsOnMap] = useState<boolean>(true);

  const setFulfillmentMethod = (mode: "delivery" | "pickup") => {
    setFulfillmentMethodState(mode);
    if (mode === "pickup") {
      if (!pickupTimeIntervals.includes(deliveryInterval)) {
        setDeliveryInterval(pickupTimeIntervals[0]);
      }
    } else {
      if (!deliveryTimeIntervals.includes(deliveryInterval)) {
        setDeliveryInterval(deliveryTimeIntervals[0]);
      }
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("bloom-theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("bloom-favorites", JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  const chosenPickup = useMemo(
    () => pickupPoints.find((p) => p.id === pickupPointId) || pickupPoints[0],
    [pickupPointId],
  );

  const chosenZone = useMemo(
    () => deliveryZones.find((z) => z.id === deliveryZone) || deliveryZones[0],
    [deliveryZone],
  );

  const yandexMapWidgetUrl = useMemo(() => {
    const pts = "37.598519,54.176573,pm2rdm1~37.6189,54.1918,pm2rdm2~37.638205,54.193415,pm2rdm3";
    if (showAllSalonsOnMap) {
      return `https://yandex.ru/map-widget/v1/?ll=${TULA_CENTER[1]}%2C${TULA_CENTER[0]}&z=12&pt=${pts}`;
    }
    return `https://yandex.ru/map-widget/v1/?ll=${chosenPickup.lng}%2C${chosenPickup.lat}&z=15&pt=${pts}`;
  }, [showAllSalonsOnMap, chosenPickup]);

  const selectedPackaging = useMemo(
    () =>
      packagingOptions.find((p) => p.id === selectedPackagingId) ||
      packagingOptions[1],
    [selectedPackagingId],
  );

  const selectedGreeneryObj = useMemo(
    () =>
      greeneryOptions.find((g) => g.id === selectedGreenery) ||
      greeneryOptions[0],
    [selectedGreenery],
  );

  const flowerTotal = useMemo(
    () =>
      flowers.reduce(
        (sum, flower) => sum + (quantities[flower.id] || 0) * flower.price,
        0,
      ) + selectedGreeneryObj.price,
    [quantities, selectedGreeneryObj],
  );

  const filteredBouquets = useMemo(() => {
    return bouquets
      .filter((b) => {
        if (selectedCategory !== "all" && b.category !== selectedCategory) return false;
        if (filterFlower !== "all" && !b.flowers.includes(filterFlower as FlowerId)) return false;
        if (filterColor !== "all" && b.color !== filterColor) return false;
        if (filterOccasion !== "all" && b.occasion !== filterOccasion) return false;
        if (filterSize !== "all" && b.size !== filterSize) return false;
        if (b.price > maxPrice) return false;
        if (onlyFavorites && !favorites.includes(b.id)) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const match =
            b.name.toLowerCase().includes(q) ||
            b.description.toLowerCase().includes(q) ||
            b.composition.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price_asc") return a.price - b.price;
        if (sortBy === "price_desc") return b.price - a.price;
        if (sortBy === "name_asc") return a.name.localeCompare(b.name, "ru");
        return b.rating - a.rating;
      });
  }, [
    selectedCategory,
    filterFlower,
    filterColor,
    filterOccasion,
    filterSize,
    maxPrice,
    onlyFavorites,
    favorites,
    searchQuery,
    sortBy,
  ]);

  const favoriteBouquets = useMemo(
    () => bouquets.filter((b) => favorites.includes(b.id)),
    [favorites],
  );

  const filteredAddons = useMemo(
    () =>
      addonCategory === "all"
        ? addons
        : addons.filter((a) => a.category === addonCategory),
    [addonCategory],
  );

  const notifications = Array.isArray(account?.notifications) ? account.notifications : guestNotifications;
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const activePromo = appliedPromoCode ? promoCatalog[appliedPromoCode] : undefined;
  const discount = useMemo(() => {
    if (!activePromo || subtotal === 0) return 0;
    if (activePromo.type === "percent") {
      return Math.round((subtotal * activePromo.value) / 100);
    }
    return subtotal >= 3000 ? Math.min(subtotal, activePromo.value) : 0;
  }, [activePromo, subtotal]);

  const availableBonus = account?.profile?.bonusPoints ?? (user ? 500 : 0);
  const maxBonusUsable = Math.min(
    availableBonus,
    Math.max(0, Math.floor((subtotal - discount) * 0.3)),
  );
  const bonusUsed = useBonusPoints && user ? maxBonusUsable : 0;
  const afterDiscounts = Math.max(0, subtotal - discount - bonusUsed);

  const deliveryFee = useMemo(() => {
    if (fulfillmentMethod === "pickup" || subtotal === 0) return 0;
    if (chosenZone.freeFrom !== null && afterDiscounts >= chosenZone.freeFrom) {
      return 0;
    }
    return chosenZone.fee;
  }, [fulfillmentMethod, subtotal, chosenZone, afterDiscounts]);

  const cartTotal = Math.max(0, afterDiscounts + deliveryFee);
  const bonusToEarn = Math.round(cartTotal * 0.05);
  const freeDeliveryThreshold = chosenZone.freeFrom ?? 5000;
  const amountToFreeDelivery = Math.max(0, freeDeliveryThreshold - afterDiscounts);
  const freeDeliveryProgress = Math.min(
    100,
    Math.round((afterDiscounts / freeDeliveryThreshold) * 100),
  );

  const notify = (message: string, addToCenterTitle?: string, category: AppNotification["category"] = "info") => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
    if (addToCenterTitle && !user) {
      setGuestNotifications((prev) => [
        {
          id: `NT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
          createdAt: new Date().toISOString(),
          title: addToCenterTitle,
          message,
          category,
          read: false,
        },
        ...prev.slice(0, 29),
      ]);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || "",
        });
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
        });
        setAuthOpen(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const applyProfileToForms = (prof?: UserProfile, emailStr?: string) => {
    if (emailStr) {
      setSenderEmail((prev) => prev || emailStr);
    }
    if (!prof) return;
    setProfileName(prof.name || "");
    setProfilePhone(prof.phone || "");
    setProfileAddress(prof.defaultAddress || "");
    setProfileApartment(prof.defaultApartment || "");
    setSenderName((prev) => prev || prof.name || "");
    setSenderPhone((prev) => prev || prof.phone || "");
    setStreetAddress((prev) => prev || prof.defaultAddress || "");
    setApartment((prev) => prev || prof.defaultApartment || "");
  };

  useEffect(() => {
    if (!user) {
      setAccount(null);
      setCartReady(true);
      return;
    }
    if (!senderEmail && user.email) {
      setSenderEmail(user.email);
    }

    setCartReady(false);
    Promise.all([
      apiRequest<{ items: CartItem[] }>("/cart"),
      apiRequest<AccountData>("/account"),
    ])
      .then(([cartData, accountData]) => {
        let guestItems: CartItem[] = [];
        try {
          guestItems = JSON.parse(localStorage.getItem("bloom-guest-cart") || "[]");
        } catch {
          guestItems = [];
        }
        const localCurrent = cartItems.length ? cartItems : guestItems;
        const merged = mergeCartItems(cartData.items || [], localCurrent);
        setCartItems(merged);
        setAccount({ email: accountData?.email || user.email || "", orders: Array.isArray(accountData?.orders) ? accountData.orders : [], consultations: Array.isArray(accountData?.consultations) ? accountData.consultations : [], profile: accountData?.profile, notifications: Array.isArray(accountData?.notifications) ? accountData.notifications : undefined });
        applyProfileToForms(accountData.profile, accountData.email || user.email);

        if (merged.length !== (cartData.items || []).length || localCurrent.length > 0) {
          apiRequest("/cart", {
            method: "PUT",
            body: JSON.stringify({ items: merged }),
          }).catch(console.error);
        }
        try {
          localStorage.removeItem("bloom-guest-cart");
        } catch {
          // ignore
        }
      })
      .catch(() => notify("Не удалось загрузить данные кабинета"))
      .finally(() => setCartReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!cartReady) return;
    if (!user) {
      try {
        localStorage.setItem("bloom-guest-cart", JSON.stringify(cartItems));
      } catch {
        // ignore
      }
      return;
    }
    const timer = window.setTimeout(() => {
      apiRequest("/cart", {
        method: "PUT",
        body: JSON.stringify({ items: cartItems }),
      }).catch(() => {});
    }, 200);
    return () => window.clearTimeout(timer);
  }, [cartItems, cartReady, user]);

  useEffect(() => {
    if (sameAsSender) {
      setRecipientName(senderName);
      setRecipientPhone(senderPhone);
    }
  }, [sameAsSender, senderName, senderPhone]);

  const toggleFavorite = (id: string) => {
    setFavorites((curr) => {
      const exists = curr.includes(id);
      notify(exists ? "Убрано из избранного" : "Добавлено в избранное ♥");
      return exists ? curr.filter((x) => x !== id) : [...curr, id];
    });
  };

  const resetFilters = () => {
    setSelectedCategory("all");
    setFilterFlower("all");
    setFilterColor("all");
    setFilterOccasion("all");
    setFilterSize("all");
    setMaxPrice(12000);
    setCatalogPage(1);
    setSearchQuery("");
    setSortBy("popular");
    setOnlyFavorites(false);
  };

  const addToCart = (
    item: Omit<CartItem, "quantity">,
    message = "Букет добавлен в корзину",
  ) => {
    setCartItems((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      if (existing) {
        return current.map((entry) =>
          entry.id === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        );
      }
      return [...current, { ...item, quantity: 1 }];
    });
    notify(message);
  };

  const updateCartItem = (id: string, delta: number) => {
    setCartItems((current) =>
      current
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeCartItem = (id: string) => {
    setCartItems((current) => current.filter((item) => item.id !== id));
    notify("Позиция удалена из корзины");
  };

  const clearCart = () => {
    setCartItems([]);
    setAppliedPromoCode("");
    setUseBonusPoints(false);
    notify("Корзина очищена");
  };

  const applyPromoCode = (rawCode?: string) => {
    const code = (rawCode ?? promoInput).trim().toUpperCase();
    if (!code) {
      notify("Введите промокод");
      return;
    }
    const found = promoCatalog[code];
    if (found) {
      if (found.type === "fixed" && subtotal < 3000) {
        notify("Промокод TULA500 действует при заказе от 3 000 ₽");
        return;
      }
      setPromoInput(code);
      setAppliedPromoCode(code);
      notify(`Промокод применён: ${found.label}`, "Промокод активирован", "bonus");
    } else {
      setAppliedPromoCode("");
      notify("Промокод не найден (доступны: BLOOM2026, WEDDING10, TULA500)");
    }
  };

  const markNotificationsRead = async () => {
    if (!user) {
      setGuestNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      return;
    }
    try {
      await apiRequest("/notifications/read", { method: "PUT" });
      await loadAccount();
    } catch {
      // ignore
    }
  };

  const ensureUserSession = (fallbackEmail?: string): DemoUser | null => {
    if (user) return user;
    const cleanEmail = (fallbackEmail || authEmail || senderEmail || "").trim().toLowerCase();
    if (cleanEmail && cleanEmail.includes("@")) {
      const autoUser: DemoUser = {
        id: `user-${cleanEmail.replace(/[^a-z0-9]/g, "-")}`,
        email: cleanEmail,
        name: senderName.trim() || cleanEmail.split("@")[0],
        phone: senderPhone.trim(),
        isDemo: true,
      };
      setDemoSession(autoUser);
      setUser(autoUser);
      return autoUser;
    }
    setAuthOpen(true);
    notify("Войдите по email и коду, чтобы продолжить");
    return null;
  };

  const sendMagicLink = async (event: FormEvent) => {
    event.preventDefault();
    if (!authEmail.trim()) {
      notify("Введите ваш email");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: authEmail.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      });
      setBusy(false);
      setAuthSent(true);
      if (error) {
        notify("Переключено на ввод кода (доступен код подтверждения 123456)");
      } else {
        notify("Код отправлен на почту! Введите его ниже");
      }
    } catch {
      setBusy(false);
      setAuthSent(true);
      notify("Введите полученный код подтверждения (например, 123456)");
    }
  };

  const verifyOtpCode = async (event: FormEvent) => {
    event.preventDefault();
    const cleanEmail = (authEmail || "client@bloomshop.ru").trim().toLowerCase();
    const cleanToken = otpCode.trim();
    if (!cleanToken) {
      notify("Введите код подтверждения");
      return;
    }

    setBusy(true);
    try {
      if (cleanToken !== "123456") {
        const types: ("email" | "signup" | "magiclink")[] = [
          "email",
          "signup",
          "magiclink",
        ];
        for (const t of types) {
          const { data, error } = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanToken,
            type: t,
          });
          if (!error && data?.user) {
            setUser({ id: data.user.id, email: data.user.email || cleanEmail });
            setAuthOpen(false);
            setAuthSent(false);
            setOtpCode("");
            setBusy(false);
            notify("Вы успешно вошли в личный кабинет!");
            return;
          }
        }
      }

      if (cleanToken === "123456" || /^\d{6,8}$/.test(cleanToken)) {
        const demoUser: DemoUser = {
          id: `user-${cleanEmail.replace(/[^a-z0-9]/g, "-")}`,
          email: cleanEmail,
          isDemo: true,
        };
        setDemoSession(demoUser);
        setUser(demoUser);
        setSenderEmail(cleanEmail);
        setAuthOpen(false);
        setAuthSent(false);
        setOtpCode("");
        notify(`Вы вошли в кабинет как ${cleanEmail}`);
      } else {
        notify("Неверный формат кода. Введите 6-значный код (или 123456)");
      }
    } finally {
      setBusy(false);
    }
  };

  const quickDemoLogin = () => {
    const cleanEmail = (authEmail || "client@bloomshop.ru").trim().toLowerCase();
    const demoUser: DemoUser = {
      id: `user-${cleanEmail.replace(/[^a-z0-9]/g, "-")}`,
      email: cleanEmail,
      isDemo: true,
    };
    setDemoSession(demoUser);
    setUser(demoUser);
    setSenderEmail(cleanEmail);
    setAuthOpen(false);
    setAuthSent(false);
    setOtpCode("");
    notify(`Вход выполнен: ${cleanEmail}`);
  };

  const loadAccount = async () => {
    const data = await apiRequest<AccountData>("/account");
    setAccount(data);
    if (data.profile) {
      applyProfileToForms(data.profile, data.email);
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!ensureUserSession()) return;
    setBusy(true);
    try {
      const res = await apiRequest<{ profile: UserProfile }>("/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          defaultAddress: profileAddress,
          defaultApartment: profileApartment,
        }),
      });
      setSenderName(res.profile.name || senderName);
      setSenderPhone(res.profile.phone || senderPhone);
      if (res.profile.defaultAddress) setStreetAddress(res.profile.defaultAddress);
      if (res.profile.defaultApartment) setApartment(res.profile.defaultApartment);
      await loadAccount();
      notify("Профиль и адрес по умолчанию сохранены!");
    } catch {
      notify("Не удалось сохранить профиль");
    } finally {
      setBusy(false);
    }
  };

  const repeatOrder = (order: Order) => {
    if (!order.items?.length) return;
    setCartItems((curr) => mergeCartItems(curr, order.items));
    if (order.fulfillmentMethod) {
      setFulfillmentMethod(order.fulfillmentMethod);
    }
    setAccountOpen(false);
    setCartOpen(true);
    notify(`Товары из заказа ${order.id} добавлены в корзину`);
  };

  const advanceOrderStatus = async (order: Order) => {
    const stages =
      order.fulfillmentMethod === "pickup"
        ? [
            "Принят в работу",
            "Собирается флористом",
            "Фото букета отправлено",
            "Готов к выдаче в салоне",
            "Выдан покупателю",
          ]
        : [
            "Принят в работу",
            "Собирается флористом",
            "Фото букета отправлено",
            "Передан курьеру (в пути)",
            "Доставлен получателю",
          ];
    const currentIndex = stages.indexOf(order.status);
    const nextStatus = stages[Math.min(stages.length - 1, currentIndex + 1)];
    if (nextStatus === order.status) {
      notify(`Заказ ${order.id} уже выполнен (${order.status})`);
      return;
    }
    try {
      await apiRequest("/orders/status", {
        method: "PUT",
        body: JSON.stringify({ orderId: order.id, status: nextStatus }),
      });
      await loadAccount();
      notify(`🔔 Уведомление: Заказ ${order.id} → «${nextStatus}»`);
    } catch {
      notify("Не удалось обновить статус заказа");
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await apiRequest("/orders/status", {
        method: "PUT",
        body: JSON.stringify({ orderId, status: "Отменён" }),
      });
      await loadAccount();
      notify(`🔔 Заказ ${orderId} отменён`);
    } catch {
      notify("Не удалось изменить статус заказа");
    }
  };

  const submitConsultation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const activeUser = ensureUserSession(senderEmail || "florist-client@bloomshop.ru");
    if (!activeUser) return;

    setBusy(true);
    try {
      const result = await apiRequest<{ emailSent: boolean }>("/consultations", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          phone: form.get("phone"),
          topic: form.get("topic") || "Подбор свадебного / авторского букета",
        }),
      });
      formElement.reset();
      await loadAccount();
      notify(
        result.emailSent
          ? "🔔 Заявка флористу принята, уведомление в личном кабинете!"
          : "Заявка флористу сохранена в личном кабинете",
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Ошибка отправки");
    } finally {
      setBusy(false);
    }
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cartItems.length) {
      setCartOpen(true);
      notify("Сначала добавьте букет в корзину");
      return;
    }

    if (!senderName.trim() || !senderPhone.trim()) {
      notify("Пожалуйста, укажите имя и телефон заказчика (отправителя)");
      return;
    }

    if (fulfillmentMethod === "delivery") {
      if (!recipientName.trim() || !recipientPhone.trim()) {
        notify("При доставке обязательно укажите имя и телефон получателя");
        return;
      }
      if (!streetAddress.trim()) {
        notify("При доставке обязательно укажите улицу и номер дома");
        return;
      }
      if (!isPrivateHouse && !apartment.trim()) {
        notify("Укажите квартиру/офис или отметьте «Частный дом / у входа»");
        return;
      }
    } else {
      if (!pickupPointId) {
        notify("При самовывозе обязательно выберите салон самовывоза");
        return;
      }
    }

    const activeUser = ensureUserSession(senderEmail);
    if (!activeUser) return;

    setBusy(true);
    try {
      const result = await apiRequest<{ order: Order; emailSent: boolean }>(
        "/orders",
        {
          method: "POST",
          body: JSON.stringify({
            items: cartItems,
            subtotal,
            discount,
            bonusUsed,
            deliveryFee,
            total: cartTotal,
            promoCode: appliedPromoCode,
            paymentMethod,
            deliveryZone,
            fulfillmentMethod,
            pickupPoint:
              fulfillmentMethod === "pickup" ? chosenPickup.name : "",
            senderName: senderName.trim(),
            senderPhone: senderPhone.trim(),
            senderEmail: (senderEmail || activeUser.email || "").trim(),
            isAnonymous,
            recipientName:
              fulfillmentMethod === "delivery"
                ? recipientName.trim()
                : senderName.trim(),
            recipientPhone:
              fulfillmentMethod === "delivery"
                ? recipientPhone.trim()
                : senderPhone.trim(),
            address:
              fulfillmentMethod === "delivery"
                ? streetAddress.trim()
                : chosenPickup.name,
            apartment:
              fulfillmentMethod === "delivery" && !isPrivateHouse
                ? apartment.trim()
                : "",
            isPrivateHouse:
              fulfillmentMethod === "delivery" ? isPrivateHouse : false,
            entrance: fulfillmentMethod === "delivery" ? entrance.trim() : "",
            floor: fulfillmentMethod === "delivery" ? floor.trim() : "",
            intercom: fulfillmentMethod === "delivery" ? intercom.trim() : "",
            date: deliveryDate,
            interval: deliveryInterval,
            cardNote: cardNote.trim(),
            courierComment: courierComment.trim(),
          }),
        },
      );
      setCartItems([]);
      setAppliedPromoCode("");
      setUseBonusPoints(false);
      await loadAccount();
      setConfirmedOrder(result.order);
      setExpandedOrderId(result.order.id);
      notify(`🔔 Заказ ${result.order.id} успешно оформлен!`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Ошибка оформления");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="site-shell" data-theme={theme}>
      <div className="top-bar">
        <div className="container top-bar-inner">
          <div className="top-bar-left">
            <span>📍 г. Тула · 3 салона (пр-т Ленина, 74 · Советская, 47 · Пролетарская, 2)</span>
            <span className="top-bar-sep">·</span>
            <span>Ежедневно 08:00–22:00</span>
          </div>
          <div className="top-bar-right">
            <button
              type="button"
              className="top-fulfillment-pill"
              onClick={() => {
                const next = fulfillmentMethod === "delivery" ? "pickup" : "delivery";
                setFulfillmentMethod(next);
                notify(
                  next === "pickup"
                    ? `Выбран самовывоз: ${chosenPickup.shortName}`
                    : "Выбрана доставка курьером по Туле",
                );
              }}
            >
              {fulfillmentMethod === "pickup"
                ? `🏪 Самовывоз: ${chosenPickup.shortName} (0 ₽)`
                : "🚚 Доставка по Туле от 30 мин (бесплатно от 5 000 ₽)"}
            </button>
            <a href="tel:+74872555555" className="top-phone">
              +7 (4872) 55-55-55
            </a>
          </div>
        </div>
      </div>

      <header className="header">
        <div className="container header-inner">
          <a className="logo" href="#top" aria-label="Bloom shop — на главную">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 450 90"
              style={{ height: "44px", width: "auto" }}
            >
              <g transform="translate(0, 0)">
                <path
                  d="M 40 80 C 10 50, 10 10, 40 10 C 60 30, 70 60, 40 80 Z"
                  fill="#FFB6C1"
                  opacity="0.9"
                />
                <path
                  d="M 40 80 C 70 50, 70 10, 40 10 C 20 30, 10 60, 40 80 Z"
                  fill="#FF69B4"
                  opacity="0.8"
                />
                <path
                  d="M 40 85 C 15 50, 25 0, 40 0 C 55 0, 65 50, 40 85 Z"
                  fill="#E83E8C"
                />
                <text
                  x="90"
                  y="50"
                  fontSize="38"
                  fontWeight="900"
                  fill="var(--logo-primary)"
                  letterSpacing="1"
                  fontFamily="system-ui, sans-serif"
                >
                  BLOOM SHOP
                </text>
                <text
                  x="94"
                  y="75"
                  fontSize="13"
                  fontWeight="600"
                  fill="var(--logo-sub)"
                  letterSpacing="3"
                  fontFamily="system-ui, sans-serif"
                >
                  Букет как зеркало души
                </text>
              </g>
            </svg>
          </a>
          <nav className={menuOpen ? "nav nav-open" : "nav"}>
            <a href="#catalog" onClick={() => setMenuOpen(false)}>
              Каталог ({bouquets.length})
            </a>
            <a
              href="#catalog"
              className="nav-wedding"
              onClick={() => {
                setSelectedCategory("wedding");
                setMenuOpen(false);
              }}
            >
              💍 Свадебные цветы
            </a>
            <a href="#constructor" onClick={() => setMenuOpen(false)}>
              Конструктор
            </a>
            <a href="#extras" onClick={() => setMenuOpen(false)}>
              Упаковка и допы
            </a>
            <a href="#florist" onClick={() => setMenuOpen(false)}>
              Флорист
            </a>
            <a href="#delivery" onClick={() => setMenuOpen(false)}>
              Карта и доставка
            </a>
          </nav>
          <div className="header-actions">
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              aria-label="Переключить тему фона"
              title="Переключить тему"
            >
              <Icon name={theme === "light" ? "moon" : "sun"} size={16} />
              <span className="hide-tablet">{theme === "light" ? "Тёмная" : "Светлая"}</span>
            </button>

            <button
              type="button"
              className="fav-header-btn"
              onClick={() => {
                if (user) {
                  setAccountTab("notifications");
                  setAccountOpen(true);
                  markNotificationsRead();
                } else {
                  setAuthOpen(true);
                }
              }}
              aria-label="Уведомления"
              title="Центр уведомлений"
            >
              <Icon name="bell" size={17} />
              {unreadNotificationsCount > 0 && (
                <b className="notif-badge">{unreadNotificationsCount}</b>
              )}
            </button>

            <button
              type="button"
              className="fav-header-btn"
              onClick={() => {
                if (user) {
                  setAccountTab("favorites");
                  setAccountOpen(true);
                } else {
                  setOnlyFavorites((v) => !v);
                  document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
                }
              }}
              aria-label="Избранные букеты"
              title="Избранные букеты"
            >
              <Icon name="heart" size={17} />
              {favorites.length > 0 && <b>{favorites.length}</b>}
            </button>

            <button
              type="button"
              className="account-button"
              onClick={() => {
                if (user) {
                  setAccountOpen(true);
                } else {
                  setAuthOpen(true);
                }
              }}
              aria-label={
                user ? "Открыть личный кабинет" : "Войти в личный кабинет"
              }
            >
              <Icon name="user" size={18} />
              <span>{user && user.email ? String(user.email).split("@")[0] : "Кабинет"}</span>
              {user && (
                <small className="bonus-pill" title="Бонусы Bloom Club">
                  {availableBonus} Б
                </small>
              )}
            </button>

            <button
              type="button"
              className="cart-button"
              onClick={() => setCartOpen(true)}
            >
              <Icon name="bag" size={18} />
              <span>
                {cartTotal > 0 ? `${cartTotal.toLocaleString("ru-RU")} ₽` : "Корзина"}
              </span>
              <b>{cartCount}</b>
            </button>

            <button
              type="button"
              className="menu-button"
              aria-label="Открыть меню"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero container">
          <div className="hero-copy">
            <div className="eyebrow">
              <Icon name="sparkle" size={16} />
              Доставка по Туле от 30 минут или самовывоз из 3 салонов на карте
            </div>
            <h1>
              Цветы, которые
              <br />
              говорят <em>за вас</em>
            </h1>
            <p>
              Авторские и свадебные букеты, монокомпозиции, шляпные коробки и
              корзины из свежих цветов с бережной доставкой курьером в аквабоксе
              или самовывозом за 20 минут.
            </p>
            <div className="hero-promo">
              <span>−15%</span>
              <p>
                на первый заказ + 500 бонусов в личном кабинете
                <small>промокод BLOOM2026 · бесплатная доставка от 5 000 ₽</small>
              </p>
              <button
                type="button"
                className="chip-btn"
                onClick={() => {
                  setPromoInput("BLOOM2026");
                  setAppliedPromoCode("BLOOM2026");
                  notify("Промокод BLOOM2026 (−15%) активирован для вашей корзины!", "Промокод активирован", "bonus");
                }}
              >
                Применить
              </button>
            </div>
            <div className="hero-buttons">
              <a className="button button-primary" href="#catalog">
                Выбрать букет <Icon name="arrow" size={18} />
              </a>
              <a
                className="button button-ghost"
                href="#catalog"
                onClick={() => setSelectedCategory("wedding")}
              >
                💍 Свадебная коллекция
              </a>
              <a className="button button-ghost" href="#constructor">
                Собрать свой
              </a>
            </div>
            <div className="hero-trust">
              <span>
                <Icon name="clock" size={17} /> Доставка от 30 минут
              </span>
              <span>
                <Icon name="pin" size={17} /> 3 салона на карте Тулы
              </span>
              <span>
                <Icon name="bell" size={17} /> Уведомления о каждом этапе
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-blob" />
            <img
              src={IMAGES.rose_peony}
              alt="Нежный букет из французских роз и пионов"
            />
            <div className="floating-note">
              <span>4,9</span>
              <p>
                Оценка покупателей
                <small>более 500 отзывов в Туле</small>
              </p>
            </div>
          </div>
        </section>

        <section className="container" id="wedding-showcase">
          <div className="wedding-showcase">
            <div className="wedding-banner-copy">
              <span className="section-kicker">
                <Icon name="sparkle" size={15} /> Выделенная коллекция для невест
              </span>
              <h2>Свадебные цветы и букеты невесты</h2>
              <p>
                От классических белоснежных калл и пионовидных роз Дэвид Остин до
                каскадных букетов с орхидеями, букетов-дублёров и оформления
                президиума. К каждому букету невесты — бутоньерка жениха в
                подарок.
              </p>
              <div className="wedding-perks">
                <span className="wedding-perk-pill">💍 8 готовых свадебных решений</span>
                <span className="wedding-perk-pill">🎀 Бутоньерка жениха бесплатно</span>
                <span className="wedding-perk-pill">💧 Доставка в аквабоксе к утру невесты</span>
              </div>
              <div className="hero-buttons">
                <a
                  href="#catalog"
                  className="button button-primary"
                  onClick={() => setSelectedCategory("wedding")}
                >
                  Открыть категорию «Свадебные цветы» <Icon name="arrow" size={17} />
                </a>
                <a href="#florist" className="button button-ghost">
                  Консультация свадебного флориста
                </a>
              </div>
            </div>
            <div className="wedding-banner-visual">
              <img
                src={IMAGES.wedding}
                alt="Свадебный букет невесты из белых калл и пионовидных роз"
              />
            </div>
          </div>
        </section>

        <section className="container section" id="catalog">
          <nav className="breadcrumbs" aria-label="Хлебные крошки">
            <a href="#top">Главная</a>
            <span>/</span>
            <strong>{catalogMode === "bouquets" ? `Каталог готовых букетов (${bouquets.length})` : `Каталог свежих цветов поштучно (${flowers.length} сорта)`}</strong>
          </nav>
          <div className="section-heading">
            <div>
              <span className="section-kicker">Ассортимент большого цветочного маркета</span>
              <h2>Каталог букетов ({bouquets.length}) и свежих цветов ({flowers.length})</h2>
            </div>
            <div className="catalog-mode-switch" role="tablist" aria-label="Режим каталога">
              <button
                type="button"
                className={catalogMode === "bouquets" ? "mode-pill active" : "mode-pill"}
                onClick={() => setCatalogMode("bouquets")}
              >
                💐 Готовые букеты ({bouquets.length})
              </button>
              <button
                type="button"
                className={catalogMode === "flowers" ? "mode-pill active" : "mode-pill"}
                onClick={() => setCatalogMode("flowers")}
              >
                🌷 Каталог цветов поштучно ({flowers.length})
              </button>
            </div>
          </div>

          {catalogMode === "flowers" && (
            <div className="flowers-catalog-showcase">
              <div className="flowers-catalog-header">
                <p>
                  Все <strong>{flowers.length} сорта свежих цветов</strong> поставляются напрямую с плантаций Эквадора, Голландии и Крыма. Вы можете добавить цветы поштучно в корзину или одним кликом передать выбранные сорта в конструктор «Соберите композицию мечты».
                </p>
                <a className="button button-primary" href="#constructor">
                  Перейти в конструктор букета <Icon name="arrow" size={16} />
                </a>
              </div>
              <div className="flowers-catalog-grid">
                {flowers.map((fl) => {
                  const qtyInConstructor = quantities[fl.id] || 0;
                  return (
                    <article className="flower-catalog-card" key={fl.id}>
                      <img src={fl.image} alt={fl.name} />
                      <div className="flower-catalog-body">
                        <strong>{fl.name}</strong>
                        <small>{fl.desc}</small>
                        <div className="flower-catalog-actions">
                          <span className="flower-price-tag">{fl.price} ₽ / {fl.unit}</span>
                          <div className="flower-card-btns">
                            <button
                              type="button"
                              className="chip-btn"
                              onClick={() => {
                                setQuantities((curr) => ({ ...curr, [fl.id]: (curr[fl.id] || 0) + 1 }));
                                notify(`«${fl.name}» добавлен в конструктор (+1 ${fl.unit})`);
                              }}
                            >
                              В конструктор {qtyInConstructor > 0 ? `(${qtyInConstructor})` : "+"}
                            </button>
                            <button
                              type="button"
                              className="chip-btn active"
                              onClick={() =>
                                addToCart(
                                  {
                                    id: `single-flower-${fl.id}`,
                                    name: `${fl.name} (поштучно)`,
                                    price: fl.price,
                                    image: fl.image,
                                    details: `${fl.desc} · Цена за 1 ${fl.unit}`,
                                  },
                                  `${fl.name} добавлен в корзину`,
                                )
                              }
                            >
                              В корзину
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          <div className="catalog-controls">
            <div className="category-tabs" role="tablist" aria-label="Категории цветов">
              {(
                [
                  ["all", "Все букеты", bouquets.length],
                  [
                    "wedding",
                    "💍 Свадебные цветы",
                    bouquets.filter((b) => b.category === "wedding").length,
                  ],
                  [
                    "author",
                    "Авторские букеты",
                    bouquets.filter((b) => b.category === "author").length,
                  ],
                  [
                    "mono",
                    "Монобукеты",
                    bouquets.filter((b) => b.category === "mono").length,
                  ],
                  [
                    "box",
                    "В шляпной коробке",
                    bouquets.filter((b) => b.category === "box").length,
                  ],
                  [
                    "basket",
                    "В корзине",
                    bouquets.filter((b) => b.category === "basket").length,
                  ],
                  [
                    "dried",
                    "Сухоцветы",
                    bouquets.filter((b) => b.category === "dried").length,
                  ],
                ] as [CategoryId, string, number][]
              ).map(([catId, label, count]) => (
                <button
                  key={catId}
                  type="button"
                  className={[
                    "category-tab",
                    catId === "wedding" ? "wedding-tab" : "",
                    selectedCategory === catId ? "active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => { setSelectedCategory(catId); setCatalogPage(1); setCatalogMode('bouquets'); }}
                >
                  <span>{label}</span>
                  <small>{count}</small>
                </button>
              ))}
            </div>

            <div className="filter-grid">
              <div className="filter-group">
                <label htmlFor="filter-flower">Цветы в составе</label>
                <select
                  id="filter-flower"
                  value={filterFlower}
                  onChange={(e) => setFilterFlower(e.target.value)}
                >
                  <option value="all">Все виды цветов (24 сорта)</option>
                  {flowers.map((fl) => (
                    <option key={fl.id} value={fl.id}>
                      {fl.name} ({fl.price} ₽)
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="filter-color">Цветовая гамма</label>
                <select
                  id="filter-color"
                  value={filterColor}
                  onChange={(e) => setFilterColor(e.target.value)}
                >
                  <option value="all">Любой оттенок</option>
                  <option value="white">Белый / Кремовый</option>
                  <option value="pink">Нежно-розовый / Пудра</option>
                  <option value="red">Красный / Рубиновый</option>
                  <option value="peach">Персиковый / Коралл</option>
                  <option value="lavender">Лавандовый / Сиреневый</option>
                  <option value="yellow">Солнечно-жёлтый</option>
                  <option value="pastel">Пастельный микс</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="filter-occasion">Повод</label>
                <select
                  id="filter-occasion"
                  value={filterOccasion}
                  onChange={(e) => setFilterOccasion(e.target.value)}
                >
                  <option value="all">Любой повод</option>
                  <option value="wedding">💍 Свадьба / Невесте</option>
                  <option value="birthday">День рождения</option>
                  <option value="love">Признание в любви / Свидание</option>
                  <option value="anniversary">Юбилей / Торжество</option>
                  <option value="just_because">Комплимент без повода</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="filter-size">Размер букета</label>
                <select
                  id="filter-size"
                  value={filterSize}
                  onChange={(e) => setFilterSize(e.target.value)}
                >
                  <option value="all">Любой размер</option>
                  <option value="S">S — Компактный</option>
                  <option value="M">M — Стандартный</option>
                  <option value="L">L — Пышный</option>
                  <option value="XL">XL — Делюкс / Королевский</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="filter-price">
                  Цена до: {maxPrice.toLocaleString("ru-RU")} ₽
                </label>
                <input
                  id="filter-price"
                  type="range"
                  min={2800}
                  max={12000}
                  step={200}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="filter-sort">Сортировка</label>
                <select
                  id="filter-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="popular">По популярности и рейтингу</option>
                  <option value="price_asc">Сначала дешевле</option>
                  <option value="price_desc">Сначала дороже</option>
                  <option value="name_asc">По названию (А–Я)</option>
                </select>
              </div>
            </div>

            <div className="catalog-toolbar-bottom">
              <div>
                Найдено букетов: <strong>{filteredBouquets.length}</strong> из{" "}
                {bouquets.length}
              </div>
              <div className="catalog-toolbar-actions">
                <input
                  type="search"
                  placeholder="Поиск по названию или цветку..."
                  aria-label="Поиск букета"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    height: "34px",
                    padding: "0 12px",
                    border: "1px solid var(--input-border)",
                    borderRadius: "100px",
                    background: "var(--input-bg)",
                    fontSize: "12px",
                  }}
                />
                <button
                  type="button"
                  className={onlyFavorites ? "chip-btn active" : "chip-btn"}
                  onClick={() => setOnlyFavorites((v) => !v)}
                >
                  ♥ Избранное ({favorites.length})
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={resetFilters}
                >
                  Сбросить фильтры
                </button>
              </div>
            </div>
          </div>

          {!filteredBouquets.length ? (
            <div className="account-empty" style={{ padding: "48px 20px" }}>
              <p style={{ fontSize: "15px", marginBottom: "14px" }}>
                По выбранным параметрам букетов не найдено.
              </p>
              <button
                type="button"
                className="button button-primary"
                onClick={resetFilters}
              >
                Показать все {bouquets.length} букетов
              </button>
            </div>
          ) : (
            <>
            <div className="catalog-grid">
              {(showAllBouquets
                ? filteredBouquets
                : filteredBouquets.slice((catalogPage - 1) * 9, catalogPage * 9)
              ).map((bouquet) => {
                const directCartId = `bouquet-${bouquet.id}`;
                const inCartItem = cartItems.find(
                  (entry) =>
                    entry.id === directCartId ||
                    entry.id.startsWith(`bouquet-${bouquet.id}-`),
                );
                return (
                  <article className="product-card" key={bouquet.id}>
                    <div
                      className="product-image"
                      onClick={() => {
                        setSelectedBouquetModal(bouquet);
                        setModalPackagingId(selectedPackagingId);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <img
                        src={bouquet.image}
                        alt={`Букет «${bouquet.name}»`}
                      />
                      <span
                        className={
                          bouquet.category === "wedding"
                            ? "product-badge wedding"
                            : "product-badge"
                        }
                      >
                        {bouquet.tag}
                      </span>
                      <span className="product-size-pill">
                        Размер {bouquet.size} · {bouquet.stems} стеблей · ★ {bouquet.rating.toFixed(1)}
                      </span>
                      <button
                        type="button"
                        className={
                          favorites.includes(bouquet.id)
                            ? "fav-btn active"
                            : "fav-btn"
                        }
                        aria-label={`В избранное: ${bouquet.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(bouquet.id);
                        }}
                      >
                        <Icon name="heart" size={18} />
                      </button>
                    </div>
                    <div className="product-content">
                      <div>
                        <h3>{bouquet.name}</h3>
                        <p>{bouquet.description}</p>
                        <div className="product-meta-tags">
                          {bouquet.category === "wedding" && (
                            <span>💍 Свадебная коллекция</span>
                          )}
                          <span>{bouquet.composition.split(",")[0]}</span>
                          <span>В наличии в 3 салонах</span>
                        </div>
                      </div>
                      <div className="product-footer">
                        <div>
                          <strong>{bouquet.price.toLocaleString("ru-RU")} ₽</strong>
                          <small className="bonus-hint">
                            +{Math.round(bouquet.price * 0.05)} Б кэшбэк
                          </small>
                        </div>
                        <div className="product-actions-row">
                          <button
                            type="button"
                            className="btn-detail"
                            onClick={() => {
                              setSelectedBouquetModal(bouquet);
                              setModalPackagingId(selectedPackagingId);
                            }}
                          >
                            Упаковка / Состав
                          </button>
                          {inCartItem ? (
                            <div className="card-qty-stepper">
                              <button
                                type="button"
                                aria-label="Уменьшить количество"
                                onClick={() => updateCartItem(inCartItem.id, -1)}
                              >
                                −
                              </button>
                              <span>{inCartItem.quantity}</span>
                              <button
                                type="button"
                                aria-label="Увеличить количество"
                                onClick={() => updateCartItem(inCartItem.id, 1)}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn-add-cart"
                              onClick={() =>
                                addToCart({
                                  id: directCartId,
                                  name: bouquet.name,
                                  price: bouquet.price,
                                  image: bouquet.image,
                                  details: bouquet.description,
                                })
                              }
                            >
                              В корзину <Icon name="bag" size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            {filteredBouquets.length > 9 && (
              <div className="catalog-pagination" role="navigation" aria-label="Пагинация каталога">
                {!showAllBouquets && (
                  <div className="pagination-pages">
                    {Array.from({ length: Math.ceil(filteredBouquets.length / 9) }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        className={catalogPage === pageNum ? "page-btn active" : "page-btn"}
                        onClick={() => {
                          setCatalogPage(pageNum);
                          document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => {
                    setShowAllBouquets((prev) => !prev);
                    setCatalogPage(1);
                  }}
                >
                  {showAllBouquets
                    ? "Свернуть каталог по страницам (по 9 букетов)"
                    : `Показать все букеты сразу (${filteredBouquets.length} шт.)`}
                </button>
              </div>
            )}
            </>
          )}
        </section>

        <section className="constructor-section" id="constructor">
          <div className="container">
            <div className="section-heading light-heading">
              <div>
                <span className="section-kicker">Создайте свой букет из полного каталога</span>
                <h2>Соберите композицию мечты</h2>
              </div>
              <p>
                В конструкторе доступны <strong>все {flowers.length} сорта цветов из каталога</strong> с индивидуальными фото, пышная зелень, 10 видов упаковки и 12 дополнений — соберите монобукет или авторский микс.
              </p>
            </div>
            <div className="constructor-grid">
              <div className="flower-selector">
                <div className="constructor-selector-top">
                  <h3>1. Выберите цветы из каталога ({flowers.length} сорта)</h3>
                  <div className="constructor-group-tabs">
                    {(
                      [
                        ["all", `Все цветы (${flowers.length})`],
                        ["roses", "Розы и пионы"],
                        ["spring", "Весенние и луковичные"],
                        ["classic", "Гортензии, каллы, лилии"],
                        ["exotic", "Экзотика и сухоцветы"],
                      ] as const
                    ).map(([gid, glabel]) => (
                      <button
                        key={gid}
                        type="button"
                        className={constructorGroup === gid ? "chip-btn active" : "chip-btn"}
                        onClick={() => setConstructorGroup(gid)}
                      >
                        {glabel}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flower-selector-grid">
                  {flowers
                    .filter((fl) => constructorGroup === "all" || fl.group === constructorGroup)
                    .map((flower) => (
                    <div className="flower-row" key={flower.id}>
                      <img src={flower.image} alt={flower.name} />
                      <div className="flower-name">
                        <strong>{flower.name}</strong>
                        <span>
                          {flower.price} ₽ / {flower.unit}
                        </span>
                      </div>
                      <div className="qty-control">
                        <button
                          type="button"
                          aria-label={`Уменьшить количество: ${flower.name}`}
                          onClick={() =>
                            setQuantities((current) => ({
                              ...current,
                              [flower.id]: Math.max(0, (current[flower.id] || 0) - 1),
                            }))
                          }
                        >
                          −
                        </button>
                        <span>{quantities[flower.id] || 0}</span>
                        <button
                          type="button"
                          aria-label={`Увеличить количество: ${flower.name}`}
                          onClick={() =>
                            setQuantities((current) => ({
                              ...current,
                              [flower.id]: (current[flower.id] || 0) + 1,
                            }))
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="greenery-box">
                  <h4>Зелень и декоративное наполнение:</h4>
                  <div className="greenery-options">
                    {greeneryOptions.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className={
                          selectedGreenery === g.id ? "chip-btn active" : "chip-btn"
                        }
                        onClick={() => setSelectedGreenery(g.id)}
                      >
                        {g.name} {g.price > 0 ? `(+${g.price} ₽)` : "(0 ₽)"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bouquet-summary">
                <div>
                  <span className="summary-label">Ваш авторский букет</span>
                  <h3>Индивидуальная композиция</h3>
                  <ul>
                    {flowers.map(
                      (flower) =>
                        quantities[flower.id] > 0 && (
                          <li key={flower.id}>
                            <span>
                              {flower.name}, {quantities[flower.id]} {flower.unit}
                            </span>
                            <b>
                              {(
                                quantities[flower.id] * flower.price
                              ).toLocaleString("ru-RU")}{" "}
                              ₽
                            </b>
                          </li>
                        ),
                    )}
                    {selectedGreeneryObj.price > 0 && (
                      <li>
                        <span>Зелень: {selectedGreeneryObj.name}</span>
                        <b>+{selectedGreeneryObj.price} ₽</b>
                      </li>
                    )}
                    <li>
                      <span>Упаковка: {selectedPackaging.name}</span>
                      <b>+{selectedPackaging.price} ₽</b>
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="summary-total">
                    <span>Итого с упаковкой</span>
                    <strong>
                      {(flowerTotal + selectedPackaging.price).toLocaleString(
                        "ru-RU",
                      )}{" "}
                      ₽
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="button button-primary full-button"
                    disabled={flowerTotal === 0}
                    onClick={() =>
                      addToCart(
                        {
                          id: `custom-${Object.values(quantities).join("-")}-${selectedGreenery}-${selectedPackaging.id}`,
                          name: "Индивидуальная композиция",
                          price: flowerTotal + selectedPackaging.price,
                          image: IMAGES.rose_peony,
                          details: [
                            ...flowers
                              .filter((f) => quantities[f.id] > 0)
                              .map((f) => `${f.name}: ${quantities[f.id]} шт.`),
                            selectedGreeneryObj.name,
                            `Упаковка: ${selectedPackaging.name}`,
                          ].join(", "),
                        },
                        "Ваш индивидуальный букет добавлен в корзину",
                      )
                    }
                  >
                    Добавить в корзину <Icon name="arrow" size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container section extras-section" id="extras">
          <div className="section-heading compact-heading">
            <div>
              <span className="section-kicker">Финальные штрихи и подарки</span>
              <h2>Большой выбор упаковки и дополнений</h2>
            </div>
          </div>
          <div className="extras-grid">
            <div className="packaging-panel">
              <h3>2. Выберите упаковку ({packagingOptions.length} вариантов)</h3>
              <div className="packaging-list">
                {packagingOptions.map((pkg) => (
                  <label
                    className={
                      selectedPackagingId === pkg.id
                        ? "package-option active"
                        : "package-option"
                    }
                    key={pkg.id}
                  >
                    <input
                      checked={selectedPackagingId === pkg.id}
                      name="package"
                      type="radio"
                      onChange={() => setSelectedPackagingId(pkg.id)}
                    />
                    <span className="custom-radio" />
                    <div>
                      <b>{pkg.name}</b>
                      <small>{pkg.sub}</small>
                    </div>
                    <span className="package-price">+{pkg.price} ₽</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="addons-panel">
              <h3>3. Добавьте к букету ({addons.length} дополнений)</h3>
              <div className="addons-filter-tabs">
                {[
                  ["all", "Все"],
                  ["cards", "Открытки и топперы"],
                  ["vases", "Вазы и уход"],
                  ["sweets", "Сладости"],
                  ["toys", "Игрушки и шары"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={addonCategory === id ? "chip-btn active" : "chip-btn"}
                    onClick={() => setAddonCategory(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="addons-list">
                {filteredAddons.map((addon) => {
                  const addonCartId = `addon-${addon.id}`;
                  const inCart = cartItems.find((i) => i.id === addonCartId);
                  return (
                    <article className="addon-card" key={addon.id}>
                      <div className="addon-card-top">
                        <div className="addon-thumb-wrap">
                          <img src={addon.image} alt={addon.name} className="addon-thumb" />
                        </div>
                        <div className="addon-card-info">
                          <strong>{addon.name}</strong>
                          <small>{addon.sub}</small>
                        </div>
                      </div>
                      <div className="addon-card-footer">
                        <span>{addon.price} ₽</span>
                        <button
                          type="button"
                          aria-label={`Добавить: ${addon.name}`}
                          className={inCart ? "active" : ""}
                          onClick={() =>
                            addToCart(
                              {
                                id: addonCartId,
                                name: addon.name,
                                price: addon.price,
                                image: addon.image,
                                details: addon.sub,
                              },
                              `${addon.name} добавлен в корзину`,
                            )
                          }
                        >
                          {inCart ? `${inCart.quantity}` : "+"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="service-section" id="florist">
          <div className="container service-grid">
            <div className="florist-visual">
              <img
                src={IMAGES.wedding_cascade}
                alt="Флорист собирает свадебный букет"
              />
              <div className="visual-caption">
                <Icon name="sparkle" size={22} />
                <span>
                  <b>Персональный подход</b>
                  Свадебная флористика, оформление банкетов и авторские композиции
                </span>
              </div>
            </div>
            <div className="service-copy">
              <span className="section-kicker">Услуги шеф-флориста</span>
              <h2>Доверьте важный момент профессионалу</h2>
              <p>
                Создадим индивидуальный дизайн свадебного букета невесты,
                бутоньерок и цветочного оформления торжества. Первая консультация
                — бесплатно.
              </p>
              <form className="consult-form" onSubmit={submitConsultation}>
                <label>
                  <span>Ваше имя</span>
                  <input
                    required
                    name="name"
                    placeholder="Анна"
                    defaultValue={senderName}
                  />
                </label>
                <label>
                  <span>Номер телефона</span>
                  <input
                    required
                    name="phone"
                    placeholder="+7 (999) 000-00-00"
                    type="tel"
                    defaultValue={senderPhone}
                  />
                </label>
                <label className="wide-field">
                  <span>Тематика обращения</span>
                  <select name="topic" defaultValue="Свадебный букет и оформление">
                    <option value="Свадебный букет и оформление">
                      💍 Свадебный букет невесты и оформление
                    </option>
                    <option value="Индивидуальный авторский букет">
                      Индивидуальный авторский букет
                    </option>
                    <option value="Корпоративный заказ">
                      Корпоративный заказ / Оформление мероприятия
                    </option>
                  </select>
                </label>
                <button
                  className="button button-dark"
                  disabled={busy}
                  type="submit"
                >
                  Заказать консультацию <Icon name="arrow" size={18} />
                </button>
                <small className="form-note">
                  Заявка и уведомление мгновенно сохранятся в вашем личном кабинете
                </small>
              </form>
            </div>
          </div>
        </section>

        {/* Checkout & Interactive Map Section */}
        <section className="container section delivery-section" id="delivery">
          <div className="delivery-intro">
            <span className="section-kicker">Интерактивная карта и получение</span>
            <h2>Салоны в Туле и курьерская доставка</h2>
            <p>
              Нажмите на любой из 3 салонов Bloom Shop на карте Тулы для
              быстрого самовывоза за 20 минут (0 ₽) или оформите бережную
              доставку курьером в аквабоксе с фотоотчётом перед выездом.
            </p>

            {/* Интерактивная Яндекс.Карта салонов Bloom Shop в г. Туле */}
            <div className="map-card">
              <div className="map-toolbar">
                <button
                  type="button"
                  className={showAllSalonsOnMap ? "chip-btn active" : "chip-btn"}
                  onClick={() => setShowAllSalonsOnMap(true)}
                >
                  🗺️ Все 3 салона на Яндекс.Карте
                </button>
                {pickupPoints.map((pt) => (
                  <button
                    key={pt.id}
                    type="button"
                    className={!showAllSalonsOnMap && pickupPointId === pt.id ? "chip-btn active" : "chip-btn"}
                    onClick={() => {
                      setPickupPointId(pt.id);
                      setShowAllSalonsOnMap(false);
                      setFulfillmentMethod("pickup");
                    }}
                  >
                    📍 {pt.shortName.split(" (")[0]}
                  </button>
                ))}
              </div>
              <div
                id="tula-map"
                className="tula-map-container"
                style={{ height: "360px", width: "100%", position: "relative", borderRadius: "14px", overflow: "hidden", border: "1px solid var(--line)" }}
              >
                <iframe
                  title="Салоны Bloom Shop на Яндекс.Карте г. Тулы"
                  src={yandexMapWidgetUrl}
                  width="100%"
                  height="360"
                  style={{ border: 0, display: "block" }}
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <div className="map-caption">
                <span>📍 Яндекс.Карты: ① пр-т Ленина, 74 · ② ул. Советская, 47 · ③ ул. Пролетарская, 2</span>
                <span>🚚 Бесплатная доставка от 5 000 ₽ · Самовывоз — 0 ₽</span>
              </div>
            </div>

            <div className="pickup-directory">
              <h4>📍 Наши салоны самовывоза в Туле</h4>
              {pickupPoints.map((pt) => (
                <div
                  key={pt.id}
                  className={
                    pickupPointId === pt.id
                      ? "store-info-card active"
                      : "store-info-card"
                  }
                  onClick={() => {
                    setPickupPointId(pt.id);
                    setShowAllSalonsOnMap(false);
                    setFulfillmentMethod("pickup");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="store-info-header">
                    <strong>{pt.shortName}</strong>
                    <span className="store-district-badge">{pt.district}</span>
                  </div>
                  <p>{pt.name}</p>
                  <p>
                    <b>Режим:</b> {pt.hours} · <b>{pt.prepTime}</b>
                  </p>
                  <p>
                    <b>Парковка:</b> {pt.parking} · <b>Тел.:</b> {pt.phone}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <form className="delivery-form" onSubmit={submitOrder}>
            <h3>Оформление заказа</h3>

            {cartItems.length > 0 ? (
              <div className="checkout-cart-preview wide-field">
                <div className="checkout-cart-preview-head">
                  <span>Ваш заказ ({cartCount} шт.)</span>
                  <button
                    type="button"
                    className="chip-btn"
                    onClick={() => setCartOpen(true)}
                  >
                    Изменить корзину
                  </button>
                </div>
                <div className="checkout-cart-preview-items">
                  {cartItems.map((item) => (
                    <div key={item.id} className="checkout-preview-chip">
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <b>{(item.price * item.quantity).toLocaleString("ru-RU")} ₽</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="checkout-empty-banner wide-field">
                <span>В вашей корзине пока нет букетов.</span>
                <a href="#catalog" className="chip-btn active">
                  Перейти к выбору букета →
                </a>
              </div>
            )}

            <div
              className="fulfillment-tabs"
              role="radiogroup"
              aria-label="Способ получения букета"
            >
              <button
                type="button"
                className={
                  fulfillmentMethod === "delivery"
                    ? "fulfillment-tab active"
                    : "fulfillment-tab"
                }
                onClick={() => setFulfillmentMethod("delivery")}
              >
                <strong>🚚 Доставка курьером</strong>
                <small>В аквабоксе по Туле и области · фото до выезда</small>
              </button>
              <button
                type="button"
                className={
                  fulfillmentMethod === "pickup"
                    ? "fulfillment-tab active"
                    : "fulfillment-tab"
                }
                onClick={() => setFulfillmentMethod("pickup")}
              >
                <strong>🏪 Самовывоз из салона (0 ₽)</strong>
                <small>3 салона на карте Тулы · готовность от 20 минут</small>
              </button>
            </div>

            {fulfillmentMethod === "pickup" ? (
              <>
                <div className="checkout-group-title">
                  1. Точка самовывоза на карте Тулы
                </div>
                <label className="wide-field">
                  <span>Выберите салон для самовывоза *</span>
                  <select
                    required
                    name="pickupPoint"
                    value={pickupPointId}
                    onChange={(e) => setPickupPointId(e.target.value)}
                  >
                    {pickupPoints.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.name} ({pt.hours})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="pickup-point-card">
                  <strong>✓ Выбрана точка: {chosenPickup.name}</strong>
                  <small>
                    {chosenPickup.hours} · {chosenPickup.prepTime} ·{" "}
                    {chosenPickup.parking}
                  </small>
                  <small style={{ color: "var(--sage)", marginTop: "4px", fontWeight: 600 }}>
                    ✓ {chosenPickup.stockNote}
                  </small>
                </div>

                <div className="checkout-group-title">
                  2. Кто заберёт букет (данные заказчика)
                </div>
                <label>
                  <span>Имя заказчика (кто заберёт) *</span>
                  <input
                    required
                    name="senderName"
                    placeholder="Иван Петров"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                </label>
                <label>
                  <span>Телефон для уведомления о готовности *</span>
                  <input
                    required
                    name="senderPhone"
                    placeholder="+7 (999) 123-45-67"
                    type="tel"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                  />
                </label>
                <label className="wide-field">
                  <span>Email для чека, бонусов и фото готового букета *</span>
                  <input
                    required
                    name="senderEmail"
                    placeholder="name@example.ru"
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                  />
                </label>
                <label>
                  <span>Дата самовывоза *</span>
                  <input
                    required
                    name="date"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </label>
                <label>
                  <span>Время визита в салон *</span>
                  <select
                    name="interval"
                    value={deliveryInterval}
                    onChange={(e) => setDeliveryInterval(e.target.value)}
                  >
                    {pickupTimeIntervals.map((intervalOpt) => (
                      <option key={intervalOpt} value={intervalOpt}>
                        {intervalOpt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="wide-field">
                  <span>Текст записки к букету / пожелания флористу</span>
                  <input
                    name="cardNote"
                    placeholder="Пожелание в открытку (необязательно)"
                    value={cardNote}
                    onChange={(e) => setCardNote(e.target.value)}
                  />
                </label>
              </>
            ) : (
              <>
                <div className="checkout-group-title">
                  1. Тариф доставки и данные отправителя
                </div>
                <div className="zone-selector wide-field">
                  {deliveryZones.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      className={
                        deliveryZone === zone.id
                          ? "zone-option active"
                          : "zone-option"
                      }
                      onClick={() => setDeliveryZone(zone.id)}
                    >
                      <div>
                        <strong>{zone.name}</strong>
                        <small>{zone.sub}</small>
                      </div>
                      <span>
                        {zone.freeFrom && afterDiscounts >= zone.freeFrom
                          ? "0 ₽"
                          : `${zone.fee} ₽`}
                      </span>
                    </button>
                  ))}
                </div>

                <label>
                  <span>Имя отправителя *</span>
                  <input
                    required
                    name="senderName"
                    placeholder="Александр"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                </label>
                <label>
                  <span>Телефон отправителя *</span>
                  <input
                    required
                    name="senderPhone"
                    placeholder="+7 (999) 123-45-67"
                    type="tel"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                  />
                </label>
                <label className="wide-field">
                  <span>Email отправителя (пришлём фото букета до выезда курьера) *</span>
                  <input
                    required
                    name="senderEmail"
                    placeholder="name@example.ru"
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                  />
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  <span>
                    Анонимная доставка (не называть получателю имя отправителя)
                  </span>
                </label>

                <div className="checkout-group-title">
                  2. Данные получателя (обязательно)
                </div>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={sameAsSender}
                    onChange={(e) => setSameAsSender(e.target.checked)}
                  />
                  <span>Получатель — я сам(а) (скопировать мои данные)</span>
                </label>
                <label>
                  <span>Имя получателя букета *</span>
                  <input
                    required
                    name="recipientName"
                    placeholder="Екатерина"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </label>
                <label>
                  <span>Телефон получателя *</span>
                  <input
                    required
                    name="recipientPhone"
                    placeholder="+7 (999) 987-65-43"
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                  />
                </label>

                <div className="checkout-group-title">
                  3. Адрес и время доставки в Туле (обязательно)
                </div>
                <label className="wide-field">
                  <span>Улица и номер дома *</span>
                  <input
                    required
                    name="address"
                    placeholder="г. Тула, ул. Советская, д. 47"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                  />
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={isPrivateHouse}
                    onChange={(e) => setIsPrivateHouse(e.target.checked)}
                  />
                  <span>
                    Частный дом / бизнес-центр (встречу курьера у входа, без номера квартиры)
                  </span>
                </label>
                <div className="address-subgrid">
                  <label>
                    <span>Кв. / офис {isPrivateHouse ? "" : "*"}</span>
                    <input
                      required={!isPrivateHouse}
                      disabled={isPrivateHouse}
                      name="apartment"
                      placeholder={isPrivateHouse ? "Не требуется" : "42"}
                      value={isPrivateHouse ? "" : apartment}
                      onChange={(e) => setApartment(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Подъезд</span>
                    <input
                      name="entrance"
                      placeholder="2"
                      value={entrance}
                      onChange={(e) => setEntrance(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Этаж</span>
                    <input
                      name="floor"
                      placeholder="5"
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Домофон</span>
                    <input
                      name="intercom"
                      placeholder="42#"
                      value={intercom}
                      onChange={(e) => setIntercom(e.target.value)}
                    />
                  </label>
                </div>
                <label>
                  <span>Дата доставки *</span>
                  <input
                    required
                    name="date"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </label>
                <label>
                  <span>Интервал времени *</span>
                  <select
                    name="interval"
                    value={deliveryInterval}
                    onChange={(e) => setDeliveryInterval(e.target.value)}
                  >
                    {deliveryTimeIntervals.map((intervalOpt) => (
                      <option key={intervalOpt} value={intervalOpt}>
                        {intervalOpt}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Текст записки для открытки</span>
                  <input
                    name="cardNote"
                    placeholder="С любовью и нежностью..."
                    value={cardNote}
                    onChange={(e) => setCardNote(e.target.value)}
                  />
                </label>
                <label>
                  <span>Комментарий курьеру</span>
                  <input
                    name="courierComment"
                    placeholder="Код шлагбаума, позвонить заранее..."
                    value={courierComment}
                    onChange={(e) => setCourierComment(e.target.value)}
                  />
                </label>
              </>
            )}

            <div className="checkout-group-title">
              {fulfillmentMethod === "pickup" ? "3. Способ оплаты и бонусы" : "4. Способ оплаты и бонусы"}
            </div>
            <div className="payment-methods-grid wide-field">
              {paymentMethods.map((pm) => (
                <label
                  key={pm.id}
                  className={
                    paymentMethod === pm.id
                      ? "payment-option active"
                      : "payment-option"
                  }
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === pm.id}
                    onChange={() => setPaymentMethod(pm.id)}
                  />
                  <div>
                    <div className="payment-option-top">
                      <strong>{pm.name}</strong>
                      <span className="payment-badge">{pm.badge}</span>
                    </div>
                    <small>{pm.sub}</small>
                  </div>
                </label>
              ))}
            </div>

            {user && maxBonusUsable > 0 && (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={useBonusPoints}
                  onChange={(e) => setUseBonusPoints(e.target.checked)}
                />
                <span>
                  Списать <b>{maxBonusUsable} бонусов Bloom Club</b> (−{maxBonusUsable} ₽, доступно {availableBonus} Б)
                </span>
              </label>
            )}

            <div className="checkout-summary wide-field">
              <div className="checkout-summary-row">
                <span>
                  Товары в корзине: <b>{cartCount} шт.</b>
                </span>
                <b>{subtotal.toLocaleString("ru-RU")} ₽</b>
              </div>
              {discount > 0 && (
                <div className="checkout-summary-row" style={{ color: "var(--rose-dark)" }}>
                  <span>Скидка по промокоду ({appliedPromoCode})</span>
                  <b>−{discount.toLocaleString("ru-RU")} ₽</b>
                </div>
              )}
              {bonusUsed > 0 && (
                <div className="checkout-summary-row" style={{ color: "var(--sage)" }}>
                  <span>Списано бонусов Bloom Club</span>
                  <b>−{bonusUsed.toLocaleString("ru-RU")} ₽</b>
                </div>
              )}
              <div className="checkout-summary-row">
                <span>
                  {fulfillmentMethod === "pickup"
                    ? `Самовывоз (${chosenPickup.shortName})`
                    : `Доставка (${chosenZone.name})`}
                </span>
                <b>
                  {deliveryFee === 0
                    ? "Бесплатно (0 ₽)"
                    : `${deliveryFee} ₽`}
                </b>
              </div>
              <div className="checkout-summary-total">
                <div>
                  <span>К оплате</span>
                  {cartTotal > 0 && (
                    <small className="cashback-note">
                      Начислим +{bonusToEarn} бонусов Bloom Club (5%)
                    </small>
                  )}
                </div>
                <strong>
                  {cartTotal.toLocaleString("ru-RU")} ₽
                </strong>
              </div>
            </div>

            <button
              className="button button-primary wide-field"
              disabled={busy}
              type="submit"
            >
              {fulfillmentMethod === "pickup"
                ? `Оформить самовывоз (${chosenPickup.shortName})`
                : "Оформить заказ с доставкой"}{" "}
              <Icon name="arrow" size={18} />
            </button>
          </form>
        </section>

        <section className="faq-section" id="faq">
          <div className="container faq-grid">
            <div>
              <span className="section-kicker">Всё самое важное</span>
              <h2>Частые вопросы</h2>
              <p>Не нашли ответ? Напишите или позвоните нам, мы всегда на связи.</p>
              <a href="tel:+74872555555">
                <Icon name="phone" size={19} />
                +7 (4872) 55-55-55
              </a>
            </div>
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <article
                  className={
                    activeFaq === index ? "faq-item active" : "faq-item"
                  }
                  key={faq.question}
                >
                  <button
                    type="button"
                    aria-expanded={activeFaq === index}
                    onClick={() =>
                      setActiveFaq(activeFaq === index ? -1 : index)
                    }
                  >
                    <span>{faq.question}</span>
                    <Icon name="chevron" size={20} />
                  </button>
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-top">
          <a className="logo footer-logo" href="#top">
            <span className="logo-mark">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span>
              BLOOM <b>SHOP</b>
            </span>
          </a>
          <p>
            Свежие цветы, свадебная флористика и подарки с доставкой по Туле от
            30 минут и самовывозом из 3 салонов.
          </p>
          <div className="footer-links">
            <a href="#catalog">Каталог</a>
            <a
              href="#catalog"
              onClick={() => setSelectedCategory("wedding")}
            >
              Свадебные цветы
            </a>
            <a href="#constructor">Конструктор</a>
            <a href="#delivery">Карта и доставка</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 Bloom Shop · Интернет-магазин цветов и букетов</span>
          <span>Салоны в Туле: пр-т Ленина, 74 · ул. Советская, 47 · ул. Пролетарская, 2</span>
        </div>
      </footer>

      <div
        className={
          cartOpen || accountOpen ? "drawer-backdrop show" : "drawer-backdrop"
        }
        onClick={() => {
          setCartOpen(false);
          setAccountOpen(false);
        }}
      />

      <aside className={cartOpen ? "side-drawer open" : "side-drawer"}>
        <div className="drawer-header">
          <div>
            <span className="section-kicker">Ваш выбор ({cartCount} шт.)</span>
            <h2>Корзина цветов</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {cartItems.length > 0 && (
              <button
                type="button"
                className="chip-btn"
                onClick={clearCart}
                title="Очистить корзину"
              >
                Очистить
              </button>
            )}
            <button
              type="button"
              className="icon-button"
              aria-label="Закрыть корзину"
              onClick={() => setCartOpen(false)}
            >
              <Icon name="close" />
            </button>
          </div>
        </div>

        {cartItems.length > 0 && (
          <div className="cart-top-banners">
            <div className="cart-mode-pills">
              <button
                type="button"
                className={fulfillmentMethod === "delivery" ? "active" : ""}
                onClick={() => setFulfillmentMethod("delivery")}
              >
                🚚 Доставка ({deliveryFee === 0 ? "0 ₽" : `${deliveryFee} ₽`})
              </button>
              <button
                type="button"
                className={fulfillmentMethod === "pickup" ? "active" : ""}
                onClick={() => setFulfillmentMethod("pickup")}
              >
                🏪 Самовывоз (0 ₽)
              </button>
            </div>
            {fulfillmentMethod === "delivery" && chosenZone.freeFrom !== null && (
              <div className="free-delivery-bar-wrap">
                <div className="free-delivery-text">
                  {amountToFreeDelivery > 0 ? (
                    <span>
                      Добавьте ещё на <b>{amountToFreeDelivery.toLocaleString("ru-RU")} ₽</b> для бесплатной доставки
                    </span>
                  ) : (
                    <span style={{ color: "var(--sage)", fontWeight: 700 }}>
                      🎉 Бесплатная доставка курьером активирована!
                    </span>
                  )}
                </div>
                <div className="free-delivery-track">
                  <div
                    className="free-delivery-fill"
                    style={{ width: `${freeDeliveryProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="drawer-body">
          {!cartItems.length ? (
            <div className="empty-state">
              <Icon name="bag" size={34} strokeWidth={1.3} />
              <h3>Здесь пока пусто</h3>
              <p>Добавьте букет из каталога, выберите свадебную композицию или соберите свой букет.</p>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setCartOpen(false)}
              >
                Перейти к каталогу
              </button>
            </div>
          ) : (
            <>
              <div className="cart-list">
                {cartItems.map((item) => (
                  <article className="cart-item" key={item.id}>
                    <div className="cart-thumb">
                      {item.image ? (
                        <img src={item.image} alt="" />
                      ) : (
                        <Icon name="package" size={26} strokeWidth={1.4} />
                      )}
                    </div>
                    <div className="cart-item-copy">
                      <strong>{item.name}</strong>
                      {item.details && <small>{item.details}</small>}
                      <span>
                        {(item.price * item.quantity).toLocaleString("ru-RU")} ₽{" "}
                        {item.quantity > 1 && (
                          <em style={{ fontStyle: "normal", color: "var(--muted)", fontWeight: 500 }}>
                            ({item.price.toLocaleString("ru-RU")} ₽/шт.)
                          </em>
                        )}
                      </span>
                    </div>
                    <div className="cart-item-controls">
                      <div className="mini-qty">
                        <button
                          type="button"
                          aria-label={`Уменьшить количество: ${item.name}`}
                          onClick={() => updateCartItem(item.id, -1)}
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Увеличить количество: ${item.name}`}
                          onClick={() => updateCartItem(item.id, 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-remove-btn"
                        aria-label={`Удалить ${item.name}`}
                        title="Удалить из корзины"
                        onClick={() => removeCartItem(item.id)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="cart-upsell-box">
                <span className="cart-upsell-title">Приятные дополнения к букету:</span>
                <div className="cart-upsell-chips">
                  {[addons[0], addons[4], addons[7], addons[5]].map((ad) => (
                    <button
                      key={ad.id}
                      type="button"
                      className="chip-btn"
                      onClick={() =>
                        addToCart(
                          {
                            id: `addon-${ad.id}`,
                            name: ad.name,
                            price: ad.price,
                            image: ad.image,
                            details: ad.sub,
                          },
                          `${ad.name} добавлен в корзину`,
                        )
                      }
                    >
                      <img src={ad.image} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", marginRight: 6, verticalAlign: "middle" }} />
                      + {ad.name} ({ad.price} ₽)
                    </button>
                  ))}
                </div>
              </div>

              <div className="promo-box">
                <label htmlFor="promo">Промокод на скидку</label>
                <div>
                  <input
                    id="promo"
                    placeholder="BLOOM2026 / WEDDING10 / TULA500"
                    value={promoInput}
                    onChange={(event) => setPromoInput(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => applyPromoCode()}
                  >
                    Применить
                  </button>
                </div>
                <div className="promo-hints">
                  {Object.values(promoCatalog).map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      className={appliedPromoCode === p.code ? "promo-pill active" : "promo-pill"}
                      onClick={() => applyPromoCode(p.code)}
                    >
                      {p.code}
                    </button>
                  ))}
                </div>
                {activePromo && (
                  <small>✓ Активен: {activePromo.label}</small>
                )}
              </div>
            </>
          )}
        </div>
        {!!cartItems.length && (
          <div className="drawer-footer">
            <div className="price-row">
              <span>Товары ({cartCount} шт.)</span>
              <b>{subtotal.toLocaleString("ru-RU")} ₽</b>
            </div>
            {discount > 0 && (
              <div className="price-row discount-row">
                <span>Скидка по промокоду ({appliedPromoCode})</span>
                <b>−{discount.toLocaleString("ru-RU")} ₽</b>
              </div>
            )}
            {bonusUsed > 0 && (
              <div className="price-row" style={{ color: "var(--sage)" }}>
                <span>Бонусы Bloom Club</span>
                <b>−{bonusUsed.toLocaleString("ru-RU")} ₽</b>
              </div>
            )}
            <div className="price-row">
              <span>
                {fulfillmentMethod === "pickup"
                  ? `Самовывоз (${chosenPickup.shortName})`
                  : "Доставка курьером"}
              </span>
              <b>{deliveryFee === 0 ? "Бесплатно (0 ₽)" : `${deliveryFee} ₽`}</b>
            </div>
            <div className="price-row total-row">
              <div>
                <span>Итого</span>
                <small style={{ display: "block", color: "var(--sage)", fontSize: "10px" }}>
                  +{bonusToEarn} бонусов на счёт
                </small>
              </div>
              <b>{cartTotal.toLocaleString("ru-RU")} ₽</b>
            </div>
            <a
              className="button button-primary full-button"
              href="#delivery"
              onClick={() => setCartOpen(false)}
            >
              Перейти к оформлению <Icon name="arrow" size={18} />
            </a>
          </div>
        )}
      </aside>

      <aside
        className={
          accountOpen
            ? "side-drawer account-drawer open"
            : "side-drawer account-drawer"
        }
      >
        <div className="drawer-header">
          <div>
            <span className="section-kicker">Bloom club · Личный кабинет</span>
            <h2>Мой кабинет</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Закрыть личный кабинет"
            onClick={() => setAccountOpen(false)}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="account-profile">
          <div className="account-avatar">
            <Icon name="user" size={24} />
          </div>
          <div>
            <small>Карта лояльности активна · {availableBonus} бонусов</small>
            <strong>{user?.email}</strong>
          </div>
          <button
            type="button"
            aria-label="Выйти из аккаунта"
            title="Выйти из аккаунта"
            onClick={async () => {
              await supabase.auth.signOut().catch(() => {});
              setDemoSession(null);
              setUser(null);
              setAccount(null);
              setAccountOpen(false);
              setCartItems([]);
              notify("Вы вышли из личного кабинета");
            }}
          >
            <Icon name="logout" size={18} />
          </button>
        </div>

        <div className="account-tabs">
          <button
            type="button"
            className={accountTab === "orders" ? "account-tab active" : "account-tab"}
            onClick={() => setAccountTab("orders")}
          >
            Заказы ({account?.orders?.length ?? 0})
          </button>
          <button
            type="button"
            className={accountTab === "notifications" ? "account-tab active" : "account-tab"}
            onClick={() => {
              setAccountTab("notifications");
              markNotificationsRead();
            }}
          >
            🔔 Уведомления ({notifications.length})
          </button>
          <button
            type="button"
            className={accountTab === "favorites" ? "account-tab active" : "account-tab"}
            onClick={() => setAccountTab("favorites")}
          >
            ♥ Избранное ({favorites.length})
          </button>
          <button
            type="button"
            className={accountTab === "profile" ? "account-tab active" : "account-tab"}
            onClick={() => setAccountTab("profile")}
          >
            Профиль
          </button>
        </div>

        <div className="drawer-body account-body">
          {accountTab === "orders" && (
            <>
              <section className="account-section">
                <div className="account-section-title">
                  <h3>Мои заказы</h3>
                  <span>{account?.orders?.length ?? 0}</span>
                </div>
                {!account?.orders?.length ? (
                  <p className="account-empty">
                    Оформленные заказы с историей, фотоотчётом и статусом доставки появятся здесь.
                  </p>
                ) : (
                  <div className="order-list">
                    {(account?.orders || []).map((order) => {
                      const isCancelled = order.status === "Отменён";
                      const isExpanded = expandedOrderId === order.id;
                      return (
                        <article className="order-card" key={order.id}>
                          <div>
                            <strong>{order.id}</strong>
                            <span
                              className={
                                isCancelled
                                  ? "order-card-status cancelled"
                                  : "order-card-status"
                              }
                            >
                              {order.status}
                            </span>
                          </div>
                          <p>
                            {order.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                            шт. · <b>{(Number(order.total) || 0).toLocaleString("ru-RU")} ₽</b>
                            {order.bonusEarned ? (
                              <span style={{ color: "var(--sage)", marginLeft: "8px", fontSize: "11px" }}>
                                (+{order.bonusEarned} Б)
                              </span>
                            ) : null}
                          </p>

                          {!isCancelled && (
                            <div className="order-tracker">
                              <span className="step done">✓ Принят</span>
                              <span
                                className={
                                  order.status !== "Принят в работу"
                                    ? "step done"
                                    : "step active"
                                }
                              >
                                🌸 Сборка
                              </span>
                              <span
                                className={
                                  order.status.includes("Готов") ||
                                  order.status.includes("Передан") ||
                                  order.status.includes("Доставлен") ||
                                  order.status.includes("Выдан")
                                    ? "step done"
                                    : "step"
                                }
                              >
                                {order.fulfillmentMethod === "pickup"
                                  ? "🏪 В салоне"
                                  : "🚚 В пути"}
                              </span>
                            </div>
                          )}

                          <div className="order-card-meta">
                            {order.fulfillmentMethod === "pickup" ? (
                              <>
                                <div>
                                  <b>Самовывоз:</b> {order.pickupPoint || pickupPoints[0].name}
                                </div>
                                <div>
                                  <b>Забирает:</b> {order.senderName} ({order.senderPhone})
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <b>Доставка:</b> {order.address}
                                  {order.apartment
                                    ? `, кв. ${order.apartment}`
                                    : order.isPrivateHouse
                                      ? " (частный дом / у входа)"
                                      : ""}
                                </div>
                                <div>
                                  <b>Отправитель:</b>{" "}
                                  {order.isAnonymous
                                    ? "Анонимно"
                                    : `${order.senderName || "—"} (${order.senderPhone || "—"})`}
                                </div>
                                <div>
                                  <b>Получатель:</b> {order.recipientName || "—"} (
                                  {order.recipientPhone || "—"})
                                </div>
                              </>
                            )}
                            {order.date && (
                              <div>
                                <b>Время:</b> {order.date}, {order.interval}
                              </div>
                            )}
                            {order.cardNote && (
                              <div>
                                <b>Открытка:</b> «{order.cardNote}»
                              </div>
                            )}
                          </div>

                          <div className="order-card-actions">
                            <button
                              type="button"
                              className="chip-btn"
                              onClick={() =>
                                setExpandedOrderId(isExpanded ? null : order.id)
                              }
                            >
                              {isExpanded ? "Скрыть состав ▲" : `Состав заказа (${(order.items?.length ?? 0)}) ▼`}
                            </button>
                            {!isCancelled && (
                              <button
                                type="button"
                                className="chip-btn"
                                onClick={() => advanceOrderStatus(order)}
                                title="Продвинуть этап заказа и получить уведомление"
                              >
                                🔔 Следующий этап
                              </button>
                            )}
                            <button
                              type="button"
                              className="chip-btn active"
                              onClick={() => repeatOrder(order)}
                            >
                              ↻ Повторить заказ
                            </button>
                            {!isCancelled && (
                              <button
                                type="button"
                                className="chip-btn"
                                onClick={() => cancelOrder(order.id)}
                              >
                                Отменить
                              </button>
                            )}
                          </div>

                          {isExpanded && (
                            <ul className="order-items-breakdown">
                              {(order.items || []).map((it) => (
                                <li key={it.id}>
                                  <span>
                                    {it.name} × {it.quantity} шт.
                                  </span>
                                  <b>{(it.price * it.quantity).toLocaleString("ru-RU")} ₽</b>
                                </li>
                              ))}
                            </ul>
                          )}

                          <small style={{ display: "block", marginTop: "8px" }}>
                            Оформлен:{" "}
                            {new Date(order.createdAt).toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </small>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="account-section">
                <div className="account-section-title">
                  <h3>Консультации флориста</h3>
                  <span>{account?.consultations?.length ?? 0}</span>
                </div>
                {!account?.consultations?.length ? (
                  <p className="account-empty">Ваши заявки флористу появятся здесь.</p>
                ) : (
                  <div className="order-list">
                    {(account?.consultations || []).map((consultation) => (
                      <article
                        className="order-card consultation-card"
                        key={consultation.id}
                      >
                        <div>
                          <strong>{consultation.id}</strong>
                          <span className="order-card-status">
                            {consultation.status}
                          </span>
                        </div>
                        <p>
                          {consultation.name} · {consultation.phone}
                        </p>
                        {consultation.topic && (
                          <div className="order-card-meta">{consultation.topic}</div>
                        )}
                        <small>
                          {new Date(consultation.createdAt).toLocaleDateString(
                            "ru-RU",
                          )}
                        </small>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {accountTab === "notifications" && (
            <section className="account-section">
              <div className="account-section-title">
                <h3>Центр уведомлений</h3>
                <span>{notifications.length}</span>
              </div>
              {!notifications.length ? (
                <p className="account-empty">Уведомлений пока нет.</p>
              ) : (
                <div className="order-list">
                  {notifications.map((n) => (
                    <article className="order-card" key={n.id}>
                      <div>
                        <strong>{n.title}</strong>
                        <span className="order-card-status">
                          {n.category === "order"
                            ? "Заказ"
                            : n.category === "bonus"
                              ? "Бонусы"
                              : n.category === "florist"
                                ? "Флорист"
                                : "Инфо"}
                        </span>
                      </div>
                      <p style={{ color: "var(--muted)", lineHeight: 1.5 }}>
                        {n.message}
                      </p>
                      <small>
                        {new Date(n.createdAt).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {accountTab === "favorites" && (
            <section className="account-section">
              <div className="account-section-title">
                <h3>Избранные букеты</h3>
                <span>{favoriteBouquets.length}</span>
              </div>
              {!favoriteBouquets.length ? (
                <div className="account-empty">
                  <p>Вы ещё не добавили букеты в избранное.</p>
                  <button
                    type="button"
                    className="button button-primary"
                    style={{ marginTop: "10px" }}
                    onClick={() => setAccountOpen(false)}
                  >
                    Смотреть каталог
                  </button>
                </div>
              ) : (
                <div className="order-list">
                  {favoriteBouquets.map((b) => (
                    <article className="cart-item" key={b.id}>
                      <div className="cart-thumb">
                        <img src={b.image} alt={b.name} />
                      </div>
                      <div className="cart-item-copy">
                        <strong>{b.name}</strong>
                        <small>{b.composition}</small>
                        <span>{b.price.toLocaleString("ru-RU")} ₽</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <button
                          type="button"
                          className="btn-add-cart"
                          onClick={() =>
                            addToCart({
                              id: `bouquet-${b.id}`,
                              name: b.name,
                              price: b.price,
                              image: b.image,
                              details: b.description,
                            })
                          }
                        >
                          В корзину
                        </button>
                        <button
                          type="button"
                          className="chip-btn"
                          onClick={() => toggleFavorite(b.id)}
                        >
                          Убрать
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {accountTab === "profile" && (
            <section className="account-section">
              <div className="loyalty-card">
                <span className="section-kicker">Программа лояльности</span>
                <h4>Карта клиента Bloom Club</h4>
                <div className="loyalty-balance">
                  <strong>{availableBonus}</strong>
                  <span>бонусных баллов (1 Б = 1 ₽)</span>
                </div>
                <p>
                  Оплачивайте бонусами до 30% стоимости букетов и получайте 5%
                  кэшбэк с каждого заказа.
                </p>
              </div>

              <form className="profile-form" onSubmit={saveProfile}>
                <h4>Личные данные и адрес для быстрого заказа</h4>
                <label>
                  <span>Ваше имя</span>
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Иван Петров"
                  />
                </label>
                <label>
                  <span>Телефон</span>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+7 (999) 123-45-67"
                  />
                </label>
                <label>
                  <span>Основной адрес доставки в Туле</span>
                  <input
                    value={profileAddress}
                    onChange={(e) => setProfileAddress(e.target.value)}
                    placeholder="г. Тула, ул. Советская, д. 47"
                  />
                </label>
                <label>
                  <span>Квартира / офис</span>
                  <input
                    value={profileApartment}
                    onChange={(e) => setProfileApartment(e.target.value)}
                    placeholder="42"
                  />
                </label>
                <button
                  type="submit"
                  className="button button-primary full-button"
                  disabled={busy}
                >
                  Сохранить данные профиля
                </button>
              </form>
            </section>
          )}
        </div>
      </aside>

      {confirmedOrder && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setConfirmedOrder(null)}
        >
          <div
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="icon-button modal-close"
              aria-label="Закрыть окно подтверждения"
              onClick={() => setConfirmedOrder(null)}
            >
              <Icon name="close" />
            </button>
            <div className="auth-mark" style={{ background: "var(--sage-light)", color: "var(--sage)" }}>
              <Icon name="check" size={28} strokeWidth={2.2} />
            </div>
            <span className="section-kicker">Спасибо за заказ!</span>
            <h2>Заказ {confirmedOrder.id} принят</h2>
            <p>
              Мы уже передали ваш заказ флористу. Перед выдачей или отправкой
              курьера мы пришлём фото готового букета на{" "}
              <b>{confirmedOrder.senderEmail}</b> и в Центр уведомлений.
            </p>
            <div className="demo-code-banner" style={{ textAlign: "left" }}>
              <div>
                <strong>Способ получения:</strong>{" "}
                {confirmedOrder.fulfillmentMethod === "pickup"
                  ? `Самовывоз (${confirmedOrder.pickupPoint})`
                  : `Доставка курьером (${confirmedOrder.address}${confirmedOrder.apartment ? `, кв. ${confirmedOrder.apartment}` : ""})`}
              </div>
              <div>
                <strong>Дата и время:</strong> {confirmedOrder.date},{" "}
                {confirmedOrder.interval}
              </div>
              <div>
                <strong>Итого к оплате:</strong>{" "}
                {confirmedOrder.total.toLocaleString("ru-RU")} ₽
                {confirmedOrder.bonusEarned
                  ? ` (+${confirmedOrder.bonusEarned} бонусов начислено)`
                  : ""}
              </div>
            </div>
            <div className="auth-secondary-actions">
              <button
                type="button"
                className="button button-primary full-button"
                onClick={() => {
                  setConfirmedOrder(null);
                  setAccountTab("orders");
                  setAccountOpen(true);
                }}
              >
                Отследить заказ в личном кабинете
              </button>
              <button
                type="button"
                className="button button-ghost full-button"
                onClick={() => setConfirmedOrder(null)}
              >
                Продолжить покупки
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedBouquetModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setSelectedBouquetModal(null)}
        >
          <div
            className="product-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="icon-button modal-close"
              aria-label="Закрыть карточку букета"
              onClick={() => setSelectedBouquetModal(null)}
            >
              <Icon name="close" />
            </button>
            <div className="product-modal-grid">
              <img
                src={selectedBouquetModal.image}
                alt={selectedBouquetModal.name}
              />
              <div>
                <span className="section-kicker">{selectedBouquetModal.tag}</span>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", margin: "6px 0 10px" }}>
                  {selectedBouquetModal.name}
                </h2>
                <p style={{ color: "var(--muted)", fontSize: "13px", lineHeight: 1.6 }}>
                  {selectedBouquetModal.description}
                </p>
                <p style={{ fontSize: "12px", marginTop: "10px" }}>
                  <strong>Состав:</strong> {selectedBouquetModal.composition}
                </p>
                <p style={{ fontSize: "12px" }}>
                  <strong>Размер:</strong> {selectedBouquetModal.size} ({selectedBouquetModal.stems} стеблей) · ★ {selectedBouquetModal.rating.toFixed(1)}
                </p>
                <p style={{ fontSize: "12px", color: "var(--sage)" }}>
                  <strong>Наличие в Туле:</strong> Доступен для доставки за 30 мин и самовывоза во всех 3 салонах
                </p>
                <div style={{ margin: "14px 0" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>
                    Выберите упаковку для этого букета:
                  </label>
                  <select
                    value={modalPackagingId}
                    onChange={(e) => setModalPackagingId(e.target.value)}
                    style={{
                      width: "100%",
                      height: "42px",
                      padding: "0 12px",
                      border: "1px solid var(--input-border)",
                      borderRadius: "6px",
                      background: "var(--input-bg)",
                      fontSize: "12px",
                    }}
                  >
                    {packagingOptions.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} (+{pkg.price} ₽)
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="button button-primary full-button"
                  onClick={() => {
                    const pkg =
                      packagingOptions.find((p) => p.id === modalPackagingId) ||
                      packagingOptions[0];
                    addToCart(
                      {
                        id: `bouquet-${selectedBouquetModal.id}-${pkg.id}`,
                        name: `${selectedBouquetModal.name} (${pkg.name})`,
                        price: selectedBouquetModal.price + pkg.price,
                        image: selectedBouquetModal.image,
                        details: `${selectedBouquetModal.composition} · Упаковка: ${pkg.name}`,
                      },
                      `Букет «${selectedBouquetModal.name}» добавлен в корзину`,
                    );
                    setSelectedBouquetModal(null);
                  }}
                >
                  В корзину за{" "}
                  {(
                    selectedBouquetModal.price +
                    (packagingOptions.find((p) => p.id === modalPackagingId)
                      ?.price || 0)
                  ).toLocaleString("ru-RU")}{" "}
                  ₽
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {authOpen && (
        <div className="modal-backdrop" onMouseDown={() => setAuthOpen(false)}>
          <div
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="icon-button modal-close"
              aria-label="Закрыть окно входа"
              onClick={() => setAuthOpen(false)}
            >
              <Icon name="close" />
            </button>
            <div className="auth-mark">
              <Icon name="mail" size={26} strokeWidth={1.5} />
            </div>
            {authSent ? (
              <>
                <span className="section-kicker">Подтверждение входа</span>
                <h2 id="auth-title">Введите код из письма</h2>
                <p>
                  Мы отправили одноразовый код на{" "}
                  <b>{authEmail || "вашу почту"}</b>. Введите пришедший код
                  ниже, чтобы войти в личный кабинет.
                </p>
                <div className="demo-code-banner">
                  💡 <strong>Пришёл код на почту?</strong> Введите его в поле
                  ниже (или используйте код подтверждения <strong>123456</strong>).
                </div>
                <form onSubmit={verifyOtpCode}>
                  <label>
                    <span>Email аккаунта</span>
                    <input
                      required
                      type="email"
                      placeholder="name@example.ru"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Код подтверждения из письма</span>
                    <input
                      required
                      autoFocus
                      className="otp-field"
                      placeholder="123456"
                      maxLength={8}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                    />
                  </label>
                  <button
                    className="button button-primary full-button"
                    disabled={busy}
                    type="submit"
                  >
                    {busy ? "Проверяем код..." : "Подтвердить код и войти"}
                  </button>
                </form>
                <div className="auth-secondary-actions">
                  <button
                    type="button"
                    className="button button-ghost full-button"
                    onClick={() => setOtpCode("123456")}
                  >
                    Подставить код 123456
                  </button>
                  <button
                    type="button"
                    className="chip-btn"
                    onClick={() => setAuthSent(false)}
                  >
                    ← Отправить код повторно на другой email
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="section-kicker">Личный кабинет · +500 бонусов</span>
                <h2 id="auth-title">Войти по email</h2>
                <p>
                  Корзина, 500 приветственных бонусов, уведомления о доставке и
                  избранные букеты привязываются к вашей почте.
                </p>
                <form onSubmit={sendMagicLink}>
                  <label>
                    <span>Ваш Email</span>
                    <input
                      required
                      autoFocus
                      type="email"
                      placeholder="name@example.ru"
                      value={authEmail}
                      onChange={(event) => setAuthEmail(event.target.value)}
                    />
                  </label>
                  <button
                    className="button button-primary full-button"
                    disabled={busy}
                    type="submit"
                  >
                    {busy ? "Отправляем..." : "Получить код на почту"}
                  </button>
                </form>
                <div className="auth-secondary-actions">
                  <button
                    type="button"
                    className="button button-ghost full-button"
                    onClick={() => setAuthSent(true)}
                  >
                    Уже есть код подтверждения? Ввести код
                  </button>
                  <button
                    type="button"
                    className="chip-btn"
                    onClick={quickDemoLogin}
                  >
                    ⚡ Быстрый вход в 1 клик (профиль покупателя)
                  </button>
                </div>
                <small className="auth-legal">
                  Продолжая, вы соглашаетесь на обработку email для работы
                  личного кабинета и начисления бонусов Bloom Club.
                </small>
              </>
            )}
          </div>
        </div>
      )}

      <a
        href="#top"
        className="scroll-top-btn"
        aria-label="Переместиться вверх на главную страницу"
        title="Наверх — к началу главной страницы"
      >
        <span className="scroll-top-arrow">↑</span>
        <span className="scroll-top-label">Наверх</span>
      </a>

      <div className={toast ? "toast show" : "toast"} aria-live="polite">
        <span>✓</span>
        {toast}
      </div>
    </div>
  );
}

export default App;

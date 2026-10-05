import { FormEvent, ReactNode, useMemo, useState } from "react";

type FlowerId = "rose" | "peony" | "tulip";

const bouquets = [
  {
    name: "Розовый бриз",
    description: "Французские розы, пионы, эвкалипт",
    price: 3500,
    image:
      "https://images.unsplash.com/photo-1523693916903-027d144a2b7d?auto=format&fit=crop&w=900&q=85",
    tag: "Бестселлер",
  },
  {
    name: "Солнечный микс",
    description: "Герберы, кустовые хризантемы",
    price: 2800,
    image:
      "https://images.unsplash.com/photo-1644248423441-bc7c5dcebeb6?auto=format&fit=crop&w=900&q=85",
    tag: "Новинка",
  },
  {
    name: "Элегия",
    description: "Белые эквадорские розы, гипсофила",
    price: 6200,
    image:
      "https://images.unsplash.com/photo-1652346072098-cfc2e94d30e7?auto=format&fit=crop&w=900&q=85",
    tag: "Свадебный",
  },
];

const flowers: {
  id: FlowerId;
  name: string;
  price: number;
  image: string;
}[] = [
  {
    id: "rose",
    name: "Розы",
    price: 250,
    image:
      "https://images.unsplash.com/photo-1523693916903-027d144a2b7d?auto=format&fit=crop&w=160&q=80",
  },
  {
    id: "peony",
    name: "Пионы",
    price: 350,
    image:
      "https://images.unsplash.com/photo-1623406795110-99f1c4325084?auto=format&fit=crop&w=160&q=80",
  },
  {
    id: "tulip",
    name: "Тюльпаны",
    price: 180,
    image:
      "https://images.unsplash.com/photo-1644248422980-8e0eb75a1557?auto=format&fit=crop&w=160&q=80",
  },
];

const addons = [
  { name: "Открытка «С любовью»", price: 150, icon: "card" },
  { name: "Мишка 20 см", price: 800, icon: "gift" },
  { name: "Пышный бант", price: 250, icon: "bow" },
];

const faqs = [
  {
    question: "Как быстро осуществляется доставка по Туле?",
    answer:
      "Доставка осуществляется от 30 минут с момента подтверждения и сборки букета.",
  },
  {
    question: "Можно ли добавить анонимную записку к букету?",
    answer:
      "Да, при оформлении заказа вы можете указать текст записки и выбрать анонимную доставку.",
  },
  {
    question: "Что делать, если букет не понравился получателю?",
    answer:
      "Мы гарантируем свежесть цветов. Если качество композиции вас не устроит, заменим букет в течение 24 часов.",
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
      {paths[name]}
    </svg>
  );
}

function App() {
  const [cartCount, setCartCount] = useState(0);
  const [quantities, setQuantities] = useState<Record<FlowerId, number>>({
    rose: 11,
    peony: 5,
    tulip: 0,
  });
  const [packaging, setPackaging] = useState(200);
  const [activeFaq, setActiveFaq] = useState(0);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const flowerTotal = useMemo(
    () =>
      flowers.reduce(
        (sum, flower) => sum + quantities[flower.id] * flower.price,
        0,
      ),
    [quantities],
  );

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const addToCart = (message = "Букет добавлен в корзину") => {
    setCartCount((count) => count + 1);
    notify(message);
  };

  const submitForm = (event: FormEvent, message: string) => {
    event.preventDefault();
    notify(message);
  };

  return (
    <div className="site-shell">
      <header className="header">
        <div className="container header-inner">
          <a className="logo" href="#top" aria-label="Bloom shop — на главную">
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
          <nav className={menuOpen ? "nav nav-open" : "nav"}>
            <a href="#catalog" onClick={() => setMenuOpen(false)}>
              Каталог
            </a>
            <a href="#constructor" onClick={() => setMenuOpen(false)}>
              Конструктор
            </a>
            <a href="#florist" onClick={() => setMenuOpen(false)}>
              Флорист
            </a>
            <a href="#delivery" onClick={() => setMenuOpen(false)}>
              Доставка
            </a>
          </nav>
          <div className="header-actions">
            <button className="cart-button" onClick={() => notify("Корзина пока пуста")}>
              <Icon name="bag" size={19} />
              <span>Корзина</span>
              <b>{cartCount}</b>
            </button>
            <button
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
              Доставка по Туле от 30 минут
            </div>
            <h1>
              Цветы, которые
              <br />
              говорят <em>за вас</em>
            </h1>
            <p>
              Собираем авторские букеты из свежих цветов и доставляем важные
              эмоции точно в срок.
            </p>
            <div className="hero-promo">
              <span>−15%</span>
              <p>
                на первый заказ
                <small>по промокоду BLOOM2026</small>
              </p>
            </div>
            <div className="hero-buttons">
              <a className="button button-primary" href="#catalog">
                Выбрать букет <Icon name="arrow" size={18} />
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
                <Icon name="heart" size={17} /> Свежесть 7 дней
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-blob" />
            <img
              src="https://images.unsplash.com/photo-1644248422980-8e0eb75a1557?auto=format&fit=crop&w=1200&q=90"
              alt="Нежный букет в розовой упаковке"
            />
            <div className="floating-note">
              <span>4,9</span>
              <p>
                Оценка покупателей
                <small>более 500 отзывов</small>
              </p>
            </div>
          </div>
        </section>

        <section className="container section" id="catalog">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Выбор наших флористов</span>
              <h2>Букеты для особого момента</h2>
            </div>
            <a href="#constructor">
              Собрать индивидуальный <Icon name="arrow" size={18} />
            </a>
          </div>
          <div className="catalog-grid">
            {bouquets.map((bouquet) => (
              <article className="product-card" key={bouquet.name}>
                <div className="product-image">
                  <img src={bouquet.image} alt={`Букет «${bouquet.name}»`} />
                  <span>{bouquet.tag}</span>
                  <button aria-label="Добавить в избранное">
                    <Icon name="heart" size={19} />
                  </button>
                </div>
                <div className="product-content">
                  <h3>{bouquet.name}</h3>
                  <p>{bouquet.description}</p>
                  <div className="product-footer">
                    <strong>{bouquet.price.toLocaleString("ru-RU")} ₽</strong>
                    <button onClick={() => addToCart()}>
                      В корзину <Icon name="bag" size={17} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="constructor-section" id="constructor">
          <div className="container">
            <div className="section-heading light-heading">
              <div>
                <span className="section-kicker">Создайте свой букет</span>
                <h2>Соберите композицию мечты</h2>
              </div>
              <p>
                Выберите цветы и количество — мы бережно соберём вашу
                уникальную композицию.
              </p>
            </div>
            <div className="constructor-grid">
              <div className="flower-selector">
                <h3>1. Выберите цветы</h3>
                {flowers.map((flower) => (
                  <div className="flower-row" key={flower.id}>
                    <img src={flower.image} alt="" />
                    <div className="flower-name">
                      <strong>{flower.name}</strong>
                      <span>{flower.price} ₽ / шт.</span>
                    </div>
                    <div className="qty-control">
                      <button
                        aria-label={`Уменьшить количество: ${flower.name}`}
                        onClick={() =>
                          setQuantities((current) => ({
                            ...current,
                            [flower.id]: Math.max(0, current[flower.id] - 1),
                          }))
                        }
                      >
                        −
                      </button>
                      <span>{quantities[flower.id]}</span>
                      <button
                        aria-label={`Увеличить количество: ${flower.name}`}
                        onClick={() =>
                          setQuantities((current) => ({
                            ...current,
                            [flower.id]: current[flower.id] + 1,
                          }))
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bouquet-summary">
                <div>
                  <span className="summary-label">Ваш букет</span>
                  <h3>Индивидуальная композиция</h3>
                  <ul>
                    {flowers.map(
                      (flower) =>
                        quantities[flower.id] > 0 && (
                          <li key={flower.id}>
                            <span>
                              {flower.name}, {quantities[flower.id]} шт.
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
                  </ul>
                </div>
                <div>
                  <div className="summary-total">
                    <span>Стоимость цветов</span>
                    <strong>{flowerTotal.toLocaleString("ru-RU")} ₽</strong>
                  </div>
                  <button
                    className="button button-primary full-button"
                    disabled={flowerTotal === 0}
                    onClick={() => addToCart("Ваш букет добавлен в корзину")}
                  >
                    Добавить в корзину <Icon name="arrow" size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container section extras-section">
          <div className="section-heading compact-heading">
            <div>
              <span className="section-kicker">Финальные штрихи</span>
              <h2>Упаковка и дополнения</h2>
            </div>
          </div>
          <div className="extras-grid">
            <div className="packaging-panel">
              <h3>2. Выберите упаковку</h3>
              {[
                ["Крафтовая бумага", 200],
                ["Подарочная коробка", 500],
                ["Атласная лента", 100],
              ].map(([name, price]) => (
                <label
                  className={
                    packaging === price ? "package-option active" : "package-option"
                  }
                  key={name}
                >
                  <input
                    checked={packaging === price}
                    name="package"
                    type="radio"
                    onChange={() => setPackaging(Number(price))}
                  />
                  <span className="custom-radio" />
                  <b>{name}</b>
                  <small>+{price} ₽</small>
                </label>
              ))}
            </div>
            <div className="addons-panel">
              <h3>3. Добавьте к букету</h3>
              <div className="addons-list">
                {addons.map((addon) => (
                  <article className="addon-card" key={addon.name}>
                    <div className="addon-icon">
                      <Icon name={addon.icon} size={30} strokeWidth={1.5} />
                    </div>
                    <div>
                      <strong>{addon.name}</strong>
                      <span>{addon.price} ₽</span>
                    </div>
                    <button
                      aria-label={`Добавить: ${addon.name}`}
                      onClick={() => addToCart(`${addon.name} добавлен в корзину`)}
                    >
                      +
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="service-section" id="florist">
          <div className="container service-grid">
            <div className="florist-visual">
              <img
                src="https://images.unsplash.com/photo-1667010723263-8ad9a8f5f6c6?auto=format&fit=crop&w=900&q=85"
                alt="Флорист держит авторский букет"
              />
              <div className="visual-caption">
                <Icon name="sparkle" size={22} />
                <span>
                  <b>Персональный подход</b>
                  Учтём повод, стиль и ваши пожелания
                </span>
              </div>
            </div>
            <div className="service-copy">
              <span className="section-kicker">Услуги флориста</span>
              <h2>Доверьте важный момент профессионалу</h2>
              <p>
                Создадим индивидуальный дизайн свадебного букета, оформим
                праздник или интерьер. Первая консультация — бесплатно.
              </p>
              <form
                className="consult-form"
                onSubmit={(event) =>
                  submitForm(event, "Заявка отправлена. Скоро мы вам позвоним")
                }
              >
                <label>
                  <span>Ваше имя</span>
                  <input required placeholder="Анна" />
                </label>
                <label>
                  <span>Номер телефона</span>
                  <input required placeholder="+7 (___) ___-__-__" type="tel" />
                </label>
                <button className="button button-dark" type="submit">
                  Заказать консультацию <Icon name="arrow" size={18} />
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="container section delivery-section" id="delivery">
          <div className="delivery-intro">
            <span className="section-kicker">Бережно и вовремя</span>
            <h2>Доставка по Туле</h2>
            <p>
              Перед отправкой пришлём фото готового букета. Курьер доставит его
              в аквабоксе — цветы останутся свежими.
            </p>
            <div className="delivery-benefits">
              <span>
                <Icon name="truck" size={22} />
                <b>от 30 минут</b>
                по городу
              </span>
              <span>
                <Icon name="clock" size={22} />
                <b>ежедневно</b>
                с 08:00 до 22:00
              </span>
            </div>
          </div>
          <form
            className="delivery-form"
            onSubmit={(event) =>
              submitForm(event, "Заказ принят в обработку")
            }
          >
            <h3>Оформить доставку</h3>
            <label className="wide-field">
              <span>Адрес доставки в Туле</span>
              <input required placeholder="Улица, дом, квартира" />
            </label>
            <label>
              <span>Дата доставки</span>
              <input required type="date" />
            </label>
            <label>
              <span>Интервал времени</span>
              <select defaultValue="express">
                <option value="express">Срочная — 30 минут</option>
                <option>09:00 — 12:00</option>
                <option>12:00 — 15:00</option>
                <option>18:00 — 21:00</option>
              </select>
            </label>
            <button className="button button-primary wide-field" type="submit">
              Оформить и оплатить заказ <Icon name="arrow" size={18} />
            </button>
          </form>
        </section>

        <section className="faq-section" id="faq">
          <div className="container faq-grid">
            <div>
              <span className="section-kicker">Всё самое важное</span>
              <h2>Частые вопросы</h2>
              <p>
                Не нашли ответ? Напишите нам, мы всегда на связи.
              </p>
              <a href="tel:+74872555555">
                <Icon name="phone" size={19} />
                +7 (4872) 55-55-55
              </a>
            </div>
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <article
                  className={activeFaq === index ? "faq-item active" : "faq-item"}
                  key={faq.question}
                >
                  <button
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
          <p>Свежие цветы и важные эмоции с доставкой по Туле.</p>
          <div className="footer-links">
            <a href="#catalog">Каталог</a>
            <a href="#constructor">Конструктор</a>
            <a href="#delivery">Доставка</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 Bloom Shop</span>
          <span>Тула, проспект Ленина, 74</span>
        </div>
      </footer>

      <div className={toast ? "toast show" : "toast"} aria-live="polite">
        <span>✓</span>
        {toast}
      </div>
    </div>
  );
}

export default App;

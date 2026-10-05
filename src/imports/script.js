// Данные о ценах и количестве цветов
const prices = { rose: 250, peony: 350, tulip: 180 };
const quantities = { rose: 11, peony: 5, tulip: 0 };
let cartCount = 0;

// Изменение количества цветов в конструкторе
function changeQty(flower, delta) {
    const chk = document.getElementById(`chk-${flower}`);
    if (chk && !chk.checked) {
        chk.checked = true;
    }

    quantities[flower] = Math.max(0, quantities[flower] + delta);
    const qtyElement = document.getElementById(`qty-${flower}`);
    if (qtyElement) {
        qtyElement.innerText = quantities[flower];
    }
    
    updateConstructor();
}

// Обновление итоговых данных конструктора
function updateConstructor() {
    let total = 0;
    const listEl = document.getElementById('summary-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';

    const flowers = [
        { id: 'rose', name: 'Розы', price: prices.rose },
        { id: 'peony', name: 'Пионы', price: prices.peony },
        { id: 'tulip', name: 'Тюльпаны', price: prices.tulip }
    ];

    flowers.forEach(f => {
        const chk = document.getElementById(`chk-${f.id}`);
        const isChecked = chk ? chk.checked : false;
        const qty = quantities[f.id];

        if (isChecked && qty > 0) {
            const itemTotal = qty * f.price;
            total += itemTotal;
            
            const li = document.createElement('li');
            li.innerText = `• ${f.name}: ${qty} шт x ${f.price} ₽ = ${itemTotal.toLocaleString()} ₽`;
            listEl.appendChild(li);
        }
    });

    if (listEl.children.length === 0) {
        listEl.innerHTML = '<li style="color: #9CA3AF;">Цветы не выбраны</li>';
    }

    const totalEl = document.getElementById('constructor-total');
    if (totalEl) {
        totalEl.innerText = `${total.toLocaleString()} ₽`;
    }
}

// Добавление в корзину
function addToCart() {
    cartCount++;
    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) {
        cartCountEl.innerText = cartCount;
    }
    alert('Товар успешно добавлен в корзину!');
}

// Раскрытие FAQ
function toggleFaq(element) {
    element.classList.toggle('active');
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    updateConstructor();

    const floristForm = document.getElementById('floristForm');
    if (floristForm) {
        floristForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Заявка отправлена флористу!');
        });
    }
});
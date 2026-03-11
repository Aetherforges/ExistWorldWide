let products = []
let cart = []

const elements = {
  products: document.getElementById("products"),
  emptyState: document.getElementById("emptyState"),
  categoryFilter: document.getElementById("categoryFilter"),
  cartPanel: document.getElementById("cartPanel"),
  cartBadge: document.getElementById("cartBadge"),
  cartItems: document.getElementById("cartItems"),
  cartTotal: document.getElementById("cartTotal"),
  toast: document.getElementById("toast"),
  infoModal: document.getElementById("infoModal"),
  orderModal: document.getElementById("orderModal"),
  orderText: document.getElementById("orderText"),
  orderName: document.getElementById("orderName"),
  orderPhone: document.getElementById("orderPhone"),
  orderAddress: document.getElementById("orderAddress"),
}

const orderDetails = {
  name: "",
  phone: "",
  address: "",
}

function showToast(message, variant = "default") {
  if (!elements.toast) return
  elements.toast.textContent = message
  elements.toast.dataset.variant = variant
  elements.toast.classList.add("show")
  window.clearTimeout(elements.toast._timeout)
  elements.toast._timeout = window.setTimeout(() => {
    elements.toast.classList.remove("show")
  }, 2800)
}

async function loadProducts() {
  try {
    const res = await fetch("/products")
    products = await res.json()
  } catch (err) {
    console.error(err)
    showToast("Unable to load products", "error")
    products = []
  }

  renderProducts()
  updateCart()
}

function renderProducts() {
  if (!elements.products) return

  const filter = elements.categoryFilter?.value || "all"
  const visible = products.filter((p) => filter === "all" || p.category === filter)

  const existingCards = Array.from(elements.products.querySelectorAll(".product.visible"))
  existingCards.forEach((card) => card.classList.add("fade-out"))

  const rebuild = () => {
    elements.products.innerHTML = ""

    if (!visible.length) {
      elements.emptyState?.removeAttribute("hidden")
      return
    }
    elements.emptyState?.setAttribute("hidden", "")

    visible.forEach((product) => {
      const card = document.createElement("article")
      card.className = "product"

      const imgSrc = (product.images && product.images[0]) || "https://via.placeholder.com/400x300?text=No+Image"

      card.innerHTML = `
        <div class="product-image">
          <img src="${imgSrc}" alt="${product.name}" loading="lazy" />
        </div>
        <div class="product-body">
          <h3>${product.name}</h3>
          <p class="category">${product.category}</p>
          <p class="price">₱${product.price.toFixed(2)}</p>
          <div class="actions">
            <button class="add" onclick="addToCart('${product.id}')">Add to cart</button>
          </div>
        </div>
      `

      elements.products.appendChild(card)

      requestAnimationFrame(() => {
        card.classList.add("visible")
      })
    })
  }

  if (existingCards.length) {
    setTimeout(rebuild, 220)
  } else {
    rebuild()
  }
}

function filterProducts() {
  if (!elements.products) return

  elements.products.classList.add("fading")
  window.setTimeout(() => {
    renderProducts()
    elements.products.classList.remove("fading")
  }, 180)
}

function findCartItem(productId) {
  return cart.find((item) => item.id === productId)
}

function addToCart(productId) {
  const product = products.find((p) => p.id === productId)
  if (!product) return

  const item = findCartItem(productId)
  if (item) {
    item.qty += 1
  } else {
    cart.push({ id: productId, name: product.name, price: product.price, qty: 1 })
  }

  updateCart()
  showToast(`Added "${product.name}" to cart`, "success")
}

function removeFromCart(productId) {
  const item = findCartItem(productId)
  if (!item) return

  item.qty -= 1
  if (item.qty <= 0) {
    cart = cart.filter((i) => i.id !== productId)
  }

  updateCart()
}

function updateCart() {
  if (!elements.cartItems) return

  elements.cartItems.innerHTML = ""
  let total = 0

  cart.forEach((item) => {
    const row = document.createElement("div")
    row.className = "cart-row"
    row.innerHTML = `
      <div class="cart-item-controls">
        <button class="cart-adjust" data-id="${item.id}" data-action="dec">–</button>
        <input class="cart-qty" type="number" min="1" value="${item.qty}" data-id="${item.id}" />
        <button class="cart-adjust" data-id="${item.id}" data-action="inc">+</button>
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-qty">Qty: ${item.qty}</div>
      </div>
      <div class="cart-item-price">₱${(item.price * item.qty).toFixed(2)}</div>
    `

    row.querySelectorAll("button.cart-adjust").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action
        if (action === "inc") addToCart(item.id)
        else removeFromCart(item.id)
      })
    })

    row.querySelectorAll("input.cart-qty").forEach((input) => {
      input.addEventListener("input", () => {
        const newQty = Number(input.value)
        if (!newQty || newQty < 1) return
        const cartItem = findCartItem(item.id)
        if (!cartItem) return
        cartItem.qty = newQty
        updateCart()
      })
    })

    elements.cartItems.appendChild(row)
    total += item.price * item.qty
  })

  elements.cartTotal.textContent = `₱${total.toFixed(2)}`
  elements.cartBadge.textContent = cart.reduce((acc, item) => acc + item.qty, 0)
}

function toggleCart() {
  elements.cartPanel.classList.toggle("open")
}

function getOrderText() {
  const lines = []
  lines.push(`Name: ${orderDetails.name}`)
  lines.push(`Phone number: ${orderDetails.phone}`)
  lines.push(`Shipping Address: ${orderDetails.address}`)
  lines.push("------------------------------------------")
  lines.push("ITEM NAME                     QTY     PRICE")
  lines.push("")

  let totalQty = 0
  let totalPrice = 0

  cart.forEach((item) => {
    const name = item.name.slice(0, 22).padEnd(22)
    const qty = String(item.qty).padStart(3)
    const price = `₱${(item.price * item.qty).toFixed(2)}`.padStart(10)
    lines.push(`${name}  ${qty}  ${price}`)

    totalQty += item.qty
    totalPrice += item.price * item.qty
  })

  lines.push("")
  lines.push(`TOTAL ITEM QTY : ${totalQty}`)
  lines.push(`TOTAL PRICE     : ₱${totalPrice.toFixed(2)}`)
  return lines.join("\n")
}

function showInfoModal() {
  if (!elements.infoModal) return
  elements.infoModal.classList.remove("hidden")
}

function hideInfoModal() {
  elements.infoModal?.classList.add("hidden")
}

function showOrderModal() {
  if (!elements.orderModal || !elements.orderText) return
  elements.orderText.value = getOrderText()
  elements.orderModal.classList.remove("hidden")
}

function hideOrderModal() {
  elements.orderModal?.classList.add("hidden")
}

function copyOrderText() {
  if (!elements.orderText) return
  navigator.clipboard
    .writeText(elements.orderText.value)
    .then(() => showToast("Order copied to clipboard", "success"))
    .catch(() => showToast("Unable to copy order", "error"))
}

function submitOrderDetails() {
  const name = elements.orderName?.value?.trim() || ""
  const phone = elements.orderPhone?.value?.trim() || ""
  const address = elements.orderAddress?.value?.trim() || ""

  if (!name || !phone || !address) {
    showToast("Please fill in all fields", "warning")
    return
  }

  orderDetails.name = name
  orderDetails.phone = phone
  orderDetails.address = address

  hideInfoModal()
  showOrderModal()

  // Record order server-side for admin analytics (non-blocking)
  recordOrder({
    name,
    phone,
    address,
    items: cart.map((item) => ({ id: item.id, name: item.name, qty: item.qty, price: item.price })),
    total: cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    shippingCost: 0,
  })
}

function recordOrder(order) {
  fetch("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  }).catch(() => {
    // ignore errors; this endpoint is for analytics only
  })
}

function checkout() {
  if (!cart.length) {
    showToast("Your cart is empty.", "warning")
    return
  }

  showInfoModal()
}

function hideIntro() {
  const overlay = document.getElementById("introOverlay")
  if (!overlay) return
  overlay.classList.add("hidden")
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function showTermsModal() {
  const modal = document.getElementById("termsModal")
  if (!modal) return
  modal.classList.remove("hidden")
}

function hideTermsModal() {
  const modal = document.getElementById("termsModal")
  if (!modal) return
  modal.classList.add("hidden")
}

function setupIntroLinks() {
  document.getElementById("introShopNow")?.addEventListener("click", hideIntro)
  document.getElementById("introScrollDown")?.addEventListener("click", () => {
    hideIntro()
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
  })
  document.getElementById("brandLink")?.addEventListener("click", (event) => {
    event.preventDefault()
    hideIntro()
  })
  document.getElementById("termsLink")?.addEventListener("click", showTermsModal)
}

function initializeApp() {
  loadProducts()
  setupIntroLinks()

  // Keep store updated periodically (e.g., after new products are added)
  setInterval(loadProducts, 15000)
}

window.addEventListener("DOMContentLoaded", initializeApp)

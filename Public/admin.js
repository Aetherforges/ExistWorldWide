const loginForm = document.getElementById("loginForm")
const productForm = document.getElementById("productForm")
const productsContainer = document.getElementById("products")
const hotProductsContainer = document.getElementById("hotProducts")
const shippingCostInput = document.getElementById("shippingCost")
const calcResults = document.getElementById("calcResults")
const loginMessage = document.getElementById("loginMessage")
const formMessage = document.getElementById("formMessage")
const loginSection = document.getElementById("loginSection")
const adminSection = document.getElementById("adminSection")
const logoutBtn = document.getElementById("logoutBtn")

function showMessage(el, text, type = "info") {
  if (!el) return
  el.textContent = text
  el.dataset.type = type
  el.style.display = "block"
}

function clearMessage(el) {
  if (!el) return
  el.textContent = ""
  el.style.display = "none"
}

function setLoggedInState(loggedIn) {
  if (loggedIn) {
    loginSection.hidden = true
    adminSection.hidden = false
    logoutBtn.style.display = "inline-flex"
    refreshAdminData()
  } else {
    loginSection.hidden = false
    adminSection.hidden = true
    logoutBtn.style.display = "none"
  }
}

async function refreshAdminData() {
  const [products, orders] = await Promise.all([loadProducts(), loadOrders()])
  updateHotProducts(products, orders)
  updateCalculator(products, orders)
}

function getAuthToken() {
  return window.localStorage.getItem("adminToken")
}

function getAuthHeaders() {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function checkAuth() {
  try {
    const res = await fetch("/admin/status", {
      headers: getAuthHeaders(),
      credentials: "include",
    })
    const body = await res.json()
    setLoggedInState(body.loggedIn)
  } catch (err) {
    console.error(err)
    window.localStorage.removeItem("adminToken")
    setLoggedInState(false)
  }
}

async function login(credentials) {
  try {
    const res = await fetch("/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      credentials: "include",
    })
    const body = await res.json()
    if (!res.ok) {
      showMessage(loginMessage, body.error || "Invalid credentials", "error")
      return
    }

    if (body.token) {
      window.localStorage.setItem("adminToken", body.token)
    }

    setLoggedInState(true)
    clearMessage(loginMessage)
  } catch (err) {
    console.error(err)
    showMessage(loginMessage, "Unable to reach server", "error")
  }
}

async function logout() {
  try {
    await fetch("/admin/logout", {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
    })
  } catch {
    // ignore
  }
  window.localStorage.removeItem("adminToken")
  setLoggedInState(false)
}

async function loadProducts() {
  if (!adminSection || adminSection.hidden) return

  try {
    const res = await fetch("/admin/products")
    if (!res.ok) throw new Error("Failed to load")
    const products = await res.json()
    renderProducts(products)
  } catch (err) {
    productsContainer.innerHTML = `<div class="error">Unable to load products.</div>`
    console.error(err)
  }
}

function renderProducts(products) {
  if (!products.length) {
    productsContainer.innerHTML = `<div class="empty">No products yet. Add one using the form.</div>`
    return
  }

  productsContainer.innerHTML = products
    .map((p) => {
      const img = p.images && p.images.length ? p.images[0] : "https://via.placeholder.com/240x160?text=No+Image"
      return `
        <div class="admin-card">
          <div class="admin-card-image">
            <img src="${img}" alt="${p.name}" />
          </div>
          <div class="admin-card-body">
            <div class="admin-card-title">
              <span class="name">${p.name}</span>
              <span class="price">₱${Number(p.price).toFixed(2)}</span>
            </div>
            <div class="admin-card-meta">
              <span class="category">${p.category}</span>
              <span class="created">${new Date(p.createdAt).toLocaleString()}</span>
            </div>
            <div class="admin-card-actions">
              <button class="delete" data-id="${p.id}">🗑️ Delete</button>
            </div>
          </div>
        </div>
      `
    })
    .join("")

  productsContainer.querySelectorAll("button.delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id
      deleteProduct(id)
    })
  })
}

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return
  try {
    const res = await fetch(`/admin/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      credentials: "include",
    })
    if (!res.ok) throw new Error("Delete failed")
    showMessage(formMessage, "Product removed.", "success")
    loadProducts()
  } catch (err) {
    console.error(err)
    showMessage(formMessage, "Unable to delete product.", "error")
  }
}

productForm.addEventListener("submit", async (event) => {
  event.preventDefault()
  clearMessage(formMessage)

  const formData = new FormData(productForm)
  const files = formData.getAll("images").filter((f) => f && f.name)

  if (files.length !== 1) {
    showMessage(formMessage, "Please upload exactly 1 image.", "error")
    return
  }

  try {
    const res = await fetch("/admin/products", {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: formData,
    })

    const body = await res.json()
    if (!res.ok) {
      showMessage(formMessage, body.error || "Failed to add product.", "error")
      return
    }

    productForm.reset()
    showMessage(formMessage, "Product added successfully.", "success")
    loadProducts()
  } catch (err) {
    console.error(err)
    showMessage(formMessage, "Unable to save product.", "error")
  }
})

loginForm.addEventListener("submit", (event) => {
  event.preventDefault()
  clearMessage(loginMessage)

  const username = document.getElementById("username").value
  const password = document.getElementById("password").value

  login({ username, password })
})

logoutBtn?.addEventListener("click", (event) => {
  event.preventDefault()
  logout()
})

checkAuth()

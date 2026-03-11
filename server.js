const express = require("express")
const cors = require("cors")
const multer = require("multer")
const cookieParser = require("cookie-parser")
const fs = require("fs")
const path = require("path")
const os = require("os")
const crypto = require("crypto")

const app = express()

// === Admin auth ===
// Username / password are fixed to your requested values.
const ADMIN_USER = "Azkiel220522"
const ADMIN_PASS = "Ezekiel0522@Khyro"

function generateToken() {
  // Deterministic token so auth survives server restarts.
  return crypto
    .createHash("sha256")
    .update(`${ADMIN_USER}:${ADMIN_PASS}`)
    .digest("hex")
}

function getAuthToken(req) {
  const cookieToken = req.cookies?.adminToken
  const authHeader = (req.headers.authorization || "").trim()
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  return cookieToken || bearer || null
}

function requireAuth(req, res, next) {
  const token = getAuthToken(req)
  if (!token || token !== generateToken()) {
    return res.status(401).json({ error: "Not authenticated" })
  }
  next()
}

// === end admin auth ===

const PRODUCTS_FILE = path.join(__dirname, "products.json")
const ORDERS_FILE = path.join(__dirname, "orders.json")
const UPLOADS_DIR = path.join(__dirname, "Uploads")

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  }
}

function loadProducts() {
  try {
    if (!fs.existsSync(PRODUCTS_FILE)) {
      fs.writeFileSync(PRODUCTS_FILE, "[]", "utf8")
    }

    let json = fs.readFileSync(PRODUCTS_FILE, "utf8") || "[]"
    if (!json.trim()) {
      json = "[]"
    }

    try {
      return JSON.parse(json)
    } catch (parseErr) {
      console.warn("products.json is invalid JSON, resetting to empty array.")
      fs.writeFileSync(PRODUCTS_FILE, "[]", "utf8")
      return []
    }
  } catch (err) {
    console.error("Failed to load products.json", err)
    return []
  }
}

function saveProducts(products) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), "utf8")
}

function loadOrders() {
  try {
    if (!fs.existsSync(ORDERS_FILE)) {
      fs.writeFileSync(ORDERS_FILE, "[]", "utf8")
    }

    let json = fs.readFileSync(ORDERS_FILE, "utf8") || "[]"
    if (!json.trim()) {
      json = "[]"
    }

    try {
      return JSON.parse(json)
    } catch (parseErr) {
      console.warn("orders.json is invalid JSON, resetting to empty array.")
      fs.writeFileSync(ORDERS_FILE, "[]", "utf8")
      return []
    }
  } catch (err) {
    console.error("Failed to load orders.json", err)
    return []
  }
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8")
}

function getLocalAllowedIps() {
  const interfaces = os.networkInterfaces()
  const ips = new Set(["127.0.0.1", "::1"])

  Object.values(interfaces).forEach((iface) => {
    if (!iface) return
    iface.forEach((info) => {
      if (!info || !info.address) return
      let addr = info.address
      if (addr.startsWith("::ffff:")) {
        addr = addr.replace("::ffff:", "")
      }
      ips.add(addr)
    })
  })

  return ips
}

const allowedIps = getLocalAllowedIps()

function isLocalIp(req) {
  const rawIp = (req.ip || req.connection.remoteAddress || "").toString()
  let ip = rawIp.split("%")[0].trim()

  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "")
  }

  return allowedIps.has(ip)
}

function requireLocal(req, res, next) {
  if (isLocalIp(req)) return next()
  res.status(403).send("Forbidden")
}

ensureUploadsDir()

app.use(cors())
app.use(express.json())
app.use(cookieParser())


app.use("/uploads", express.static(UPLOADS_DIR))
app.use(express.static(path.join(__dirname, "Public")))

app.get("/products", (req, res) => {
  res.json(loadProducts())
})

// Public endpoint to record an order (used by checkout flow)
app.post("/orders", (req, res) => {
  const { name, phone, address, items, shippingCost, total } = req.body || {}
  if (!name || !phone || !address || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "Missing order details" })
  }

  const orders = loadOrders()
  const order = {
    id: `${Date.now().toString(36)}-${Math.round(Math.random() * 1e6)}`,
    createdAt: new Date().toISOString(),
    name: name.toString(),
    phone: phone.toString(),
    address: address.toString(),
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      qty: Number(item.qty) || 0,
      price: Number(item.price) || 0,
    })),
    shippingCost: Number(shippingCost) || 0,
    total: Number(total) || 0,
  }

  orders.push(order)
  saveOrders(orders)

  res.json({ success: true, order })
})

app.get("/admin/orders", requireAuth, (req, res) => {
  res.json(loadOrders())
})

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body || {}
  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: "Invalid credentials" })
  }

  const token = generateToken()

  res.cookie("adminToken", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 2, // 2 hours
  })
  res.json({ success: true, token })
})

app.post("/admin/logout", (req, res) => {
  res.clearCookie("adminToken")
  res.json({ success: true })
})

app.get("/admin/status", (req, res) => {
  const token = getAuthToken(req)
  const loggedIn = token === generateToken()
  res.json({ loggedIn })
})

app.get("/admin/products", requireAuth, (req, res) => {
  res.json(loadProducts())
})

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()
    const unique = `${base}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`
    cb(null, unique)
  },
})

const upload = multer({ storage })

app.post(
  "/admin/products",
  requireAuth,
  upload.single("images"),
  (req, res) => {
    const { name, price, category, cost } = req.body
    const file = req.file
    const files = file ? [file] : []

    if (!name || !price || !category) {
      files.forEach((f) => {
        try {
          fs.unlinkSync(f.path)
        } catch (err) {
          /* ignore */
        }
      })
      return res.status(400).json({ error: "Missing name, price, or category" })
    }

    if (files.length !== 1) {
      files.forEach((f) => {
        try {
          fs.unlinkSync(f.path)
        } catch (err) {
          /* ignore */
        }
      })
      return res.status(400).json({ error: `Upload exactly 1 image (uploaded ${files.length})` })
    }

    const products = loadProducts()
    const id = `${Date.now().toString(36)}-${Math.round(Math.random() * 1e6)}`
    const images = files.map((f) => `/uploads/${f.filename}`)

    const product = {
      id,
      name: name.toString(),
      price: Number(price) || 0,
      cost: Number(cost) || 0,
      category: category.toString(),
      images,
      createdAt: new Date().toISOString(),
    }

    products.push(product)
    saveProducts(products)

    res.json(product)
  }
)

app.delete("/admin/products/:id", requireAuth, (req, res) => {
  const { id } = req.params
  const products = loadProducts()
  const index = products.findIndex((p) => p.id === id)
  if (index === -1) {
    return res.status(404).json({ error: "Product not found" })
  }

  const [removed] = products.splice(index, 1)
  saveProducts(products)

  ;(removed.images || []).forEach((img) => {
    const filePath = path.join(__dirname, img.replace("/uploads/", ""))
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (err) {
      /* ignore */
    }
  })

  res.json({ success: true })
})

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000")
})
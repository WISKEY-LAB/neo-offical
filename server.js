const express = require('express');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const PRODUCTS_PATH = path.join(DATA_DIR, 'products.json');
const ORDERS_PATH = path.join(DATA_DIR, 'orders.json');
const RESELLERS_PATH = path.join(DATA_DIR, 'resellers.json');
const RESELLER_HISTORY_PATH = path.join(DATA_DIR, 'reseller_history.json');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'neo123';
const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || '';
const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY || '';
const PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '';
const PHONEPE_ENV = process.env.PHONEPE_ENV === 'production' ? 'production' : 'sandbox';
const PHONEPE_API_BASE = PHONEPE_ENV === 'production'
  ? 'https://api.phonepe.com/apis/hermes'
  : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: 'ABCD PANEL NON ROOT',
    category: 'non root panel',
    image: 'images/abcd_panel.png',
    badges: ['NON-ROOT', 'FREEFIRE'],
    desc: 'High performance non-root panel with ESP Champs & Silent Aim location tracking.',
    features: ['ESP Champs', 'AIMSILENT', 'Location ESP', '100% Non-Root Safe'],
    pricing: [
      { duration: '12 Hours', price: 25 },
      { duration: '1 Day', price: 45 },
      { duration: '3 Days', price: 120 },
      { duration: '7 Days', price: 200 }
    ]
  },
  {
    id: 2,
    name: 'Invisible X Kernel Panel Streamer',
    category: 'root panel',
    image: 'images/invisible_x.png',
    badges: ['ROOTED KERNEL', 'KERNEL VERSION'],
    desc: 'Kernel level rooted device panel with precision Aim Lock, Aimbot, and customizable FOV.',
    features: ['AIMLOCK & AIMBOT', 'AIMSILENT', 'Angel FOV 0-180°', 'Chest Rate 1-10', 'ESP LOCATION'],
    pricing: [
      { duration: '1 Day', price: 100 },
      { duration: '7 Days', price: 400 },
      { duration: '15 Days', price: 600 },
      { duration: '30 Days', price: 1000 }
    ]
  },
  {
    id: 3,
    name: 'Miguil iPhone iOS FF Panel',
    category: 'ios panel',
    image: 'images/miguel_ios.png',
    badges: ['IOS / IPAD', 'FREEFIRE'],
    desc: 'Exclusive iOS & iPad Free Fire panel featuring Silent Aim, Speed hack & Auto Fire.',
    features: ['SILENT AIM', 'AIMBOT', 'SPEED', 'AUTOFIRE', 'HEADSHOT', 'ESP ALL LOCATIONS'],
    pricing: [
      { duration: '1 Day', price: 200 },
      { duration: '7 Days', price: 600 },
      { duration: '30 Days', price: 1100 }
    ]
  },
  {
    id: 4,
    name: 'Rapid Core Brutal Panel',
    category: 'root panel',
    image: 'images/rapid_core.png',
    badges: ['BRUTAL', 'STATUS: INJECTED'],
    desc: 'Brutal mode panel loaded with Spin Bot, Enemy Pull, Aim Magnet, and Headshot sliders.',
    features: ['AIMBOT & AIMLOCK', 'AIMSILENT & AIMMAGNET', 'SPIN BOT', 'ENEMY PULL', 'Angle FOV 0-180°', 'Headshot 0-10'],
    pricing: [
      { duration: '1 Day', price: 50 },
      { duration: '7 Days', price: 250 },
      { duration: '14 Days', price: 350 },
      { duration: '30 Days', price: 600 }
    ]
  },
  {
    id: 5,
    name: 'Stricks BR Panel',
    category: 'root panel',
    image: 'images/stricks_br.png',
    badges: ['ROOT', 'FREEFIRE BR'],
    desc: 'Battle Royale panel overlay with Aim Magnet, FOV sliders, and Headshot rate tuning.',
    features: ['Aim Silent & Aim Magnet', 'Angle FOV Standard', 'Headshot Rate Tuning', 'Visuals & Exploits'],
    pricing: [
      { duration: '1 Day', price: 60 },
      { duration: '7 Days', price: 280 },
      { duration: '30 Days', price: 650 }
    ]
  }
];

function ensureDataFile(filePath, defaultValue) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

function readJson(filePath, defaultValue) {
  ensureDataFile(filePath, defaultValue);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function normalizeProduct(payload) {
  const pricing = Array.isArray(payload.pricing) ? payload.pricing.map(item => ({
    duration: String(item.duration || '1 Day'),
    price: Number(item.price || 0)
  })) : [];

  let keysPool = [];
  if (Array.isArray(payload.keysPool)) {
    keysPool = payload.keysPool.map(k => String(k).trim()).filter(Boolean);
  } else if (typeof payload.keysPool === 'string') {
    keysPool = payload.keysPool.split(/\r?\n/).map(k => k.trim()).filter(Boolean);
  } else if (typeof payload.rawKeys === 'string') {
    keysPool = payload.rawKeys.split(/\r?\n/).map(k => k.trim()).filter(Boolean);
  }

  return {
    id: Number(payload.id) || Date.now(),
    name: String(payload.name || 'New Panel').trim(),
    category: String(payload.category || 'non root panel').trim(),
    image: String(payload.image || 'images/abcd_panel.png').trim(),
    badges: Array.isArray(payload.badges) ? payload.badges.map(String) : ['NEW'],
    desc: String(payload.description || payload.desc || 'Panel description').trim(),
    features: Array.isArray(payload.features) ? payload.features.map(String) : ['Instant Delivery'],
    pricing: pricing.length ? pricing : [
      { duration: '1 Day', price: 100 },
      { duration: '7 Days', price: 400 },
      { duration: '30 Days', price: 1200 }
    ],
    keysPool
  };
}

function generateKey() {
  return 'NEO-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

function allocateKeyForProduct(productName) {
  const products = readJson(PRODUCTS_PATH, DEFAULT_PRODUCTS);
  const targetProduct = products.find(p =>
    p.name.toLowerCase().trim() === String(productName).toLowerCase().trim() ||
    String(p.id) === String(productName)
  );

  if (targetProduct && Array.isArray(targetProduct.keysPool) && targetProduct.keysPool.length > 0) {
    const assignedKey = targetProduct.keysPool.shift();
    writeJson(PRODUCTS_PATH, products);
    return assignedKey;
  }

  return generateKey();
}

function phonePeChecksum(value) {
  return crypto.createHash('sha256').update(value + PHONEPE_SALT_KEY).digest('hex') + `###${PHONEPE_SALT_INDEX}`;
}

function createOrderRecord({ productName, total, customer, email, phone, discord, payerUpiId, paymentMethod, status = 'pending' }) {
  const assignedKey = allocateKeyForProduct(productName);
  return {
    id: `NEO-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    createdAt: new Date().toISOString(),
    productName: String(productName),
    amount: Number(total),
    customer: String(customer),
    email: String(email),
    phone: String(phone),
    discord: String(discord || customer),
    payerUpiId: String(payerUpiId || ''),
    key: assignedKey,
    paymentMethod: String(paymentMethod || 'online'),
    status,
    updatedAt: new Date().toISOString()
  };
}

function getAuthCredentials(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) return null;
  const encoded = authHeader.replace('Basic ', '');
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return null;
  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1)
  };
}

function adminAuth(req, res, next) {
  const credentials = getAuthCredentials(req.headers.authorization);
  if (!credentials || credentials.username !== ADMIN_USERNAME || credentials.password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  req.admin = credentials;
  return next();
}

app.disable('x-powered-by');

/* --- SECURITY: RATE LIMITER & ANTI-BRUTE FORCE --- */
const rateLimitMap = new Map();
function createRateLimiter(maxRequests = 30, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }

    rateLimitMap.set(ip, record);

    if (record.count > maxRequests) {
      return res.status(429).json({ success: false, message: 'Too many requests. Please wait a minute and try again.' });
    }
    next();
  };
}

const authLimiter = createRateLimiter(10, 60000); // Max 10 login attempts per minute
const keyGenLimiter = createRateLimiter(15, 60000); // Max 15 key gens per minute
const apiLimiter = createRateLimiter(60, 60000); // Max 60 API calls per minute

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

/* --- SECURITY HTTP HEADERS --- */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

/* --- SECURITY: BLOCK ACCESS TO PROTECTED FILES (.env, /data, etc.) --- */
app.use((req, res, next) => {
  const forbiddenPaths = ['/.env', '/.env.example', '/data', '/node_modules', '/package.json', '/package-lock.json', '/.git'];
  const reqPath = req.path.toLowerCase();
  
  if (forbiddenPaths.some(fp => reqPath === fp || reqPath.startsWith(fp + '/'))) {
    return res.status(403).json({ success: false, message: 'Access Denied: Protected System Resource' });
  }
  next();
});

app.use(express.static(ROOT_DIR));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'NEO API is running', time: new Date().toISOString() });
});

app.get('/api/products', (req, res) => {
  const products = readJson(PRODUCTS_PATH, DEFAULT_PRODUCTS);
  res.json(products);
});

app.post('/api/products', adminAuth, (req, res) => {
  const products = readJson(PRODUCTS_PATH, DEFAULT_PRODUCTS);
  const normalized = normalizeProduct(req.body);
  const existingIndex = products.findIndex(item => Number(item.id) === Number(normalized.id));

  if (existingIndex >= 0) {
    products[existingIndex] = { ...products[existingIndex], ...normalized };
  } else {
    products.push(normalized);
  }

  writeJson(PRODUCTS_PATH, products);
  res.status(201).json({ success: true, product: normalized });
});

app.put('/api/products/:id', adminAuth, (req, res) => {
  const products = readJson(PRODUCTS_PATH, DEFAULT_PRODUCTS);
  const id = Number(req.params.id);
  const index = products.findIndex(item => Number(item.id) === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const updated = { ...products[index], ...normalizeProduct({ ...products[index], ...req.body, id }) };
  products[index] = updated;
  writeJson(PRODUCTS_PATH, products);
  res.json({ success: true, product: updated });
});

app.delete('/api/products/:id', adminAuth, (req, res) => {
  const products = readJson(PRODUCTS_PATH, DEFAULT_PRODUCTS);
  const filtered = products.filter(item => Number(item.id) !== Number(req.params.id));
  writeJson(PRODUCTS_PATH, filtered);
  res.json({ success: true, removedId: Number(req.params.id) });
});

app.get('/api/orders', adminAuth, (req, res) => {
  const orders = readJson(ORDERS_PATH, []);
  res.json(orders);
});

app.get('/api/orders/:id', adminAuth, (req, res) => {
  const orders = readJson(ORDERS_PATH, []);
  const order = orders.find(item => item.id === req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  res.json(order);
});

app.patch('/api/orders/:id/status', adminAuth, (req, res) => {
  const orders = readJson(ORDERS_PATH, []);
  const order = orders.find(item => item.id === req.params.id);
  const allowedStatuses = ['pending', 'paid', 'delivered', 'cancelled'];
  const status = String(req.body?.status || '').toLowerCase();

  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!allowedStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid order status' });

  order.status = status;
  order.updatedAt = new Date().toISOString();
  writeJson(ORDERS_PATH, orders);
  res.json({ success: true, order });
});

app.post('/api/payments/phonepe', keyGenLimiter, async (req, res) => {
  const { productName, total, customer, email, phone, discord, payerUpiId } = req.body || {};
  const finalTotal = Number(total || 0);

  if (!productName || !finalTotal || !customer || !email || !phone || !payerUpiId) {
    return res.status(400).json({ success: false, message: 'Missing required payment details' });
  }
  if (!PHONEPE_MERCHANT_ID || !PHONEPE_SALT_KEY || !PHONEPE_SALT_INDEX || PHONEPE_SALT_KEY.includes('your_phonepe_salt_key')) {
    return res.status(503).json({ success: false, message: 'PhonePe Salt Key set nahi hai! .env file me real PhonePe Salt Key dalein.' });
  }

  const orders = readJson(ORDERS_PATH, []);
  const order = createOrderRecord({ productName, total: finalTotal, customer, email, phone, discord, payerUpiId, paymentMethod: 'phonepe' });
  const payload = {
    merchantId: PHONEPE_MERCHANT_ID,
    merchantTransactionId: order.id,
    merchantUserId: `USER-${crypto.randomBytes(6).toString('hex')}`,
    amount: Math.round(finalTotal * 100),
    redirectUrl: `${req.protocol}://${req.get('host')}/api/payments/phonepe/return?transactionId=${encodeURIComponent(order.id)}`,
    redirectMode: 'REDIRECT',
    callbackUrl: `${req.protocol}://${req.get('host')}/api/payments/phonepe/callback`,
    paymentInstrument: { type: 'PAY_PAGE' }
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');

  try {
    const gatewayResponse = await fetch(`${PHONEPE_API_BASE}/pg/v1/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': phonePeChecksum(encodedPayload + '/pg/v1/pay'),
        'X-MERCHANT-ID': PHONEPE_MERCHANT_ID
      },
      body: JSON.stringify({ request: encodedPayload })
    });
    const gatewayResult = await gatewayResponse.json();
    const redirectUrl = gatewayResult?.data?.instrumentResponse?.redirectInfo?.url;
    if (!gatewayResponse.ok || !redirectUrl) {
      return res.status(502).json({ success: false, message: gatewayResult?.message || 'PhonePe payment could not be started' });
    }
    orders.unshift(order);
    writeJson(ORDERS_PATH, orders);
    return res.json({ success: true, redirectUrl });
  } catch (error) {
    return res.status(502).json({ success: false, message: 'PhonePe gateway is unavailable' });
  }
});

app.post('/api/payments/phonepe/callback', (req, res) => {
  res.json({ success: true });
});

app.get('/api/payments/phonepe/return', async (req, res) => {
  const transactionId = String(req.query.transactionId || '');
  const orders = readJson(ORDERS_PATH, []);
  const order = orders.find(item => item.id === transactionId);
  if (!order || !PHONEPE_MERCHANT_ID || !PHONEPE_SALT_KEY || !PHONEPE_SALT_INDEX) {
    return res.redirect('/index.html?payment=failed');
  }

  try {
    const pathToSign = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${transactionId}`;
    const statusResponse = await fetch(`${PHONEPE_API_BASE}${pathToSign}`, {
      headers: {
        Accept: 'application/json',
        'X-VERIFY': phonePeChecksum(pathToSign),
        'X-MERCHANT-ID': PHONEPE_MERCHANT_ID
      }
    });
    const statusResult = await statusResponse.json();
    if (statusResponse.ok && statusResult?.code === 'PAYMENT_SUCCESS') {
      order.status = 'paid';
      order.updatedAt = new Date().toISOString();
      writeJson(ORDERS_PATH, orders);
      return res.redirect(`/order.html?product=${encodeURIComponent(order.productName)}&total=${order.amount}&key=${encodeURIComponent(order.key)}&order=${encodeURIComponent(order.id)}`);
    }
  } catch (error) {
    console.error('PhonePe status check failed:', error.message);
  }
  return res.redirect('/index.html?payment=failed');
});

app.post('/api/orders', (req, res) => {
  const { productName, total, amount, customer, email, phone, discord, payerUpiId, paymentMethod, status } = req.body;
  const finalTotal = Number(total ?? amount ?? 0);

  if (!productName || !finalTotal || !customer || !email || !phone) {
    return res.status(400).json({ success: false, message: 'Missing required order fields' });
  }

  const orders = readJson(ORDERS_PATH, []);
  const newOrder = createOrderRecord({ productName, total: finalTotal, customer, email, phone, discord, payerUpiId, paymentMethod, status: String(status || 'pending') });

  orders.unshift(newOrder);
  writeJson(ORDERS_PATH, orders);
  res.status(201).json({
    success: true,
    orderId: newOrder.id,
    key: newOrder.key,
    amount: finalTotal,
    product: productName,
    order: newOrder,
    downloadUrl: `/order.html?product=${encodeURIComponent(productName)}&total=${finalTotal}&key=${encodeURIComponent(newOrder.key)}&order=${encodeURIComponent(newOrder.id)}`
  });
});

app.post('/api/admin/login', authLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({ success: true, username, message: 'Login successful' });
  }
  return res.status(401).json({ success: false, message: 'Invalid username or password' });
});

app.get('/api/dashboard/stats', adminAuth, (req, res) => {
  const products = readJson(PRODUCTS_PATH, DEFAULT_PRODUCTS);
  const orders = readJson(ORDERS_PATH, []);
  const categories = new Set(products.map(item => item.category));
  const statusCounts = orders.reduce((counts, order) => {
    const status = String(order.status || 'pending').toLowerCase();
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const productPerformance = Object.values(orders.reduce((summary, order) => {
    const productName = String(order.productName || 'Unknown product');
    if (!summary[productName]) summary[productName] = { productName, orders: 0, revenue: 0 };
    summary[productName].orders += 1;
    summary[productName].revenue += Number(order.amount || 0);
    return summary;
  }, {})).sort((a, b) => b.revenue - a.revenue);
  const dailyRevenue = Object.values(orders.reduce((summary, order) => {
    const day = String(order.createdAt || new Date().toISOString()).slice(0, 10);
    summary[day] = (summary[day] || 0) + Number(order.amount || 0);
    return summary;
  }, {})).slice(-7);
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  res.json({
    totalPanels: products.length,
    totalCategories: categories.size,
    totalOrders: orders.length,
    totalRevenue,
    grossProfit: totalRevenue,
    statusCounts,
    productPerformance,
    dailyRevenue,
    recentOrders: orders.slice(0, 5)
  });
});

/* --- RESELLER AUTHENTICATION & MANAGEMENT ENDPOINTS --- */
function getResellerCredentials(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) return null;
  const encoded = authHeader.replace('Basic ', '');
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return null;
  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1)
  };
}

function resellerAuth(req, res, next) {
  const credentials = getResellerCredentials(req.headers.authorization);
  if (!credentials) return res.status(401).json({ success: false, message: 'Reseller authentication required' });

  const resellers = readJson(RESELLERS_PATH, []);
  const reseller = resellers.find(r => r.username.toLowerCase() === credentials.username.toLowerCase() && r.password === credentials.password);
  if (!reseller || reseller.status !== 'active') {
    return res.status(401).json({ success: false, message: 'Invalid or inactive reseller account' });
  }

  req.reseller = reseller;
  return next();
}

// GET ALL RESELLERS (Admin)
app.get('/api/admin/resellers', adminAuth, (req, res) => {
  const resellers = readJson(RESELLERS_PATH, []);
  res.json(resellers);
});

// CREATE NEW RESELLER (Admin)
app.post('/api/admin/resellers', adminAuth, (req, res) => {
  const { username, password, name, balance, allowedCategory } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  const resellers = readJson(RESELLERS_PATH, []);
  if (resellers.some(r => r.username.toLowerCase() === String(username).trim().toLowerCase())) {
    return res.status(400).json({ success: false, message: 'Reseller username already exists' });
  }

  const newReseller = {
    id: `RES-${Date.now()}`,
    username: String(username).trim(),
    password: String(password).trim(),
    name: String(name || username).trim(),
    balance: Number(balance || 0),
    allowedCategory: String(allowedCategory || 'all').toLowerCase().trim(),
    createdAt: new Date().toISOString(),
    status: 'active'
  };

  resellers.unshift(newReseller);
  writeJson(RESELLERS_PATH, resellers);
  res.status(201).json({ success: true, reseller: newReseller });
});

// ADD/DEDUCT BALANCE (Admin)
app.patch('/api/admin/resellers/:id/balance', adminAuth, (req, res) => {
  const { amount } = req.body || {};
  const delta = Number(amount || 0);
  const resellers = readJson(RESELLERS_PATH, []);
  const reseller = resellers.find(r => r.id === req.params.id);

  if (!reseller) return res.status(404).json({ success: false, message: 'Reseller not found' });

  reseller.balance = Math.max(0, Number(reseller.balance || 0) + delta);
  writeJson(RESELLERS_PATH, resellers);
  res.json({ success: true, balance: reseller.balance, reseller });
});

// UPDATE ALLOWED CATEGORY (Admin)
app.patch('/api/admin/resellers/:id/category', adminAuth, (req, res) => {
  const { allowedCategory } = req.body || {};
  const resellers = readJson(RESELLERS_PATH, []);
  const reseller = resellers.find(r => r.id === req.params.id);

  if (!reseller) return res.status(404).json({ success: false, message: 'Reseller not found' });

  reseller.allowedCategory = String(allowedCategory || 'all').toLowerCase().trim();
  writeJson(RESELLERS_PATH, resellers);
  res.json({ success: true, reseller });
});

// DELETE RESELLER (Admin)
app.delete('/api/admin/resellers/:id', adminAuth, (req, res) => {
  const resellers = readJson(RESELLERS_PATH, []);
  const filtered = resellers.filter(r => r.id !== req.params.id);
  writeJson(RESELLERS_PATH, filtered);
  res.json({ success: true, id: req.params.id });
});

// RESELLER LOGIN
app.post('/api/reseller/login', authLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const resellers = readJson(RESELLERS_PATH, []);
  const reseller = resellers.find(r => r.username.toLowerCase() === String(username || '').trim().toLowerCase() && r.password === String(password || '').trim());

  if (!reseller) {
    return res.status(401).json({ success: false, message: 'Invalid Reseller credentials' });
  }
  if (reseller.status !== 'active') {
    return res.status(403).json({ success: false, message: 'Reseller account is suspended' });
  }

  res.json({ success: true, reseller });
});

// RESELLER PROFILE & BALANCE
app.get('/api/reseller/profile', resellerAuth, (req, res) => {
  res.json({ success: true, reseller: req.reseller });
});

// RESELLER KEY GENERATION (Deducts Wallet Balance)
app.post('/api/reseller/generate-key', resellerAuth, keyGenLimiter, (req, res) => {
  const { productId, durationIndex = 0 } = req.body || {};
  const products = readJson(PRODUCTS_PATH, DEFAULT_PRODUCTS);
  const product = products.find(p => Number(p.id) === Number(productId) || p.name.toLowerCase() === String(productId).toLowerCase());

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  // Category Permission Check
  const resellerCat = String(req.reseller.allowedCategory || 'all').toLowerCase();
  const productCat = String(product.category || '').toLowerCase();

  if (resellerCat !== 'all' && productCat !== resellerCat) {
    return res.status(403).json({
      success: false,
      message: `Access Denied! Aapko sirf '${resellerCat.toUpperCase()}' category ke keys banane ki permission hai.`
    });
  }

  const selectedTier = product.pricing?.[durationIndex] || product.pricing?.[0] || { duration: '1 Day', price: 100 };
  const cost = Number(selectedTier.price || 0);

  if (req.reseller.balance < cost) {
    return res.status(402).json({
      success: false,
      message: `Insufficient Wallet Balance! Required: ₹${cost}, Available Wallet Balance: ₹${req.reseller.balance}`
    });
  }

  // Deduct Wallet Balance
  const resellers = readJson(RESELLERS_PATH, []);
  const currentReseller = resellers.find(r => r.id === req.reseller.id);
  if (!currentReseller || currentReseller.balance < cost) {
    return res.status(402).json({ success: false, message: 'Wallet balance mismatch. Refresh and try again.' });
  }

  currentReseller.balance -= cost;
  writeJson(RESELLERS_PATH, resellers);

  // Allocate Key
  const issuedKey = allocateKeyForProduct(product.name);

  // Record Reseller History
  const history = readJson(RESELLER_HISTORY_PATH, []);
  const record = {
    id: `RES-KEY-${Date.now()}`,
    resellerId: currentReseller.id,
    resellerName: currentReseller.username,
    productName: product.name,
    category: product.category,
    duration: selectedTier.duration,
    price: cost,
    key: issuedKey,
    generatedAt: new Date().toISOString()
  };
  history.unshift(record);
  writeJson(RESELLER_HISTORY_PATH, history);

  // Also record in global orders
  const orders = readJson(ORDERS_PATH, []);
  const orderRecord = {
    id: record.id,
    createdAt: record.generatedAt,
    productName: product.name,
    amount: cost,
    customer: `Reseller: ${currentReseller.username}`,
    email: `${currentReseller.username}@reseller.store`,
    phone: 'Reseller Order',
    discord: currentReseller.name,
    payerUpiId: 'RESELLER-WALLET',
    key: issuedKey,
    paymentMethod: 'reseller_wallet',
    status: 'paid',
    updatedAt: new Date().toISOString()
  };
  orders.unshift(orderRecord);
  writeJson(ORDERS_PATH, orders);

  res.json({
    success: true,
    key: issuedKey,
    newBalance: currentReseller.balance,
    record
  });
});

// RESELLER HISTORY
app.get('/api/reseller/history', resellerAuth, (req, res) => {
  const history = readJson(RESELLER_HISTORY_PATH, []);
  const myHistory = history.filter(h => h.resellerId === req.reseller.id);
  res.json(myHistory);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`NEO backend running on http://localhost:${PORT}`);
  console.log(`Admin login: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
});

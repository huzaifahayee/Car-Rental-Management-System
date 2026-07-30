require("dotenv").config()
const express = require("express")
const tenantResolver = require("./middleware/tenantResolver")
const authRoutes = require("./routes/auth")
const settingsRoutes = require("./routes/settings")
const vehicleRoutes = require("./routes/vehicles")
const bookingRoutes = require("./routes/bookings")
const dashboardRoutes = require("./routes/dashboard.js")
const outletRoutes = require("./routes/outlets")
const driverRoutes = require("./routes/drivers")
const userRoutes = require("./routes/users")
const publicRoutes = require('./routes/public')
const tenantRoutes = require('./routes/tenants')
const { reconcileOverdueBookingsAllTenants } = require('./services/bookingReconciliation')
const cors = require("cors")

const app = express()

// Allow the frontend dev origin plus any `<tenant-slug>.localhost:5173`
// subdomain, so per-tenant frontends can reach this shared backend.
// TODO: broaden/config-drive this pattern for production tenant domains.
const ALLOWED_ORIGIN_PATTERN = /^https?:\/\/([a-z0-9-]+\.)?localhost:5173$/i
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGIN_PATTERN.test(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
}))
app.use(express.json())
app.use(tenantResolver)

app.use("/auth", authRoutes)
app.use("/settings", settingsRoutes)
app.use("/vehicles", vehicleRoutes)
app.use("/bookings", bookingRoutes)
app.use("/dashboard", dashboardRoutes)
app.use("/outlets", outletRoutes)
app.use("/drivers", driverRoutes)
app.use("/users", userRoutes)
app.use('/public', publicRoutes)
app.use('/tenants', tenantRoutes)
// destinations feature removed; cities are derived from outlets

async function startServer() {
  try {
    const prisma = tenantResolver.getPrismaClientForTenant('default')
    await prisma.$connect()
    console.log('Connected to PostgreSQL successfully')

    // Periodically reconcile overdue bookings, across every active tenant,
    // so vehicles are released after their return time.
    setInterval(reconcileOverdueBookingsAllTenants, 1000 * 60 * 5)
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err.message)
    process.exit(1)
  }

  app.listen(5000, () => {
    console.log("Server is running on port 5000")
  })
}

startServer()
require("dotenv").config()
const express = require("express")
const tenantResolver = require("./middleware/tenantResolver")
const authRoutes = require("./routes/auth")
const settingsRoutes = require("./routes/settings")
const vehicleRoutes = require("./routes/vehicles")
const bookingRoutes = require("./routes/bookings")
const dashboardRoutes = require("./routes/dashboard.js")
const outletRoutes = require("./routes/outlets")
const userRoutes = require("./routes/users")
const cors = require("cors")

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())
app.use(tenantResolver)

app.use("/auth", authRoutes)
app.use("/settings", settingsRoutes)
app.use("/vehicles", vehicleRoutes)
app.use("/bookings", bookingRoutes)
app.use("/dashboard", dashboardRoutes)
app.use("/outlets", outletRoutes)
app.use("/users", userRoutes)
// destinations feature removed; cities are derived from outlets

async function startServer() {
  try {
    const prisma = tenantResolver.getPrismaClientForTenant('default')
    await prisma.$connect()
    console.log('Connected to PostgreSQL successfully')
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err.message)
    process.exit(1)
  }

  app.listen(5000, () => {
    console.log("Server is running on port 5000")
  })
}

startServer()
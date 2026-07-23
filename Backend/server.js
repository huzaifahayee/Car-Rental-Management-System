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
const publicRoutes = require('./routes/public')
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
app.use('/public', publicRoutes)
// destinations feature removed; cities are derived from outlets

async function startServer() {
  try {
    const prisma = tenantResolver.getPrismaClientForTenant('default')
    await prisma.$connect()
    console.log('Connected to PostgreSQL successfully')

    // Periodically reconcile overdue bookings so vehicles are released after their return time.
    setInterval(async () => {
      try {
        const now = new Date()
        const overdueConfirmedBookings = await prisma.booking.findMany({
          where: { status: 'CONFIRMED', returnDateTime: { lte: now } },
          select: { id: true, vehiclePackageId: true },
        })
        if (!overdueConfirmedBookings.length) return

        const bookingIds = overdueConfirmedBookings.map((booking) => booking.id)
        const vehicleIds = [...new Set(overdueConfirmedBookings.map((booking) => booking.vehiclePackageId))]

        await prisma.$transaction([
          prisma.booking.updateMany({ where: { id: { in: bookingIds } }, data: { status: 'COMPLETED' } }),
          prisma.vehiclePackage.updateMany({ where: { id: { in: vehicleIds } }, data: { status: 'AVAILABLE' } }),
        ])

        console.log(`Reconciled ${bookingIds.length} overdue booking(s) at ${now.toISOString()}`)
      } catch (reconcileErr) {
        console.error('Failed to reconcile overdue bookings:', reconcileErr.message)
      }
    }, 1000 * 60 * 5)
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err.message)
    process.exit(1)
  }

  app.listen(5000, () => {
    console.log("Server is running on port 5000")
  })
}

startServer()
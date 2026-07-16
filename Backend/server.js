require("dotenv").config()
const express = require("express")
const tenantResolver = require("./middleware/tenantResolver")
const authRoutes = require("./routes/auth")

const app = express()

app.use(express.json())
app.use(tenantResolver)

app.use("/auth", authRoutes)

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
require("dotenv").config()
const express = require("express")
const tenantResolver = require("./middleware/tenantResolver")
const authRoutes = require("./routes/auth")

const app = express()

app.use(express.json())
app.use(tenantResolver)

app.use("/auth", authRoutes)

// Temporary test route — confirms tenant resolution + Prisma connection work.
// Remove once real routes exist.
app.get("/test-db", async (req, res) => {
  try {
    const userCount = await req.prisma.user.count()
    res.json({ tenant: req.tenantId, userCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(5000, () => {
  console.log("Server is running on port 5000")
})
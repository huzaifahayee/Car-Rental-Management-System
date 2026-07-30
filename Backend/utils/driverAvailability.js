// Driver availability is now tracked directly on Driver.status (IDLE/ASSIGNED/INACTIVE),
// kept in sync by assignDriver and booking status transitions — so "available"
// just means status === 'IDLE'.

async function isDriverAvailable(prisma, driverId) {
  const driver = await prisma.driver.findUnique({ where: { id: Number(driverId) } })
  return !!driver && driver.status === 'IDLE'
}

module.exports = { isDriverAvailable }

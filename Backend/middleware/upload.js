const multer = require('multer')

const storage = multer.memoryStorage()

const upload = multer({ storage })
const uploadLogo = multer({ storage })

module.exports = upload
module.exports.uploadLogo = uploadLogo
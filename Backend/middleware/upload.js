const multer = require('multer')
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const cloudinary = require('../config/cloudinary')

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'garitrip/vehicles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
})

const logoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'garitrip/branding',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
  },
})

const upload = multer({ storage })
const uploadLogo = multer({ storage: logoStorage })

module.exports = upload
module.exports.uploadLogo = uploadLogo
const multer = require("multer");
const path = require('path');


const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb("Please upload only images.", false);
  }
};



var bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __basedir + "/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});





var uploadBanner = multer({ storage: bannerStorage , fileFilter: imageFilter });


module.exports = {
  uploadBanner,
}
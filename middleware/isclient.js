const db = require('../config/connection');
const User = db.user;

module.exports = (req, res, next) => {
  const user = User.findByPk(req.userId)
  if (user.roleId == 1) {
    next();
    return;
  }
  res.status(403).send({
    message: "Require Client authorization!"
  });
  return;
  // });
  // });
};
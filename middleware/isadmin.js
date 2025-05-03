const db = require('../config/connection');
const User = db.user;

module.exports = async (req, res, next) => {
      const user =  await User.findByPk(req.userId)
      // console.log(user)
      // user.getRoles().then(roles => {
        // for (let i = 0; i < roles.length; i++) {
        //   if (roles[i].name === "admin") {
        //     next();
        //     return;
        //   }
        // }
        // console.log(user);
        if(user.roleId == 246162){
          next();
          return;
        }

        res.status(403).send({
          message: "Require Admin authorization!"
        });
        return;
      // });
    
  };
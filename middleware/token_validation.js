const jwt = require("jsonwebtoken");
module.exports = {
  checkToken: (req, res, next) => {
    let token = req.get("authorization");
    if (token) {
      token = token.slice(7);
      console.log(process.env.SECRET_KEY);
      jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
          console.log(err);
          const error = new Error('Invalid token');
          error.statusCode = 400;
          throw error;
                    
        } else {
          req.decoded = decoded;
          next();
        }
      });
    } else {
      const error = new Error('Access Denied! Unauthorized');
      error.statusCode = 401;
      throw error;
    }
  }
};

const {
  create,
  getUserByUserEmail,
  getUserByUserId,
  getUsers,
  updateUser,
  deleteUser,
  generateTokenAndRefreshToken,
  generateTokenAndRefreshTokenpromise,
  getRefreshToken,
  getJwtId,
  markTokenAsUsed,
  InvalidateToken,
  getUserByUserEmailPromise
} = require("./user.service");

var moment = require('moment');

const { hashSync, genSaltSync, compareSync } = require("bcrypt");

const { verify } = require("jsonwebtoken");

module.exports = {
  createUser: (req, res, next) => {
    const body = req.body;
    const salt = genSaltSync(10);
    body.password = hashSync(body.password, salt);
    
    create(body, (err, results) => {
      if (err) {
        const error = new Error(err);
        error.statusCode = 400;
        return next(error);
      }
      res.responseObject = results;
      res.responseStatus = 201;
      res.message = "Created."
      return next();     
    });
  },
  
  login: (req, res,next) => {
    const body = req.body;
    
    getUserByUserEmail(body.email, (err, results) => {
      if (err) {
        console.log("error occured",err);
        const error = new Error('Error Occured');
        error.statusCode = 400;
        return next(error);
      }
      if (!results) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        return next(error);
      }
      const result = compareSync(body.password, results.password);
      if (result) {
        results.password = undefined;


        generateTokenAndRefreshToken(results.Id,(err, results) => {
          if(err){
            const error = new Error('Invalid email or password');
            error.statusCode = 401;
            return next(error);
          }
          
          if (!results) {
            const error = new Error('Invalid email or password');
            error.statusCode = 401;
            return next(error);
          }

          // return res.status(200).json({
          //   success: 1,
          //   message: "login successfully",
          //   result : {
          //     token: results.token,
          //     refreshToken: results.refreshToken
          //   }
          // });

          const response = {
            token: results.token,
            refreshToken: results.refreshToken
          };

          res.responseObject = response;
          return next();
        });

      } else {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        return next(error);
      }
    });
  },

  loginv2: async (req,res,next) =>{
    const body = req.body;
    try {
      const result = await getUserByUserEmailPromise(body.email);
      
      if (!result) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        return next(error);
      }
      
      const {token, refreshToken} = await generateTokenAndRefreshTokenpromise(result.Id);
    res.responseObject = {token, refreshToken};
    return next();

    } catch (err) {
      console.log(err)
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      return next(error);
    }
  },

  getUserByUserId: (req, res,next) => {
    const id = req.params.id;
    getUserByUserId(id, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results) {
        const error = new Error('Error Occured');
        error.statusCode = 400;
        return next(error);
      }
      results.password = undefined;

      res.responseObject = results;
      return next();
    });
  },

  getUsers: (req, res, next) => {
    getUsers(req.query,(err, results) => {
      if (err) {
        const error = new Error('Error Occured');
        error.statusCode = 400;
        return next(error);
      }

      res.responseObject = results;
      return next();
    });
  },

  updateUsers: (req, res, next) => {
    const body = req.body;
    const salt = genSaltSync(10);
    body.password = hashSync(body.password, salt);
    updateUser(body, (err, results) => {
      if (err) {
        const error = new Error('Error Occured');
        error.statusCode = 400;
        return next(error);
      }
      res.responseObject = results;
      return next();
    });
  },

  deleteUser: (req, res, next) => {
    const data = req.body;
    deleteUser(data, (err, results) => {
      if (err) {
        const error = new Error('Error Occured');
        error.statusCode = 400;
        return next(error);
      }
      console.log(results);
      if (!results) {
        const error = new Error('Not Found');
        error.statusCode = 404;
        return next(error);
      }
      res.message = "deleted successfully";
      res.responseStatus = 200;
      return next();
    });
  },

  Refreshtoken: (req,res, next)=>{
    const body = req.body;

    getRefreshToken(body.refreshToken,(err,result)=>{
      if(err){
        console.log(err);
        const error = new Error('invalid token');
        error.statusCode = 400;
        return next(error);
      }
        if(!result){
          const error = new Error('Not Found');
          error.statusCode = 404;
          return next(error);
        }
        //Verifie that it's a correct token
        verify(body.token, process.env.SECRET_KEY,{ignoreExpiration: true}, (err, decoded) => {
          if (err) { 
            const error = new Error('invalid token');
            error.statusCode = 400;
            return next(error);
          } else {        
            //Check if Token has expired or not
            const expiry = decoded.exp;
            const now = new Date();
            if(now.getTime() < expiry * 1000){
              console.log("Token not expired yet");

              const error = new Error('invalid token');
              error.statusCode = 400;
              return next(error);
            }

            //Fetching the Id and jwtid from the token
            getJwtId(body.token,(err,data)=>{
              if(err){
                const error = new Error('invalid token');
                error.statusCode = 400;
                return next(error);
              }
              //token dosn't match refresh token
              if(result.JwtId !== data.jti){
                const error = new Error('invalid token');
                error.statusCode = 400;
                return next(error);
              }
              //token already used
              if(result.Used || result.Invalidated){
                console.log("Token is used or is Invalid");
                const error = new Error('invalid token');
                error.statusCode = 400;
                return next(error);
          }
          //Refresh token has expiered
          if (moment().isAfter(result.ExpiryDate)){
            console.log("refresh token has expiered");
            const error = new Error('invalid token');
            error.statusCode = 400;
            return next(error);
          }
          //check if same users same user
          if(result.UserId !== data.id){
            //Not same users
            console.log("not the same user is");
            const error = new Error('invalid token');
            error.statusCode = 400;
            return next(error);
          }
          
          
          //Mark refreshtoken as used
          markTokenAsUsed(body.refreshToken,(err,success)=>{
            if(err){
              console.log("error while updating refresh token");
              const error = new Error('invalid token');
              error.statusCode = 400;
              return next(error);
            }
            if(!success){
              const error = new Error('Not Found');
              error.statusCode = 404;
              return next(error);
            }

            //generating new Token
            generateTokenAndRefreshToken(data.id,(err, results) => {
              if(err){
                const error = new Error('invalid token');
                error.statusCode = 400;
                return next(error);
              }
              if (!results) {
                const error = new Error('Not Found');
                error.statusCode = 404;
                return next(error);
              }
              
              const response = {
                token: results.token,
                refreshToken: results.refreshToken
              };
    
              res.responseObject = response;
              return next();
            }); 

          })      
        })
      }
    });
    
  });
    
    
  },

  logout : (req,res, next)=>{
    const body = req.body;
    InvalidateToken(body.refreshToken,(err,success)=>{
      if(err){
        console.log(err);
        const error = new Error('Error Occured');
        error.statusCode = 400;
        return next(error);
      }
      if(!success){
        const error = new Error('Not Found');
        error.statusCode = 404;
        return next(error);
      }
      // return res.status(200).json({
      //   success: 1,
      //   message: 'success.'
      // });

      return next();
    })
  }

};

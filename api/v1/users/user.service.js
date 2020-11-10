var uuid = require('uuid');
var moment = require('moment');
const pool = require("../../../config/database");
const { sign,decode } = require("jsonwebtoken");


module.exports = {
  create: (data, callBack) => {

    pool.query("select id from registration where email = ?",
    [data.email],
    (error, results, fields) => {
      if (error) {
        callBack(error);
      }
      console.log(results);
      if(results[0]){
        return callBack("User already exists");
      }
      
      console.log("here");
      pool.query(
        `insert into registration(firstName, lastName, gender, email, password, number) 
                  values(?,?,?,?,?,?)`,
        [
          data.first_name,
          data.last_name,
          data.gender,
          data.email,
          data.password,
          data.number
        ],
        (error, results, fields) => {
          if (error) {
            callBack(error);
          }
          return callBack(null, results);
        }
      );
    }
    )

    

  },
  
  getUserByUserEmail: (email, callBack) => {
    pool.query(
      `select * from registration where email = ?`,
      [email],
      (error, results, fields) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  getUserByUserId: (id, callBack) => {
    pool.query(
      `select id,firstName,lastName,gender,email,number from registration where id = ?`,
      [id],
      (error, results, fields) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  getUsers: (data,callBack) => {
  var numRows;
  var numPerPage = parseInt(data.npp, 10) || 3;
  var page = parseInt(data.page, 10) || 0;
  var numPages;
  var skip = page * numPerPage;

  pool.query(
    `SELECT count(*) as numRows FROM registration`,
    [],
    (error, results, fields) => {
      if (error) {
        callBack(error);
      }
    numRows = results[0].numRows;
    numPages = Math.ceil(numRows / numPerPage);
    console.log('number of pages:', numPages);

    pool.query(
      'SELECT id,firstName,lastName,gender,email,number FROM registration ORDER BY ID LIMIT ? , ?',
      [skip,numPerPage],
      (error, results, fields) => {
        if (error) {
          callBack(error);
        }
        console.log(results);
        var responsePayload = {
          data: results
        };
        if (page < numPages) {
          responsePayload.pagination = {
            currentpage: page,
            perPage: numPerPage,
            previouspage: page > 0 ? page - 1 : undefined,
            nextpage: page < numPages - 1 ? page + 1 : undefined,
            previousrequest : page > 0 ? `http://localhost:4000/api/v1/users?npp=${numPerPage}&page=${page-1}`: undefined,
            nextrequest : page < numPages - 1 ? `http://localhost:4000/api/v1/users?npp=${numPerPage}&page=${page+1}`: undefined
          }
        }
        else responsePayload.pagination = {
          err: 'queried page ' + page + ' is >= to maximum page number ' + numPages
        }
        return callBack(null,responsePayload)
      }
    );
    }
  );
  },


  updateUser: (data, callBack) => {
    pool.query(
      `update registration set firstName=?, lastName=?, gender=?, email=?, password=?, number=? where id = ?`,
      [
        data.first_name,
        data.last_name,
        data.gender,
        data.email,
        data.password,
        data.number,
        data.id
      ],
      (error, results, fields) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  deleteUser: (data, callBack) => {
    pool.query(
      `delete from registration where id = ?`,
      [data.id],
      (error, results, fields) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  generateTokenAndRefreshToken: (data, callBack)=>{
    const jwtid = uuid.v4();
    console.log(process.env.EXPIRESIN);
    const jsontoken = sign({ id: data }, process.env.SECRET_KEY, {
      expiresIn: "2m",//2min
      jwtid: jwtid

      //We can add a subject For example user email (must be string)
    });

    pool.query("SELECT UUID() as uuid",(err, result, fields) => {
      if (err) throw err;
      if(result && result.length>0) {   
        pool.query(
          `insert into refreshtoken(Id,UserId, JwtId, Used, Invalidated, ExpiryDate, CreationDate) 
                    values(?,?,?,?,?,?,?)`,
          [
            result[0].uuid,
            data,
            jwtid,
            false,
            false,
            moment().add(10, "d").toDate(),
            moment().toDate()
          ],
          (error, results, fields) => {
            if (error) {
              callBack(error);              
            }
            var data = {token: jsontoken, refreshToken: result[0].uuid}
            callBack(null, data);
            return;
          }
        );
      }
      else{
          console.log("No data found")
      }
  });

    



  },

  getJwtId: (token,callBack) => {
    const decodedToken = decode(token);
    return callBack(null,{jti : decodedToken["jti"],id : decodedToken["id"]});
  },

  getRefreshToken : (data,callBack)=>{
    console.log(data);
    pool.query(
      `select Id,UserId, JwtId, Used, Invalidated, ExpiryDate, CreationDate from refreshtoken where Id = ?`,
      [data],
      (error, results, fields) => {
        if (error) {
          callBack(error);
        }
        if (!results[0]) return callBack(Error("Refresh token does not exist"));
    
        return callBack(null,results[0]);
      }
    );
  },

  getRefreshTokenByJwtToken : (data,callBack) =>{
    // retrieve the jti/jwt-id from that token
    getJwtId(token,(err,result)=>{
      pool.query(
        `select Id,UserId, JwtId, Used, Invalidated, ExpiryDate, CreationDate from refreshtoken where JwtId = ? and UserId = ?`,
        [result.jti,result.id],
        (error, results, fields) => {
          if (error) {
            callBack(error);
          }
          if (!results[0]) return callBack(Error("Refresh token does not exist"));
      
          return callBack(null,results[0]);
        }
      );

  

    });
  },

  markTokenAsUsed : (refreshtoken,callBack) => {
    pool.query(
      `Update refreshtoken set Used=? where Id = ?`,
      [
        true,       
        refreshtoken
      ],
      (error, results, fields) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  InvalidateToken : (refreshtoken,callBack) => {
    pool.query(
      `update refreshtoken set Invalidated=? where Id = ?`,
      [
        true,       
        refreshtoken
      ],
      (error, results, fields) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  IsValidRefreshToken : (data,callBack) =>{
    
  }

};

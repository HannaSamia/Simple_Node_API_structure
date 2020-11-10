module.exports = {
    make_response : (req, res, next) => {
        const body = {};
        body.success = true;
        body.status = res.responseStatus || 200;
        body.message = res.message || "Success";
        if(res.responseObject){
            body.result = res.responseObject;
        }
        res.status(body.status).send(body);
        return next();
      }
}
  
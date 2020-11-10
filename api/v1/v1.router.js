
var express = require('express');
var router = express.Router();
const { make_response } = require("../../middleware/http-response")

var version = "";
//var version = "/v1"

//users routes
router.use(`${version}/users`,require("./users/user.router"),make_response);

module.exports = router;
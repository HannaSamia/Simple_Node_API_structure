const router = require("express").Router();
const { checkToken } = require("../../../middleware/token_validation");
const {
  createUser,
  login,
  loginv2,
  getUserByUserId,
  getUsers,
  updateUsers,
  deleteUser,
  Refreshtoken,
  logout
} = require("./user.controller");

router.post("/login",login);
router.post("/login/promise",loginv2);
router.post("/token", Refreshtoken);
router.post("/logout",checkToken, logout);

router.post("/", createUser);
router.get("/", getUsers);
router.get("/:id", checkToken, getUserByUserId);
router.patch("/", checkToken, updateUsers);
router.delete("/", checkToken,deleteUser);

module.exports = router;

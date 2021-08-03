require("dotenv").config();
const express = require("express");
const app = express();
const v1Router = require("./api/v1/v1.router");


app.use(express.json());

//v1
//app.use("/api", v1Router);
app.use("/api/", v1Router);

app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  var message = error.message || "Something went wrong.";
  res.status(status).json({ success : false, status ,message: message });
});


const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log("server up and running on PORT :", port);
});

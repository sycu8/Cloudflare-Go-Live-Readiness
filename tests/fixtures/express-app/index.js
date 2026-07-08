const express = require("express");
const { exec } = require("child_process");

const app = express();

app.get("/", (req, res) => {
  res.send("Express fixture");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(3000, () => {
  console.log("Listening on 3000");
});

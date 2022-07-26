import express from "express";

export default function (app: express.Application) {
  app.get("/", (_req, res) => {
    res.send(
      "Hello App Runner. My name is RedStone node and I am doing good ;)"
    );
  });
}

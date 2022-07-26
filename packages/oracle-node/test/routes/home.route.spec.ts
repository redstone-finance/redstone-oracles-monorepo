import request from "supertest";
import { getApp } from "./_helpers";

const app = getApp();

describe("Custom url requests route", () => {
  test("Should send correct response ", async () => {
    const response = await request(app).get("/").expect(200);

    expect(response.text).toBe(
      "Hello App Runner. My name is RedStone node and I am doing good ;)"
    );
  });
});


declare var describe: any, it: any, beforeEach: any, afterEach: any;

import assert from "assert";
import http from "http";
import crypto from "crypto";
import * as httpie from "httpie";
import { JWT, JwtPayload, auth, Hash } from "../src/index";
import express from "express";

const TEST_PORT = 8888;

function get(segments: string, opts: Partial<httpie.Options> = undefined) {
  return httpie.get(`http://localhost:${TEST_PORT}${segments}`, opts);
}
function post(segments: string, opts: Partial<httpie.Options> = undefined) {
  return httpie.post(`http://localhost:${TEST_PORT}${segments}`, opts);
}

const passwordPlainText = "123456";

// JWT Secret for testing
// JWT.options.verify.algorithms = ['HS512'];
JWT.settings.secret = "@%^&";

describe("Auth", () => {

  let app: ReturnType<typeof express>;
  let server: http.Server;
  let fakedb: any = {};
  let onRegisterOptions: any;

  beforeEach(async () => {
    app = express();
    app.use(auth.prefix, auth.routes({

      onRegisterWithEmailAndPassword: async (email: string, password: string, options: any) => {
        fakedb[email] = password;
        onRegisterOptions = options;
        return { id: 100, email };
      },

      onFindUserByEmail: async (email: string) => {
        if (fakedb[email] !== undefined) {
          return { id: 100, email, password: fakedb[email] };
        } else {
          return null;
        }
      },

      // onGenerateToken
    }));
    app.get("/unprotected_route", (req, res) => res.json({ ok: true }));
    app.get("/protected_route", auth.middleware(), (req, res) => res.json({ ok: true }));

    fakedb = {}; // reset fakedb
    onRegisterOptions = undefined; // reset onRegisterOptions

    return new Promise<void>((resolve) => {
      server = app.listen(TEST_PORT, () => resolve());
    })
  });
  afterEach(() => server.close());

  describe("anonymous", () => {
    it("should allow to sign-in as 'anonymous'", async () => {
      const signIn = await post("/auth/anonymous");
      assert.ok(signIn.data.user);
      assert.ok(signIn.data.user.anonymousId);
      assert.ok(signIn.data.user.anonymous);
      assert.ok(signIn.data.token);
    });
  });

  describe("email/password", () => {
    it("onRegister: should allow to register", async () => {
      const register = await post("/auth/register", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "endel@colyseus.io",
          password: passwordPlainText
        }),
      });

      assert.deepStrictEqual({ ["endel@colyseus.io"]: await Hash.make(passwordPlainText) }, fakedb);
      assert.deepStrictEqual({ id: 100, email: "endel@colyseus.io", }, register.data.user);

      const token: any = await JWT.verify(register.data.token);
      assert.strictEqual(register.data.user.id, token.id);
      assert.strictEqual(register.data.user.email, token.email);
    });

    it("onRegister: should allow to upgrade token", async () => {
      const register = await post("/auth/register", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await JWT.sign({ id: 50, name: "Anonymous" })}`
        },
        body: JSON.stringify({
          email: "endel@colyseus.io",
          password: passwordPlainText
        }),
      });

      assert.strictEqual(onRegisterOptions.upgradingToken.id, 5
const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");
const ejs = require("ejs");

//import admin controllers/scripts

const AdminController = require("./controllers/AdminController");

// const buffer = require("buffer");

const path = require("path");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const emailjs = require("emailjs-com");
// import fetch from "node-fetch";

// const nodeFetch = require("node-fetch");

// const fetch = require("node-fetch");

require("dotenv").config();

const app = express();
// app.use(bodyParser.json);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.use(express.json());
app.set("view engine", "ejs");

app.use(cors());

const knex = require("knex");
const { response, request } = require("express");
const { text, urlencoded } = require("body-parser");
// const { restart } = require("nodemon");
const { nextTick } = require("process");
const db = knex({
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  },
});

//user vars
let email = "";
let phone = "";
let additional = "";

//more controllers here

app.get("/home", (req, res) => {
  res.json(req.body);
});

//handle Forgot Pass and send email

app.post("/forgotPass", async (req, res) => {
  try {
    const { email } = req.body;
    const Str = require("@supercharge/strings");
    const random = Str.random(8);

    if (!email) {
      return res.status(400).json("Incorrect form Submission");
    } else {
      bcrypt.hash(random, 10, function (err, hash) {
        db.transaction((trx) => {
          trx
            .select("email")
            .from("login")
            .where("email", "=", email)
            .returning("id")
            .then((foundUser) => {
              return trx

                .where("email", "=", foundUser[0].email)
                .update({
                  hash: hash,
                })
                .into("login")

                .returning("*")
                .then((loginEmail) => {
                  res.json(loginEmail[0].id);

                  data2 = {
                    service_id: "service_io7gsxk",
                    template_id: "template_gfgs63r",
                    user_id: process.env.user_id,
                    accessToken: process.env.accessToken,
                    template_params: {
                      message:
                        "Hello, we regret to know you have issues with your password. We have generated one for you. Use it to login, and perhaps change it.",
                      pass: random,
                      link: "www.terraweb.co.ke",

                      to_email: email,
                      // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
                    },
                  };

                  fetch("https://api.emailjs.com/api/v1.0/email/send", {
                    method: "post",
                    // body: JSON.stringify(data),
                    // contentType: "application/json",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(data2),
                  }).then(
                    function (res) {},
                    function (error) {}
                  );
                })
                .then(trx.commit)
                .catch(trx.rollback);
            })
            .catch((err) =>
              res
                .status(400)
                .json("unable to update, user perhaps already exists")
            );
        });
      });
    }
  } catch (err) {
    res.status(400).json("unable to forget pass. ");
  }
});

//update email and password
app.post("/update", async (req, res) => {
  try {
    const { id, email, password, confirmPass } = req.body;

    if (!id || !email || !password || !confirmPass) {
      return res.status(400).json("Incorrect form Submission");
    }
    //encrypt users password with bcrypt before storing in the db
    bcrypt.hash(confirmPass, 10, function (err, hash) {
      db.transaction((trx) => {
        trx
          .select("email", "hash")
          .from("login")
          .where("email", "=", req.body.email)
          .returning("id")
          .then((foundUser) => {
            if (!foundUser[0].hash) {
              throw Error("wrong credentials");
            }
            //if a user is found continue to update his/her password using the encryption
            bcrypt.compare(
              req.body.password,
              foundUser[0].hash,
              function (err, result) {
                const isValid = result;

                if (result === true) {
                  return trx

                    .where("email", "=", email)
                    .update({
                      hash: hash,
                    })
                    .into("login")

                    .returning("*")
                    .then((loginEmail) => {
                      res.json(loginEmail[0].id);
                      //prepare data to be sent to the user via email to notify them of the acc update
                      data2 = {
                        service_id: "service_io7gsxk",
                        template_id: "template_gfgs63r",
                        user_id: process.env.user_id,
                        accessToken: process.env.accessToken,
                        template_params: {
                          message:
                            "Hello, your account details have been successfully updated. Login to do more with Terraweb.",

                          link: "www.terraweb.co.ke",

                          to_email: email,
                          // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
                        },
                      };

                      fetch("https://api.emailjs.com/api/v1.0/email/send", {
                        method: "post",
                        // body: JSON.stringify(data),
                        // contentType: "application/json",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(data2),
                      }).then(
                        function (res) {},
                        function (error) {}
                      );
                    })
                    .then(trx.commit)
                    .catch(trx.rollback);
                }
              }
            );
          })
          .catch((err) => res.status(400).json("wrong credentilas"));
      });
    });
  } catch (err) {
    res.status(500).json("unable to update Acc. ");
  }
});

//register a user to Terraweb
app.post("/register", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(417).json("Incorrect form Submission");
    }
    //encrypt users password with bcrypt encryption
    bcrypt.hash(password, 10, function (err, hash) {
      db.transaction((trx) => {
        trx

          .insert({
            hash: hash,
            email: email,
          })
          .into("login")

          .returning("email")
          .then((loginEmail) => {
            return trx("users")
              .returning(["id", "email"])

              .insert({
                email: loginEmail[0],
                joined: new Date(),
              })
              .then((user) => {
                res.json(user[0].id);
                //handle email to be sent to the user for registering with terraweb
                data2 = {
                  service_id: "service_io7gsxk",
                  template_id: "template_gfgs63r",
                  user_id: process.env.user_id,
                  accessToken: process.env.accessToken,
                  template_params: {
                    message:
                      "Hello,Thank you for registering with Terraweb. Login to do more with Terraweb, for example, the excellent management of your AGRICULTURE data and more.",

                    link: "www.terraweb.co.ke",

                    to_email: req.body.email,
                    // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
                  },
                };

                fetch("https://api.emailjs.com/api/v1.0/email/send", {
                  method: "post",
                  // body: JSON.stringify(data),
                  // contentType: "application/json",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(data2),
                }).then(
                  function (res) {},
                  function (error) {}
                );
              });
          })
          .then(trx.commit)
          .catch(trx.rollback);
      }).catch((err) =>
        res
          .status(400)
          .json("Unable to register, user perhaps already exists err ")
      );
    });
  } catch (err) {
    res.status(500).json("unable to register user. ");
  }
});
//handle login of users
app.post("/login", (req, res) => {
  try {
    db.select("email", "hash")
      .from("login")
      .where("email", "=", req.body.email)
      .then((data) => {
        if (!data) {
          throw Error("Err. No user found with this email");
        }
        //bcrypt checks the password using its encryption
        bcrypt.compare(req.body.password, data[0].hash, function (err, result) {
          const isValid = result;

          if (result === true) {
            return db
              .select("*")
              .from("users")

              .where("email", "=", req.body.email)
              .then((user) => {
                let resP = JSON.stringify({
                  user: user[0].id,
                  email: user[0].email,
                });
                res.json(user);
              })
              .catch((err) => res.status(400).json("unable to get user"));
          } else {
            res.status(400).json("Wrong credentials");
          }
        });
      })
      .catch((err) => res.status(400).json("Wrong credentials"));
  } catch (err) {
    res.status(500).json("unable to login user. ");
  }
});
//default gateway to test if connections to the server are working
app.get("/", (req, res) => {
  res.json("This is working");
});
//this port changes depending on the server environment
const port = process.env.PORT || 3000;
//the server listens to all incoming connections through this port
app.listen(port || process.env.PORT, () => {
  console.log("app is running on port " + port);
});

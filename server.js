const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");
const ejs = require("ejs");
// const buffer = require("buffer");

const path = require("path");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const emailjs = require("emailjs-com");
// import fetch from "node-fetch";

// const nodeFetch = require("node-fetch");

// const fetch = require("node-fetch");

require("dotenv").config();

// const paypal = require("paypal-rest-sdk");
const paypal = require("@paypal/checkout-server-sdk");
const Environment =
  process.env.NODE_ENV === "production"
    ? paypal.core.LiveEnvironment
    : paypal.core.SandboxEnvironment;
const paypalClient = new paypal.core.PayPalHttpClient(
  new Environment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  )
);
const productItems = new Map([
  [
    1,
    {
      price: 550,
      name: "Rev captioning at discounted price",
      account: "Captioning Account",
    },
  ],
  [
    2,
    {
      price: 550,
      name: "Rev transcription at discounted price",
      account: "Transcription Account",
    },
  ],
  [
    3,
    {
      price: 450,
      name: "Rev translation at discounted price",
      account: "Translation Account",
    },
  ],

  [
    4,
    {
      price: 200,
      name: "Rev verification at discounted price",
      account: "Verification service",
    },
  ],
  [
    5,
    {
      price: 50,
      name: "Captioning Training - discounted price",
      account: "Captioning Training service",
    },
  ],
  [
    6,
    {
      price: 60,
      name: "Transcription Training - discounted price",
      account: "Transcription Training service",
    },
  ],
]);

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
    ssl: true,
  },
});

//email vars
let email = "";
let phone = "";
let additional = "";

app.get("/home", (req, res) => {
  res.json(req.body);
  // res.render("indexTranscription", {
  // paypalClientId: process.env.PAYPAL_CLIENT_ID,
});

//send payments to pp
app.post("/checkout", async (req, res) => {
  const request = new paypal.orders.OrdersCreateRequest();
  const total = req.body.items.reduce((sum, item) => {
    return sum + productItems.get(item.id).price * item.quantity;
  }, 0);
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: total,
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: total,
            },
          },
        },
        items: req.body.items.map((item) => {
          const storeItem = productItems.get(item.id);

          return {
            name: storeItem.name,
            unit_amount: {
              currency_code: "USD",
              value: storeItem.price,
            },
            quantity: item.quantity,
          };
        }),
      },
    ],
  });
  let id = "";
  try {
    const order = await paypalClient.execute(request);
    id = order.result.id;

    res.json({ id: order.result.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
//on Approve
app.post("/getorder", async (req, res) => {
  orderId = req.body.orderID;

  paypalRequest = new paypal.orders.OrdersCaptureRequest(orderId);
  paypalRequest.requestBody({});
  // Call API with your client and get a response for your call
  let paypalResponse = await paypalClient.execute(paypalRequest);

  //get item type

  const storeItem = productItems.get(req.body.id);

  if (req.body.id === 4) {
    //get payer names
    let fulname1 = JSON.stringify(paypalResponse.result.payer.name).replace(
      /"|{|}/g,
      ""
    );

    let fulname2 = fulname1.replace(/given_name/, "first name");

    //send email to admin
    // code fragment
    data = {
      service_id: "service_io7gsxk",
      template_id: "template_qkv44u7",
      user_id: process.env.user_id,
      accessToken: process.env.accessToken,
      template_params: {
        account: storeItem.account,
        personalEmail: req.body.email,
        phone: req.body.phone,
        additional: req.body.additional,
        accEmail: req.body.accEmail,
        accPassword: req.body.accPassword,
        accLocation: req.body.accLocation,
        recoveryEmail: req.body.recoveryEmail,

        fullname: fulname2,
        payerEmail: paypalResponse.result.payer.email_address,
        to_email: "vinnyvincente14@gmail.com",
        // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
      },
    };

    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "post",
      // body: JSON.stringify(data),
      // contentType: "application/json",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).then(
      function (res) {},
      function (error) {}
    );
    data2 = {
      service_id: "service_io7gsxk",
      template_id: "template_kw2tccu",
      user_id: process.env.user_id,
      accessToken: process.env.accessToken,
      template_params: {
        account: storeItem.account,
        message:
          "Please note that our representative will get back to you in no time and deliver the verification details straight to your mail inbox. We hope you'll bear some patience while we get everything ready for you. ",
        personalEmail: req.body.email,

        to_email: "vinnyvincente14@gmail.com",
        // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
      },
    };

    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
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
  } else {
    //get payer names
    let fulname1 = JSON.stringify(paypalResponse.result.payer.name).replace(
      /"|{|}/g,
      ""
    );

    let fulname2 = fulname1.replace(/given_name/, "first name");

    //send email to admin
    // code fragment
    data = {
      service_id: "service_io7gsxk",
      template_id: "template_fovatl8",
      user_id: process.env.user_id,
      accessToken: process.env.accessToken,
      template_params: {
        account: storeItem.account,
        personalEmail: req.body.email,
        phone: req.body.phone,
        additional: req.body.additional,
        fullname: fulname2,
        payerEmail: paypalResponse.result.payer.email_address,
        to_email: "vinnyvincente14@gmail.com",
        // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
      },
    };

    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "post",
      // body: JSON.stringify(data),
      // contentType: "application/json",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).then(
      function (res) {},
      function (error) {}
    );
    data2 = {
      service_id: "service_io7gsxk",
      template_id: "template_kw2tccu",
      user_id: process.env.user_id,
      accessToken: process.env.accessToken,
      template_params: {
        account: storeItem.account,
        message:
          "Please note that our representative will get back to you in no time and deliver the login details straight to your mail inbox. We hope you'll bear some patience while we get everything ready for you.",
        personalEmail: req.body.email,

        to_email: "vinnyvincente14@gmail.com",
        // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
      },
    };

    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
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
  }
  return res.json("success");
});

//on approve Training Payment
app.post("/getTrainingOrder", async (req, res) => {
  orderId = req.body.orderID;

  paypalRequest = new paypal.orders.OrdersCaptureRequest(orderId);
  paypalRequest.requestBody({});
  // Call API with your client and get a response for your call
  let paypalResponse = await paypalClient.execute(paypalRequest);

  //get item type

  const storeItem = productItems.get(req.body.id);

  if (req.body.id === 5) {
    //get payer names
    let fulname1 = JSON.stringify(paypalResponse.result.payer.name).replace(
      /"|{|}/g,
      ""
    );

    let fulname2 = fulname1.replace(/given_name/, "first name");

    //send email to admin
    // code fragment
    data = {
      service_id: "service_io7gsxk",
      template_id: "template_0b6bhbm",
      user_id: process.env.user_id,
      accessToken: process.env.accessToken,
      template_params: {
        account: storeItem.account,
        personalEmail: req.body.email,
        fname: req.body.Fname,
        lname: req.body.Lname,
        phone: req.body.Phone,
        category: req.body.trainingCategory,
        mode: req.body.trainingMode,
        reservDate: req.body.selectedDate,
        trainingTime: req.body.reservTime,

        fullname: fulname2,
        payerEmail: paypalResponse.result.payer.email_address,
        to_email: "vinnyvincente14@gmail.com",
        // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
      },
    };

    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "post",
      // body: JSON.stringify(data),
      // contentType: "application/json",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).then(
      function (res) {},
      function (error) {}
    );
    data2 = {
      service_id: "service_io7gsxk",
      template_id: "template_kw2tccu",
      user_id: process.env.user_id,
      accessToken: process.env.accessToken,
      template_params: {
        account: storeItem.account,
        message:
          "Please note that our educator will book you the training and reply to you inno time. We hope you'll bear some patience while we get everything ready for you. ",
        personalEmail: req.body.email,

        to_email: "vinnyvincente14@gmail.com",
        // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
      },
    };

    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
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
  } else {
    //get payer names
    let fulname1 = JSON.stringify(paypalResponse.result.payer.name).replace(
      /"|{|}/g,
      ""
    );

    let fulname2 = fulname1.replace(/given_name/, "first name");

    //send email to admin
    // code fragment
    data = {
      service_id: "service_io7gsxk",
      template_id: "template_0b6bhbm",
      user_id: process.env.user_id,
      accessToken: process.env.accessToken,
      template_params: {
        account: storeItem.account,
        personalEmail: req.body.email,
        fname: req.body.Fname,
        lname: req.body.Lname,
        phone: req.body.Phone,
        category: req.body.trainingCategory,
        mode: req.body.trainingMode,
        reservDate: req.body.selectedDate,
        trainingTime: req.body.reservTime,

        fullname: fulname2,
        payerEmail: paypalResponse.result.payer.email_address,
        to_email: "vinnyvincente14@gmail.com",
        // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
      },
    };

    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "post",
      // body: JSON.stringify(data),
      // contentType: "application/json",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).then(
      function (res) {},
      function (error) {}
    );
    data2 = {
      service_id: "service_io7gsxk",
      template_id: "template_kw2tccu",
      user_id: process.env.user_id,
      accessToken: process.env.accessToken,
      template_params: {
        account: storeItem.account,
        personalEmail: req.body.email,

        to_email: "vinnyvincente14@gmail.com",
        // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
      },
    };

    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
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
  }
  return res.json("success");
});

//Forgot Pass send email

app.post("/forgotPass", async (req, res) => {
  try {
    const { id, email } = req.body;
    const Str = require("@supercharge/strings");
    const random = Str.random(8);

    if (!id || !email) {
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
                      link: "revsite.co",

                      to_email: "vinnyvincente14@gmail.com",
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
    bcrypt.hash(confirmPass, 10, function (err, hash) {
      db.transaction((trx) => {
        trx
          .select("email", "hash")
          .from("login")
          .where("email", "=", req.body.email)
          .returning("id")
          .then((foundUser) => {
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

                      data2 = {
                        service_id: "service_io7gsxk",
                        template_id: "template_gfgs63r",
                        user_id: process.env.user_id,
                        accessToken: process.env.accessToken,
                        template_params: {
                          message:
                            "Hello, your account details have been successfully updated. Login to view more of Revsite.",

                          link: "revsite.co",

                          to_email: "vinnyvincente14@gmail.com",
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
                } else {
                  res.status(400).json("Wrong credentials");
                }
              }
            );
          })
          .catch((err) =>
            res
              .status(400)
              .json("unable to update, user perhaps already exists")
          );
      });
    });
  } catch (err) {
    // res.status(400).json("unable to update Acc. ");
  }
});

app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json("Incorrect form Submission");
    }
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

                data2 = {
                  service_id: "service_io7gsxk",
                  template_id: "template_gfgs63r",
                  user_id: process.env.user_id,
                  accessToken: process.env.accessToken,
                  template_params: {
                    message:
                      "Hello,Thank you for your Revsite registration. Login to view more of Revsite, for example, the excellent training on Rev.com captioning etc.",

                    link: "revsite.co",

                    to_email: "vinnyvincente14@gmail.com",
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
        res.status(400).json("unable to register, user perhaps already exists")
      );
    });
  } catch (err) {
    res.status(400).json("unable to register user. ");
  }
});

app.post("/login", (req, res) => {
  try {
    db.select("email", "hash")
      .from("login")
      .where("email", "=", req.body.email)
      .then((data) => {
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
    res.status(400).json("unable to login user. ");
  }
});

app.get("/", (req, res) => {
  res.json("This is working");
});

const port = process.env.PORT || 3000;

app.listen(port || process.env.PORT, () => {
  console.log("app is running on port " + port);
});

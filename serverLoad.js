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
      price: 20,
      name: "Rev captioning at discounted price",
      account: "Captioning Account",
    },
  ],
  [
    2,
    {
      price: 51,
      name: "Rev transcription at discounted price",
      account: "Transcription Account",
    },
  ],
  [
    3,
    {
      price: 52,
      name: "Rev translation at discounted price",
      account: "Translation Account",
    },
  ],

  [
    4,
    {
      price: 54,
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
const { restart } = require("nodemon");
const { nextTick } = require("process");
const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: "C1995",
    database: "revSitedb",
  },
});

//email vars
let email = "";
let phone = "";
let additional = "";

//port variable
const PORT = process.env.PORT;

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
  console.log(req.body);
  orderId = req.body.orderID;

  paypalRequest = new paypal.orders.OrdersCaptureRequest(orderId);
  paypalRequest.requestBody({});
  // Call API with your client and get a response for your call
  let paypalResponse = await paypalClient.execute(paypalRequest);
  console.log(`Response: ${JSON.stringify(paypalResponse)}`);
  // If call returns body in response, you can get the deserialized version from the result attribute of the response.
  console.log("Capture: ", paypalResponse);

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
          "Please note that our representative will get back to you in no time and deliver the verification details straight to your mail inbox. We hope you'll bear some patience while we get everything ready for you. Also, don't reverse the payment as this will take some more time to settle.",
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
    console.log("account Name ", storeItem.account);

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
          "Please note that our representative will get back to you in no time and deliver the login details straight to your mail inbox. We hope you'll bear some patience while we get everything ready for you. Also, don't reverse the payment as this will some more time to settle.",
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
  console.log(req.body);
  orderId = req.body.orderID;

  paypalRequest = new paypal.orders.OrdersCaptureRequest(orderId);
  paypalRequest.requestBody({});
  // Call API with your client and get a response for your call
  let paypalResponse = await paypalClient.execute(paypalRequest);
  console.log(`Response: ${JSON.stringify(paypalResponse)}`);
  // If call returns body in response, you can get the deserialized version from the result attribute of the response.
  console.log("Capture: ", paypalResponse);

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
          "Please note that our educator will book you the training and reply to you inno time. We hope you'll bear some patience while we get everything ready for you. Also, don't reverse the payment as this will some more time to settle.",
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

app.post("/forgotPass", (req, res) => {
  db.select("email", "hash")
    .from("login")
    .where("email", "=", req.body.email)
    .then((data) => {
      bcrypt.compare(req.body.password, data[0].hash, function (err, result) {
        const isValid = result;
        console.log(result);
        if (result === true) {
          return db
            .select("*")
            .from("users")
            .where("email", "=", req.body.email)
            .then((user) => {
              res.json(user[0]);
              console.log("my user", user);
            })
            .catch((err) => res.status(400).json("unable to get user"));
        } else {
          res.status(400).json("Wrong credentials");
        }
      });
    })
    .catch((err) => res.status(400).json("Wrong credentials"));
});

//update email and password
app.post("/update", (req, res) => {
  const { id, oldEmail, email, password } = req.body;

  if (!id || !oldEmail || !email || !password) {
    return res.status(400).json("Incorrect form Submission");
  }
  bcrypt.hash(password, 10, function (err, hash) {
    db.transaction((trx) => {
      trx
        .select("*")
        .from("login")
        .returning("id")
        .then((foundUser) => {
          bcrypt.compare(
            req.body.password,
            data[0].hash,
            function (err, result) {
              const isValid = result;
              console.log(result);
              if (result === true) {
                return (
                  trx
                    /*  // .insert({
                  //   hash: hash,
                  //   email: email,
                  // }) */

                    .where("email", "=", oldEmail)
                    .update({
                      hash: hash,

                      email: email,
                    })
                    .into("login")

                    .returning("*")
                    .then((loginEmail) => {
                      console.log("My id ", id);
                      console.log("Login email ", loginEmail);
                      // res.json(loginEmail[1]);
                      return trx("users")
                        .update({
                          email: email,
                        })
                        .where({ id })
                        .returning("*")
                        .then((user) => {
                          res.json(user[0]);
                          console.log("update user ", user);
                        });
                    })
                    .then(trx.commit)
                    .catch(trx.rollback)
                );
              } else {
                res.status(400).json("Wrong credentials");
              }
            }
          );
        });

      trx
        .select("*")
        .from("login")
        .where("email", "=", oldEmail)
        .returning("id")
        .then((newUser) => {
          console.log("newUser login", newUser);

          return (
            trx
              /*  // .insert({
              //   hash: hash,
              //   email: email,
              // }) */

              .where("email", "=", oldEmail)
              .update({
                hash: hash,

                email: email,
              })
              .into("login")

              .returning("*")
              .then((loginEmail) => {
                console.log("My id ", id);
                console.log("Login email ", loginEmail);
                // res.json(loginEmail[1]);
                return trx("users")
                  .update({
                    email: email,
                  })
                  .where({ id })
                  .returning("*")
                  .then((user) => {
                    res.json(user[0]);
                    console.log("update user ", user);
                  });
              })
              .then(trx.commit)
              .catch(trx.rollback)
          );
        })
        .catch((err) =>
          res.status(400).json("unable to update, user perhaps already exists")
        );
    });
  });
});

app.post("/register", (req, res) => {
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
            .returning("*")

            .insert({
              email: loginEmail[0],
              joined: new Date(),
            })
            .then((user) => {
              res.json(user[0]);
            });
        })
        .then(trx.commit)
        .catch(trx.rollback);
    }).catch((err) =>
      res.status(400).json("unable to register, user perhaps already exists")
    );
  });
});

app.post("/login", (req, res) => {
  db.select("email", "hash")
    .from("login")
    .where("email", "=", req.body.email)
    .then((data) => {
      bcrypt.compare(req.body.password, data[0].hash, function (err, result) {
        const isValid = result;
        console.log(result);
        if (result === true) {
          return db
            .select("*")
            .from("users")
            .where("email", "=", req.body.email)
            .then((user) => {
              res.json(user[0]);
              console.log("my user", user);
            })
            .catch((err) => res.status(400).json("unable to get user"));
        } else {
          res.status(400).json("Wrong credentials");
        }
      });
    })
    .catch((err) => res.status(400).json("Wrong credentials"));
});

app.get("/", (req, res) => {
  // res.render("index", {
  //   paypalClientId: process.env.PAYPAL_CLIENT_ID,
  // });

  res.json("This is working");
});

app.listen(3000, () => {
  console.log("app is running on port 3000");
});

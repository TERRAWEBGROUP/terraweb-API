const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");
const ejs = require("ejs");
const cookieParser = require("cookie-parser");

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

//cookie parser
app.use(cookieParser());

app.use(cors());

const knex = require("knex");
const { response, request } = require("express");
const { text, urlencoded } = require("body-parser");
// const { restart } = require("nodemon");
const { nextTick } = require("process");
const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    user: "postgres",
    password: "C1995",
    database: "terrawebDB",
  },
});

//user vars
let email = "";
let phone = "";
let additional = "";

//session variable
let session;

//more controllers here

//handle change password

//handle account update

//handle summary
app.post("/getsummary", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json("Incorrect form Submission");
    }
    let agentusername = null;
    let agentearnings = null;

    db.transaction((trx) => {
      return trx
        .select("id", "username", "earnings")
        .from("agenttbl")
        .where("id", "=", id)
        .then((data) => {
          agentusername = data[0].username;
          agentearnings = data[0].earnings;

          if (data <= 0) {
            throw Error("Err. No accounts found.");
          } else {
          }

          return trx
            .select(
              "accid",
              "acctype",

              "sold",

              "booked",
              "shareid"
            )
            .from("accountstbl")
            .where("sold", "=", "no")

            .then((user) => {
              let resP = [];
              for (const val of user) {
                resP.push({
                  accid: val.accid,
                  acctype: val.acctype,

                  sold: val.sold,

                  booked: val.booked,
                  username: agentusername,
                  earnings: agentearnings,
                  shareid: val.shareid,
                });
              }

              res.json(resP);
            })
            .catch((err) =>
              res.status(400).json("an error occurred while getting records")
            );
        })
        .catch((err) =>
          res.status(400).json("an error occurred while retrieving records")
        );
    });
  } catch (err) {
    res.status(500).json("internal server error. ");
  }
});

//handle add new record
app.post("/addnewrecord", (req, res) => {
  try {
    const { adminid, producttype, weight, companyname, fullname } = req.body;
    if (!adminid || !producttype || !weight || !companyname || !fullname) {
      return res.status(417).json("Incorrect form Submission");
    }

    db.transaction((trx) => {
      return trx("records")
        .returning([
          "producttype",
          "weight",
          "companyname",
          "fullname",
          "daterecorded",
        ])

        .insert({
          producttype: producttype,
          weight: weight,
          companyname: companyname,
          fullname: fullname,
          daterecorded: new Date(),
        })
        .then((user) => {
          res.json("Record added successfully");
        })
        .then(trx.commit)
        .catch(trx.rollback);
    }).catch((err) =>
      res
        .status(400)
        .json("Unable to add record, check your entries and try again ")
    );
  } catch (err) {
    res.status(500).json("internal server error ");
  }
});

//handle get daily records
app.post("/getRecords", async (req, res) => {
  try {
    const { userid } = req.body;
    if (!userid) {
      return res.status(400).json("Incorrect form Submission");
    }
    let fullname = "";

    db.transaction((trx) => {
      trx
        .select("fullname")
        .from("users")
        .where("userid", "=", userid)

        .then((user) => {
          // console.log(user[0].fullname);
          fullname = user[0].fullname;

          return trx("records")
            .select(
              "id",
              "producttype",
              "weight",

              "companyname",
              "fullname",
              "daterecorded"
            )

            .where("fullname", "=", fullname)

            .then((founduser) => {
              let resP = [];
              for (const val of founduser) {
                resP.push({
                  id: val.id,
                  producttype: val.producttype,

                  weight: val.weight,

                  companyname: val.companyname,
                  fullname: val.fullname,
                  daterecorded: val.daterecorded,
                });
              }

              res.json(resP);
            });
        })
        .then(trx.commit)
        .catch(trx.rollback);
    }).catch((err) =>
      res
        .status(400)
        .json("Unable to register, user perhaps already exists " + err)
    );
  } catch (err) {
    res.status(500).json("internal server error. " + err);
  }
});

//handle delete user
app.post("/deleteuser", async (req, res) => {
  try {
    const { adminID, email } = req.body;

    if (!adminID || !email) {
      return res.status(400).json("Incorrect form Submission");
    }

    db.transaction((trx) => {
      trx

        .from("agentlogintbl")
        .where("email", "=", req.body.email)
        .del()
        .returning("id")
        .then((foundUser) => {
          if (foundUser <= 0) {
            throw Error("agent not found");
          } else {
            return trx

              .where("email", "=", email)
              .del()
              .from("agenttbl")

              .returning("*")
              .then((loginEmail) => {
                res.json("agent details deleted successully");

                data2 = {
                  service_id: "service_io7gsxk",
                  template_id: "template_gfgs63r",
                  user_id: process.env.user_id,
                  accessToken: process.env.accessToken,
                  template_params: {
                    message:
                      "Hello agent, your account has been successfully deactivated by admin due to unavoidable circumstances.",

                    link: "www.revsite.co/support",

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
        })
        .catch((err) => res.status(400).json("wrong credentilas"));
    });
  } catch (err) {
    res.status(500).json("unable to delete Acc.Server error ");
  }
});

//handle add user to db

app.post("/adduser", (req, res) => {
  try {
    const { adminid, username, email, password } = req.body;
    if (!adminid || !email || !password || !username) {
      return res.status(417).json("Incorrect form Submission");
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
              .returning(["id", "email", "joined"])

              .insert({
                username: username,
                email: loginEmail[0],
                joined: new Date(),
              })
              .then((user) => {
                res.json("User registered successfully");

                // data2 = {
                //   service_id: "service_io7gsxk",
                //   template_id: "template_gfgs63r",
                //   user_id: process.env.user_id,
                //   accessToken: process.env.accessToken,
                //   template_params: {
                //     message:
                //       "Welcome aboard dear agent,Thank you for your Revsite agent dashboard registration. Login to your dashboard to view more of Revsite.",

                //     link: "agent.revsite.co",

                //     to_email: req.body.email,
                //     // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
                //   },
                // };

                // fetch("https://api.emailjs.com/api/v1.0/email/send", {
                //   method: "post",
                //   // body: JSON.stringify(data),
                //   // contentType: "application/json",
                //   headers: {
                //     "Content-Type": "application/json",
                //   },
                //   body: JSON.stringify(data2),
                // }).then(
                //   function (res) {},

                //   function (error) {}
                // );
              });
          })
          .then(trx.commit)
          .catch(trx.rollback);
      }).catch((err) =>
        res
          .status(400)
          .json(
            "Unable to register, user email perhaps already exists err " + err
          )
      );
    });
  } catch (err) {
    res.status(500).json("internal server error ");
  }
});

//handle add admin to db
app.post("/addAdmin", (req, res) => {
  try {
    const { adminid, email, username, password } = req.body;
    if (!adminid || !email || !username || !password) {
      return res.status(417).json("Incorrect form Submission");
    }

    const Str = require("@supercharge/strings");
    const random = Str.random(6);

    //encrypt users password with bcrypt encryption
    bcrypt.hash(password, 10, function (err, hash) {
      db.transaction((trx) => {
        trx

          .insert({
            hash: hash,
            email: email,
            adminid: username + "_" + random,
          })
          .into("login")

          .returning("email", "adminid")
          .then((loginEmail) => {
            return trx("users")
              .returning(["adminid", "email"])

              .insert({
                adminid: loginEmail[1],

                email: loginEmail[0],

                username: username,
                joined: new Date(),

                adminid: username + "_" + random,

                category: "admin",
              })
              .then((admin) => {
                res.json(admin[0].adminid);
                //handle email to be sent to the user for registering with terraweb
                // data2 = {
                //   service_id: "service_io7gsxk",
                //   template_id: "template_gfgs63r",
                //   user_id: process.env.user_id,
                //   accessToken: process.env.accessToken,
                //   template_params: {
                //     message:
                //       "Hello,Thank you for registering with Terraweb. Login to do more with Terraweb, for example, the excellent management of your AGRICULTURE data and more.",

                //     link: "www.terraweb.co.ke",

                //     to_email: req.body.email,
                //     // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
                //   },
                // };

                // fetch("https://api.emailjs.com/api/v1.0/email/send", {
                //   method: "post",
                //   // body: JSON.stringify(data),
                //   // contentType: "application/json",
                //   headers: {
                //     "Content-Type": "application/json",
                //   },
                //   body: JSON.stringify(data2),
                // }).then(
                //   function (res) {},
                //   function (error) {}
                // );
              });
          })
          .then(trx.commit)
          .catch(trx.rollback);
      }).catch((err) =>
        res
          .status(400)
          .json("Unable to register, user perhaps already exists " + err)
      );
    });
  } catch (err) {
    res.status(500).json("unable to register user. ");
  }
});

//handle get users
app.post("/getusers", async (req, res) => {
  try {
    const { adminid } = req.body;
    if (!adminid) {
      return res.status(400).json("Incorrect form Submission");
    }
    let agentusername = null;
    let agentearnings = null;

    db.transaction((trx) => {
      return trx
        .select("id", "username", "email", "joined", "company")
        .from("users")
        .where("category", "=", "admin")

        .then((user) => {
          let resP = [];
          for (const val of user) {
            resP.push({
              id: val.id,
              username: val.username,

              email: val.email,

              joined: val.joined,
              company: val.company,
            });
          }

          res.json(resP);
        })
        .catch((err) =>
          res.status(400).json("an error occurred while getting users " + err)
        )

        .catch((err) =>
          res.status(400).json("an error occurred while retrieving users")
        );
    });
  } catch (err) {
    res.status(500).json("internal server error. ");
  }
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

                  // data2 = {
                  //   service_id: "service_io7gsxk",
                  //   template_id: "template_gfgs63r",
                  //   user_id: process.env.user_id,
                  //   accessToken: process.env.accessToken,
                  //   template_params: {
                  //     message:
                  //       "Hello, we regret to know you have issues with your password. We have generated one for you. Use it to login, and perhaps change it.",
                  //     pass: random,
                  //     link: "www.terraweb.co.ke",

                  //     to_email: email,
                  //     // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
                  //   },
                  // };

                  // fetch("https://api.emailjs.com/api/v1.0/email/send", {
                  //   method: "post",
                  //   // body: JSON.stringify(data),
                  //   // contentType: "application/json",
                  //   headers: {
                  //     "Content-Type": "application/json",
                  //   },
                  //   body: JSON.stringify(data2),
                  // }).then(
                  //   function (res) {},
                  //   function (error) {}
                  // );
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

//register admin
app.post("/registerAdmin", (req, res) => {
  try {
    const {
    fullname,
      email,
      username,
      password,
      company,
      phone,
      gender,
    } = req.body;
    if (
      !fullname ||
      !email ||
      !username ||
      !password ||
      !phone ||
      !gender
    ) {
      return res.status(417).json("Incorrect form Submission");
    }

    const Str = require("@supercharge/strings");
    const random = Str.random(6);

    //encrypt users password with bcrypt encryption
    bcrypt.hash(password, 10, function (err, hash) {
      db.transaction((trx) => {
        trx

          .insert({
            hash: hash,
            email: email,
            adminid: username + "_" + random,
          })
          .into("login")

          .returning("email", "adminid")
          .then((loginEmail) => {
            return trx("users")
              .returning(["adminid", "email"])

              .insert({
                adminid: loginEmail[1],
                fullname: fullname,
              
                email: loginEmail[0],
                phone: phone,
                gender: gender,
                username: username,
                joined: new Date(),
                company: company,
                adminid: username + "_" + random,

                category: "admin",
              })
              .then((admin) => {
                res.json(admin[0].adminid);
                //handle email to be sent to the user for registering with terraweb
                // data2 = {
                //   service_id: "service_io7gsxk",
                //   template_id: "template_gfgs63r",
                //   user_id: process.env.user_id,
                //   accessToken: process.env.accessToken,
                //   template_params: {
                //     message:
                //       "Hello,Thank you for registering with Terraweb. Login to do more with Terraweb, for example, the excellent management of your AGRICULTURE data and more.",

                //     link: "www.terraweb.co.ke",

                //     to_email: req.body.email,
                //     // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
                //   },
                // };

                // fetch("https://api.emailjs.com/api/v1.0/email/send", {
                //   method: "post",
                //   // body: JSON.stringify(data),
                //   // contentType: "application/json",
                //   headers: {
                //     "Content-Type": "application/json",
                //   },
                //   body: JSON.stringify(data2),
                // }).then(
                //   function (res) {},
                //   function (error) {}
                // );
              });
          })
          .then(trx.commit)
          .catch(trx.rollback);
      }).catch((err) =>
        res
          .status(400)
          .json("Unable to register, user perhaps already exists " + err)
      );
    });
  } catch (err) {
    res.status(500).json("unable to register user. ");
  }
});

//register a user to Terraweb
app.post("/registerUser", (req, res) => {
  try {
    const {
     fullname,
      email,
      username,
      password,
      company,
      phone,
      gender,
    } = req.body;
    if (
      !fullname ||
      !email ||
      !username ||
      !password ||
      !phone ||
      !gender
    ) {
      return res.status(417).json("Incorrect form Submission");
    }

    const Str = require("@supercharge/strings");
    const random = Str.random(6);

    //encrypt users password with bcrypt encryption
    bcrypt.hash(password, 10, function (err, hash) {
      db.transaction((trx) => {
        trx

          .insert({
            hash: hash,
            email: email,
            userid: username + "_" + random,
          })
          .into("login")

          .returning("email", "userid")
          .then((loginEmail) => {
            return trx("users")
              .returning(["userid", "email"])

              .insert({
                userid: loginEmail[1],
                fullname: fullname,
        
                email: loginEmail[0],
                phone: phone,
                gender: gender,
                username: username,
                joined: new Date(),
                company: company,
                userid: username + "_" + random,

                category: "user",
              })
              .then((user) => {
                res.json(user[0].userid);
                //handle email to be sent to the user for registering with terraweb
                // data2 = {
                //   service_id: "service_io7gsxk",
                //   template_id: "template_gfgs63r",
                //   user_id: process.env.user_id,
                //   accessToken: process.env.accessToken,
                //   template_params: {
                //     message:
                //       "Hello,Thank you for registering with Terraweb. Login to do more with Terraweb, for example, the excellent management of your AGRICULTURE data and more.",

                //     link: "www.terraweb.co.ke",

                //     to_email: req.body.email,
                //     // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
                //   },
                // };

                // fetch("https://api.emailjs.com/api/v1.0/email/send", {
                //   method: "post",
                //   // body: JSON.stringify(data),
                //   // contentType: "application/json",
                //   headers: {
                //     "Content-Type": "application/json",
                //   },
                //   body: JSON.stringify(data2),
                // }).then(
                //   function (res) {},
                //   function (error) {}
                // );
              });
          })
          .then(trx.commit)
          .catch(trx.rollback);
      }).catch((err) =>
        res
          .status(400)
          .json("Unable to register, user perhaps already exists " + err)
      );
    });
  } catch (err) {
    res.status(500).json("unable to register user. ");
  }
});

//handle login of users
app.post("/login", (req, res) => {
  try {
    //generate random session id
    const Str = require("@supercharge/strings");
    let random = Str.random(8);

    //check if user is logged in first before creating a new session

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
            db.transaction((trx) => {
              trx
                .select("*")
                .from("users")

                .where("email", "=", req.body.email)
                .then((user) => {
                  let resP = JSON.stringify({
                    sessioniduser: user[0].userid,
                    sessionidadmin: user[0].adminid,
                  });

                  res.status(200).json({
                    sessioniduser: user[0].userid,
                    sessionidadmin: user[0].adminid,
                  });
                  // res.json();
                  //after verifying the login credentials, assign the username to the session variable
                  // session = req.session;
                  // session.userid = req.body.username;
                  // console.log(req.session);
                  //send the user credentials to enable in cookie storage - visit this later
                  // res.json(user);

                  //handle email to be sent to the user for registering with terraweb
                  // data2 = {
                  //   service_id: "service_io7gsxk",
                  //   template_id: "template_gfgs63r",
                  //   user_id: process.env.user_id,
                  //   accessToken: process.env.accessToken,
                  //   template_params: {
                  //     message:
                  //       "Hello,Thank you for registering with Terraweb. Login to do more with Terraweb, for example, the excellent management of your AGRICULTURE data and more.",
                  //     link: "www.terraweb.co.ke",
                  //     to_email: req.body.email,
                  //     // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
                  //   },
                  // };
                  // fetch("https://api.emailjs.com/api/v1.0/email/send", {
                  //   method: "post",
                  //   // body: JSON.stringify(data),
                  //   // contentType: "application/json",
                  //   headers: {
                  //     "Content-Type": "application/json",
                  //   },
                  //   body: JSON.stringify(data2),
                  // }).then(
                  //   function (res) {},
                  //   function (error) {}
                  // );
                })

                .then(trx.commit)
                .catch(trx.rollback);
            }).catch((err) =>
              res
                .status(400)
                .json(
                  "Unable to create session, session perhaps already exists " +
                    err
                )
            );
          } else {
            res.status(400).json("Wrong credentials");
          }
        });
      })
      .catch((err) => res.status(400).json("Wrong credentials" + err));
  } catch (err) {
    res.status(500).json("unable to login user. ");
  }
});

//logout gateway
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

//default gateway to test if connections to the server are working
app.get("/", (req, res) => {
  res.json("The server is up and running.");
});
//this port changes depending on the server environment
const port = 8000 || process.env.PORT;
//the server listens to all incoming connections through this port
app.listen(port || process.env.PORT, () => {
  console.log("app is running on port " + port);
});

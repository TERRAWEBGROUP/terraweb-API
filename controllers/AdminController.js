//validate shareid
const handleValidate = (req, res, db, fetch) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json("Incorrect form Submission");
    }
    let agentusername = null;
    let agentearnings = null;

    db.transaction((trx) => {
      return trx
        .select("shareid")
        .from("accountstbl")
        .where("shareid", "=", id)

        .then((user) => {
          if (user.length > 0) {
            res.json(user);
          } else {
            return res.status(404).json("Not Found");
          }
        })
        .catch((err) =>
          res.status(400).json("an error occurred while getting records")
        );
    });
  } catch (err) {
    res.status(500).json("internal server error. ");
  }
};

//send query email to revsite
const handleSendquery = async (req, res, fetch) => {
  try {
    const { id, email, description } = req.body;

    if (!id || !email || !description) {
      return res.status(400).json("Incorrect form Submission");
    } else {
      data2 = {
        service_id: "service_io7gsxk",
        template_id: "template_gfgs63r",
        user_id: process.env.user_id,
        accessToken: process.env.accessToken,
        template_params: {
          message:
            "Hello admin, an Agent has requested support. " +
            "Agent's query: " +
            description,
          pass: email,
          link: "www.revsite.co",

          to_email: "service@revsite.co",
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
    }
    res.json("query sent to support, successfully.");
  } catch (err) {
    res.status(500).json("unable to send query, or server error. ");
  }
};

//manipulate shared link
const handleShareUrl = (req, res, db, fetch) => {
  try {
    const url = require("url");
    const requrl = req.url;
    const urlObject = url.parse(requrl, true);
    const queryID = urlObject.query.id;
    const queryUsername = urlObject.query.username;

    if (!queryID || !queryUsername) {
      return res.status(400).json("Incorrect form Submission");
    }

    db.transaction((trx) => {
      return trx
        .select("username")
        .from("agenttbl")
        .where("username", "=", queryUsername)
        .then((data) => {
          if (data <= 0) {
            throw Error("Err. such user found.");
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
            .where({ sold: "no", shareid: queryID })

            .then((user) => {
              if (user <= 0) {
                throw Error("Err. such details found.");
              } else {
              }
              return trx
                .where("shareid", "=", queryID)
                .update({
                  booked: "yes",

                  username: queryUsername,
                })
                .into("accountstbl")

                .returning("*")

                .then((user) => {
                  var string = encodeURIComponent(queryID);
                  res.redirect("https://www.revsite.co/buy?id=" + string);
                })
                .catch((err) =>
                  res
                    .status(400)
                    .json("an error occurred while getting records")
                );
            })
            .catch((err) => res.status(404).json("Not Found"));
        })
        .catch((err) => res.status(404).json("Not Found"));
    });
  } catch (err) {
    res.status(500).json("internal server error. ");
  }
};

//get available accounts
//get accounts
const handleAvailable = (req, res, db, fetch) => {
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
};

//delete account info
const handleDeleteAccount = async (req, res, db, fetch) => {
  try {
    const { adminid, accemail } = req.body;

    if ((!adminid, !accemail)) {
      return res.status(400).json("Incorrect form Submission");
    }

    db.transaction((trx) => {
      return trx

        .from("accountstbl")
        .where("accemail", "=", req.body.accemail)
        .del()
        .returning("accid")
        .then((foundAccount) => {
          if (foundAccount <= 0) {
            throw Error("account not found");
          } else {
            res.json("account deleted successully");
          }
        })
        .then(trx.commit)
        .catch(trx.rollback);
    });
  } catch (err) {
    res.status(500).json("unable to delete Acc. Server error ");
  }
};

//update account info
//update acctype, accemail and sold status
const handleAccUpdate = async (req, res, db, fetch) => {
  try {
    const { adminid, accid, acctype, accemail, sold, datesold, shareid } =
      req.body;

    if ((!adminid, !accemail)) {
      return res.status(400).json("Incorrect form Submission");
    }

    db.transaction((trx) => {
      trx
        .select("accid")
        .from("accountstbl")
        .where("accid", "=", req.body.accid)
        .returning("accid")
        .then((foundAccount) => {
          if (foundAccount <= 0) {
            throw Error("account not found");
          } else {
            return trx

              .where("accid", "=", accid)
              .update({
                acctype: acctype,
                accemail: accemail,
                sold: sold,
                datesold: datesold,
                shareid: shareid,
              })
              .into("accountstbl")

              .returning("*")
              .then((loginEmail) => {
                res.json("account details updated successfully");
              })
              .then(trx.commit)
              .catch(trx.rollback);
          }
        })
        .catch((err) => res.status(400).json("wrong credentilas"));
    });
  } catch (err) {
    res.status(500).json("unable to update Acc. ");
  }
};

//add account to db
const handleAddAccount = (req, res, db, fetch) => {
  try {
    const { acctype, accemail } = req.body;
    if (!acctype || !accemail) {
      return res.status(417).json("Incorrect form Submission");
    }

    const Str = require("@supercharge/strings");
    const random = Str.random(8);
    db.transaction((trx) => {
      return trx("accountstbl")
        .returning(["accid", "shareid"])

        .insert({
          acctype: acctype,
          accemail: accemail,
          created: new Date(),
          sold: "no",
          shareid: random,
        })
        .then((user) => {
          res.json("Account added successfully");
        })
        .then(trx.commit)
        .catch(trx.rollback);
    }).catch((err) =>
      res
        .status(400)
        .json("Unable to add account, account perhaps already exists err ")
    );
  } catch (err) {
    res.status(500).json("internal server error ");
  }
};

//get accounts
const handleMyAccounts = (req, res, db, fetch) => {
  try {
    db.transaction((trx) => {
      return trx
        .select("adminid")
        .from("agenttbl")
        .where("adminid", "=", req.body.adminid)
        .then((data) => {
          if (data <= 0) {
            throw Error("Err. No accounts found.");
          } else {
          }

          return trx
            .select(
              "accid",
              "acctype",
              "accemail",
              "created",
              "sold",
              "datesold",
              "booked",
              "username"
            )
            .from("accountstbl")

            .then((user) => {
              let resP = [];
              for (const val of user) {
                resP.push({
                  accid: val.accid,
                  acctype: val.acctype,
                  accemail: val.accemail,
                  created: val.created,
                  sold: val.sold,
                  datesold: val.datesold,
                  booked: val.booked,
                  username: val.username,
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
};

//delete agent records
const handleDeleteAgent = async (req, res, db, fetch) => {
  try {
    const { adminid, email } = req.body;

    if (!adminid || !email) {
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
};

//update agent records
//update username, email and password
const handleUpdateAgent = async (req, res, db, bcrypt, fetch) => {
  try {
    const { adminid, username, email, password, earnings } = req.body;
    let agentearnings = earnings;
    if (earnings === "") {
      agentearnings = 0;
    }

    if (!adminid || !email) {
      return res.status(400).json("Incorrect form Submission");
    }
    bcrypt.hash(password, 10, function (err, hash) {
      db.transaction((trx) => {
        trx
          .select("email")
          .from("agentlogintbl")
          .where("email", "=", req.body.email)
          .returning("id")
          .then((foundUser) => {
            if (!foundUser[0].email) {
              throw Error("agent not found");
            } else {
              trx

                .where("email", "=", email)
                .update({
                  hash: hash,
                  email: email,
                })
                .into("agentlogintbl")

                .returning("*")
                .then((loginEmail) => {
                  trx

                    .where("email", "=", email)
                    .update({
                      username: username,
                      email: email,
                      earnings: agentearnings,
                    })
                    .into("agenttbl")

                    .returning([
                      "id",
                      "username",
                      "email",
                      "created",
                      "earnings",
                      "availableaccs",
                    ])
                    .then((loginEmail) => {
                      res.json(loginEmail);

                      data2 = {
                        service_id: "service_io7gsxk",
                        template_id: "template_gfgs63r",
                        user_id: process.env.user_id,
                        accessToken: process.env.accessToken,
                        template_params: {
                          message:
                            "Hello, your account details have been successfully updated. Login to view more of Revsite.",

                          link: "www.revsite.co",

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
                    });
                })
                .then(trx.commit)
                .catch(trx.rollback);
            }
          })
          .catch((err) => res.status(400).json("wrong credentilas"));
      });
    });
  } catch (err) {
    res.status(500).json("unable to update Agent details. ");
  }
};

//add agent to db

const handleAddMyAgent = (req, res, db, bcrypt, fetch) => {
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
          .into("agentlogintbl")

          .returning("email")
          .then((loginEmail) => {
            return trx("agenttbl")
              .returning(["id", "email", "adminid"])

              .insert({
                username: username,
                email: loginEmail[0],
                created: new Date(),
              })
              .then((user) => {
                res.json("Agent registered successfully");

                data2 = {
                  service_id: "service_io7gsxk",
                  template_id: "template_gfgs63r",
                  user_id: process.env.user_id,
                  accessToken: process.env.accessToken,
                  template_params: {
                    message:
                      "Welcome aboard dear agent,Thank you for your Revsite agent dashboard registration. Login to your dashboard to view more of Revsite.",

                    link: "agent.revsite.co",

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
          .json("Unable to register, agent perhaps already exists err ")
      );
    });
  } catch (err) {
    res.status(500).json("internal server error ");
  }
};

//get agents
const handleMyAgents = (req, res, db, fetch) => {
  try {
    db.transaction((trx) => {
      return trx
        .select("adminid")
        .from("agenttbl")
        .where("adminid", "=", req.body.adminid)
        .then((data) => {
          if (data <= 0) {
            throw Error("Err. No agent found with the details");
          } else {
          }

          return trx
            .select(
              "id",
              "username",
              "email",
              "created",
              "earnings",
              "availableaccs"
            )
            .from("agenttbl")

            .then((user) => {
              let resP = [];
              for (const val of user) {
                resP.push({
                  id: val.id,
                  username: val.username,
                  email: val.email,
                  created: val.created,
                  earnings: val.earnings,
                  availableaccs: val.availableaccs,
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
};

//Forgot Pass send email

const handleAdminForgotPass = async (req, res, db, bcrypt, fetch) => {
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
            .from("agentlogintbl")
            .where("email", "=", email)
            .returning("id")
            .then((foundUser) => {
              return trx

                .where("email", "=", foundUser[0].email)
                .update({
                  hash: hash,
                })
                .into("agentlogintbl")

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
                        "Hello Agent, we regret to know you have issues with your password. We have generated one for you. Use it to login, and perhaps change it.",
                      pass: random,
                      link: "www.revsite.co",

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
                .json("unable to get email, user perhaps already exists")
            );
        });
      });
    }
  } catch (err) {
    res.status(500).json("unable to forget pass, or server error. ");
  }
};

//update email and password
const handleAdminUpdate = async (req, res, db, bcrypt, fetch) => {
  try {
    const { id, email, password, confirmPass } = req.body;

    if (!id || !email || !password || !confirmPass) {
      return res.status(400).json("Incorrect form Submission");
    }
    bcrypt.hash(confirmPass, 10, function (err, hash) {
      db.transaction((trx) => {
        trx
          .select("email", "hash")
          .from("agentlogintbl")
          .where("email", "=", req.body.email)
          .returning("id")
          .then((foundUser) => {
            if (!foundUser[0].hash) {
              throw Error("wrong credentials");
            }
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
                    .into("agentlogintbl")

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
                            "Hello Agent, your account details have been successfully updated. Login to view more of Revsite.",

                          link: "www.revsite.co",

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
    res.status(500).json("unable to update Acc, or server error. ");
  }
};

const handleAdminRegister = (req, res, db, bcrypt, fetch) => {
  try {
    const { id, email, password, username, adminid } = req.body;
    if (!email || !password || !username) {
      return res.status(417).json("Incorrect form Submission");
    }
    bcrypt.hash(password, 10, function (err, hash) {
      db.transaction((trx) => {
        trx

          .insert({
            hash: hash,
            email: email,
          })
          .into("agentlogintbl")

          .returning("email")
          .then((loginEmail) => {
            return trx("agenttbl")
              .returning(["id", "email", "adminid"])

              .insert({
                username: username,
                email: loginEmail[0],
                created: new Date(),

                adminid: adminid,
              })
              .then((user) => {
                let resP = {
                  id: user[0].id,
                  admin: user[0].adminid,
                };
                res.json(resP);

                data2 = {
                  service_id: "service_io7gsxk",
                  template_id: "template_gfgs63r",
                  user_id: process.env.user_id,
                  accessToken: process.env.accessToken,
                  template_params: {
                    message:
                      "Welcome aboard dear agent,Thank you for your Revsite registration. Login to your dashboard to view more of Revsite.",

                    link: "www.revsite.co",

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
};

const handleAdminLogin = (req, res, db, bcrypt, fetch) => {
  try {
    db.select("email", "hash")
      .from("agentlogintbl")
      .where("email", "=", req.body.email)
      .then((data) => {
        if (!data) {
          throw Error("Err. No user found with this email");
        }
        bcrypt.compare(req.body.password, data[0].hash, function (err, result) {
          const isValid = result;

          if (result === true) {
            return db
              .select("*")
              .from("agenttbl")

              .where("email", "=", req.body.email)
              .then((user) => {
                let resP = [];
                resP.push(user[0].id, user[0].adminid);
                res.json(resP);
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
};

module.exports = {
  handleAdminLogin: handleAdminLogin,
  handleAdminRegister: handleAdminRegister,
  handleAdminUpdate: handleAdminUpdate,
  handleAdminForgotPass: handleAdminForgotPass,
  handleMyAgents: handleMyAgents,
  handleAddMyAgent: handleAddMyAgent,
  handleUpdateAgent: handleUpdateAgent,
  handleDeleteAgent: handleDeleteAgent,
  handleMyAccounts: handleMyAccounts,

  handleAddAccount: handleAddAccount,
  handleAccUpdate: handleAccUpdate,
  handleDeleteAccount: handleDeleteAccount,
  handleAvailable: handleAvailable,
  handleShareUrl: handleShareUrl,
  handleSendquery: handleSendquery,
  handleValidate: handleValidate,
};

const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");
const ejs = require("ejs");
const cookieParser = require("cookie-parser");
const { parse } = require('pg-connection-string');

const util = require("util");

//We use util.promisify to convert bcrypt.compare into a Promise-based function called compareAsync.

//We use await when calling compareAsync to wait for the comparison to complete before proceeding.

//We use await when querying the database to wait for the results before moving on.

//We use first() to get only the first row of the query results.

const compareAsync = util.promisify(bcrypt.compare);


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

//establish a connection to the remote database
const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.200",
    user: "terraweb_terrawebBackend",
    password: "@Terraweb10",
    database: "terraweb_terrawebDB",
    port:"5432",
    SSL: "on"
  },
});

// const db = knex({
  //   client: "pg",
  //   connection: {
  //     host: "127.0.0.1",
  //     user: "postgres",
  //     password: "C1995",
  //     database: "terrawebDB",
  //   },
  // });

//an illustration incase connection with the above method fails; this method uses a database url
// const databaseUrl = 'terraweb://terraweb_terrawebBackend:@Terraweb10@127.0.0.200:5432/terraweb_terrawebDB';

// // Parse the database URL
// const dbConfig = parse(databaseUrl);

// // Create a Knex database connection
// const db = knex({
//   client: 'postgres',
//   connection: dbConfig,
// });

//user vars
let email = "";
let phone = "";
let additional = "";

//session variable
let session;

//more controllers here

//handle change password

//handle account update

// Handle delete record by admin
app.post("/deleterecord", async (req, res) => {
  try {
    const { adminid, id } = req.body;

    if (!adminid || !id) {
      return res
        .status(417)
        .json("Incorrect form submission. Check your details and try again.");
    }

    // Check if the adminid exists in the users table
    const userExists = await db("users")
      .where("adminid", adminid)
      .first();

    if (!userExists) {
      return res.status(403).json("You have no rights to delete the record.");
    }

    // Perform the record deletion from the records table
    await db("records")
      .where("id",id) 
      .del();

    res.json("Record deleted successfully.");
  } catch (err) {
    res.status(500).json("Unable to delete record.");
  }
});


//handle update record
app.post("/updateRecord", async (req, res) => {
  try {
    const {
      id,
      adminid,
      fullname,
      producttype,
      weight,

      companyname,
    } = req.body;
    if (
      !adminid &&
      !id &&
      (!fullname || !producttype || !weight || !companyname)
    ) {
      return res
        .status(417)
        .json("Incorrect form Submission, update requires admin authorization");
    }

    db.transaction((trx) => {
      //validate if the admin id exists in the database
      trx
        .select("adminid", "category")
        .from("users")
        .where("adminid", adminid)
        .transacting(trx)

        // .where((builder) => builder.whereIn("category", "admin"))

        .then((user) => {
          if (user[0].category === "fieldAdmin") {
            throw Error(
              "You have no previledges to update records for this user"
            );
          } else {
            trx

              .update({
                fullname: fullname,
                companyname: companyname,
                producttype: producttype,
                weight: weight,
              })
              .into("records")
              .where("id", id)

              .returning(["id", "fullname", "userid", "companyname"])
              .then((loginEmail) => {
                console.log(loginEmail[0].fullname);
                res.status(200).json("record updated successfully");
              })
              .then(trx.commit)
              .catch(trx.rollback);
          }
        })
        .catch((err) =>
          res
            .status(400)
            .json(
              "Unable to update record because of an error. Check the details, make sure they are correct, and try again."
            )
        );
    }).catch((err) =>
      res
        .status(400)
        .json(
          "Unable to update record because of an error. Check the details, make sure they are correct, and try again."
        )
    );
  } catch (err) {
    res.status(500).json("unable to update Record. ");
  }
});

//handle summary

// //handle add new record
// app.post("/addnewrecord", (req, res) => {
//   try {
//     const { adminid, producttype, weight, companyname, fullname } = req.body;
//     if (!adminid || !producttype || !weight || !companyname || !fullname) {
//       return res.status(417).json("Incorrect form Submission");
//     }

//     db.transaction((trx) => {
//       return trx("records")
//         .returning([
//           "producttype",
//           "weight",
//           "companyname",
//           "fullname",
//           "daterecorded",
//         ])

//         .insert({
//           producttype: producttype,
//           weight: weight,
//           companyname: companyname,
//           fullname: fullname,
//           daterecorded: new Date(),
//         })
//         .then((user) => {
//           res.json("Record added successfully");
//         })
//         .then(trx.commit)
//         .catch(trx.rollback);
//     }).catch((err) =>
//       res
//         .status(400)
//         .json("Unable to add record, check your entries and try again ")
//     );
//   } catch (err) {
//     res.status(500).json("internal server error ");
//   }
// });

//add new record modified to allow admins to enter records in the company that they belong to
app.post("/addnewrecord", (req, res) => {
  try {
    const { adminid, farmerid, producttype, weight, companyname, fullname } = req.body;
    if (!adminid || !producttype || !weight || !companyname || !fullname) {
      return res.status(417).json("Incorrect form Submission. Check for empty fields!");
    }

    // Check if adminid matches the provided companyname
    db.select("adminid", "company")
      .from("users")
      .where({ adminid: adminid })
      .first()
      .then((user) => {
        if (!user || user.company !== companyname) {
          // If the adminid doesn't match the provided companyname, return an error
          return res.status(403).json("You cannot add records to a company you don't belong to");
        }

        // If the adminid matches the provided companyname, proceed to insert the record
        db.transaction((trx) => {
          return trx("records")
            .returning([
              "producttype",
              "farmerid",
              "weight",
              "companyname",
              "fullname",
              "daterecorded",
            ])
            .insert({
                farmerid:farmerid,
              producttype: producttype,
              weight: weight,
              companyname: companyname,
              fullname: fullname,
              daterecorded: new Date(),
            })
            .then((record) => {
              res.json("Record added successfully");
            })
            .then(trx.commit)
            .catch(trx.rollback);
        }).catch((err) =>
          res.status(400).json("Unable to add record, check your entries and try again ")
        );
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json("Internal server error");
      });
  } catch (err) {
    res.status(500).json("Internal server error");
  }
});


//handle search records
app.post("/searchRecords", async (req, res) => {
  try {
    const { adminid, fullname, userid } = req.body;
    if (!adminid || !fullname || !userid) {
      return res.status(400).json("Incorrect form Submission");
    }

    db.transaction((trx) => {
      trx
        .select("email", "company")
        .from("users")
        .where("adminid", adminid)

        // .where((builder) => builder.whereIn("category", "admin"))

        .then((user) => {
          console.log(user);
          return trx("records")
            .select(
              "id",
              "producttype",
              "weight",

              "companyname",
              "fullname",
              "daterecorded"
            )

            .where("userid", "like", userid + "%")
            .orWhere("fullname", "like", fullname + "%")

            .andWhere("companyname", user[0].company)

            .then((foundRecord) => {
              let resP = [];
              for (const val of foundRecord) {
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
      res.status(404).json("Unable to retrieve user's data data. ")
    );
  } catch (err) {
    res.status(500).json("internal server error. ");
  }
});

//handle Admin and field admin get daily  records
app.post("/getDailyRecords", async (req, res) => {
  try {
    const { adminid, userid } = req.body;
    if (!userid || !adminid) {
      return res.status(400).json("Incorrect form Submission");
    }
    let fullname = "";

    db.transaction((trx) => {
      trx
        .select("company", "category")
        .from("users")
        .where("adminid", "=", adminid)
        .orWhere("userid", "=", userid)

        .then((user) => {
          console.log(user[0].company);
          fullname = user[0].fullname;

          return trx("records")
            .select(
              "id",
              "farmerid",
              "producttype",
              "weight",

              "companyname",
              "fullname",
              "daterecorded"
            )

            .where("companyname", "=", user[0].company)

            .then((foundRecord) => {
              let resP = [];
              for (const val of foundRecord) {
                resP.push({
                  id: val.id,
                  farmerid: val.farmerid,
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
    }).catch((err) => res.status(400).json("Unable to retrieve records. "));
  } catch (err) {
    res.status(500).json("internal server error. ");
  }
});


//handle terraweb admin fetch records
app.post("/getTWRecords", async (req, res) => {
  try {
    const { adminid, userid } = req.body;
    if (!userid || !adminid) {
      return res.status(400).json("Incorrect form Submission");
    }
    let fullname = "";

    db.transaction((trx) => {
      trx
        .select("company", "category")
        .from("users")
        .where("adminid", "=", adminid)
        // .orWhere("userid", "=", userid)

        .then((user) => {
        //   console.log(user[0].company);
          fullname = user[0].fullname;

          return trx("records")
            .select(
              "id",
              "farmerid",
              "producttype",
              "weight",

              "companyname",
              "fullname",
              "daterecorded"
            )

            // .where("companyname", "=", user[0].company)

            .then((foundRecord) => {
              let resP = [];
              for (const val of foundRecord) {
                resP.push({
                  id: val.id,
                  farmerid: val.farmerid,
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
    }).catch((err) => res.status(400).json("Unable to retrieve records. "));
  } catch (err) {
    res.status(500).json("internal server error. ");
  }
});


//handle get User record
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
              "farmerid",
              "producttype",
              "weight",

              "companyname",
              "fullname",
              "daterecorded"
            )

            .where("fullname", "=", fullname)

            .then((foundRecord) => {
              let resP = [];
              for (const val of foundRecord) {
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
      res.status(400).json("Unable to get retrieve data. " + err)
    );
  } catch (err) {
    res.status(500).json("internal server error. " + err);
  }
});

//handle load profile data
app.post("/loadProfile", async (req, res) => {
  try {
    const { adminid, userid } = req.body;
    if (!adminid || !userid) {
      return res.status(400).json("Incorrect form Submission");
    }

    db.transaction((trx) => {
      trx
        .select("email", "company")
        .from("users")
        .where("adminid", adminid)
        .orWhere("userid", userid)

        // .where((builder) => builder.whereIn("category", "admin"))

        .then((user) => {
          console.log("found user" + user[0]);
          trx
            .select(
              "id",
              "userid",
              "adminid",
              "username",
              "email",
              "joined",
              "company",
              "category",
              "phone",
              "status",
              "fullname"
            )
            .from("users")
            // .where("category", "admin")
            .where("adminid", adminid)
            .orWhere("userid", userid)
            // .where((builder) => builder.whereIn("category", "admin"))

            .then((user) => {
              console.log("found account" + user[0]);
              let resP = [];
              for (const val of user) {
                resP.push({
                  // id: val.id,

                  username: val.username,

                  email: val.email,

                  // joined: val.joined,
                  category: val.category,
                  company: val.company,
                  phone: val.phone,
                  status: val.status,
                  fullname: val.fullname,
                });
              }

              res.json(resP);
            })
            .then(trx.commit)
            .catch(trx.rollback);
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

//search user by email, username, fullname, or phone number
app.post("/searchUsers", async (req, res) => {
  try {
    const { adminid, username, email, phone, company, userid } = req.body;
    if (!adminid || !username || !email || !phone || !company || !userid) {
      return res.status(400).json("Incorrect form Submission");
    }

    db.transaction((trx) => {
      trx
        .select("email", "company")
        .from("users")
        .where("adminid", adminid)

        // .where((builder) => builder.whereIn("category", "admin"))

        .then((user) => {
          console.log(user);
          trx
            .select(
              "id",
              "userid",
              "adminid",
              "username",
              "email",
              "joined",
              "company",
              "category",
              "phone",
              "status"
            )
            .from("users")

            .where("email", "like", email + "%")
            .andWhere("company", user[0].company)
            // .andWhere("email", email)
            // .orWhere("phone", phone)
            // .orWhere("company", company)

            // .andWhere("userid", userid)
            // .where((builder) => builder.whereIn("category", "admin"))

            .then((user) => {
              console.log(user);
              console.log("found user " + user);

              let resP = [];
              for (const val of user) {
                resP.push({
                  id: val.id,

                  username: val.username,

                  email: val.email,

                  joined: val.joined,
                  category: val.category,
                  company: val.company,
                  phone: val.phone,
                  status: val.status,
                });
              }

              res.json(resP);
            })
            .then(trx.commit)
            .catch(trx.rollback);
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

// //handle delete user whether field admin or normal user
// app.post("/deleteuser", async (req, res) => {
//   try {
//     const {
//       adminid,

//       email,
//       category,
//     } = req.body;
//     if (!adminid || !email || !category) {
//       return res
//         .status(417)
//         .json("Incorrect form Submission. Check your details and try again.");
//     }

//     if (category === "admin") {
//       throw Error("You have no previledges to delete this user");
//     }
//     const Str = require("@supercharge/strings");
//     const random = Str.random(6);

//     //encrypt users password with bcrypt encryption

//     db.transaction((trx) => {
//       //validate if the admin id exists in the database
//       trx
//         .select("adminid", "category")
//         .from("users")
//         .where("adminid", adminid)
//         .transacting(trx)

//         // .where((builder) => builder.whereIn("category", "admin"))

//         .then((user) => {
//           if (category === "admin") {
//             throw Error("You have no previledges to delete this user");
//           }

//           db.transaction((trx) => {
//             trx

//               .from("login")
//               .where("email", email)
//               .del()
//               .returning("email")
//               .then((foundRecord) => {
//                 if (foundUser <= 0) {
//                   throw Error("User not found");
//                 } else {
//                   return trx

//                     .where("email", email)
//                     .del()
//                     .from("users")

//                     .returning("email")
//                     .then((loginEmail) => {
//                       res.json("User details deleted successully");

//                       // data2 = {
//                       //   service_id: "service_io7gsxk",
//                       //   template_id: "template_gfgs63r",
//                       //   user_id: process.env.user_id,
//                       //   accessToken: process.env.accessToken,
//                       //   template_params: {
//                       //     message:
//                       //       "Hello agent, your account has been successfully deactivated by admin due to unavoidable circumstances.",

//                       //     link: "www.terraweb.co.ke/support",

//                       //     to_email: email,
//                       //     // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
//                       //   },
//                       // };

//                       // fetch("https://api.emailjs.com/api/v1.0/email/send", {
//                       //   method: "post",
//                       //   // body: JSON.stringify(data),
//                       //   // contentType: "application/json",
//                       //   headers: {
//                       //     "Content-Type": "application/json",
//                       //   },
//                       //   body: JSON.stringify(data2),
//                       // }).then(
//                       //   function (res) {},
//                       //   function (error) {}
//                       // );
//                     })
//                     .then(trx.commit)
//                     .catch(trx.rollback);
//                 }
//               });
//           });

//           // trx("users")
//           //   .insert({
//           //     adminid: loginEmail[0].adminid,
//           //     fullname: fullname,
//           //     email: loginEmail[0].email,

//           //     username: username,
//           //     joined: new Date(),

//           //     adminid: username + "_" + random,
//           //     company: company,
//           //     category: category,
//           //     phone: phone,
//           //   })
//           //   .returning(["adminid", "email"])

//           //   // .into("users")
//           //   .then((admin) => {
//           //     res.json("user created successsfully");
//           //handle email to be sent to the user for registering with terraweb
//           // data2 = {
//           //   service_id: "service_io7gsxk",
//           //   template_id: "template_gfgs63r",
//           //   user_id: process.env.user_id,
//           //   accessToken: process.env.accessToken,
//           //   template_params: {
//           //     message:
//           //       "Hello,Thank you for registering with Terraweb. Login to do more with Terraweb, for example, the excellent management of your AGRICULTURE data and more.",

//           //     link: "www.terraweb.co.ke",

//           //     to_email: req.body.email,
//           //     // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
//           //   },
//           // };

//           // fetch("https://api.emailjs.com/api/v1.0/email/send", {
//           //   method: "post",
//           //   // body: JSON.stringify(data),
//           //   // contentType: "application/json",
//           //   headers: {
//           //     "Content-Type": "application/json",
//           //   },
//           //   body: JSON.stringify(data2),
//           // }).then(
//           //   function (res) {},
//           //   function (error) {}
//           // );
//           // })
//           // .then(trx.commit)
//           // .catch(trx.rollback);

//           //  })
//           //  .catch((err) =>
//           //    res
//           //      .status(400)
//           //      .json("Unable to register, user perhaps already exists ")
//           //  );
//         })
//         .catch((err) =>
//           res
//             .status(400)
//             .json(
//               "Unable to delete user because of an error. Check your details and try again. "
//             )
//         );
//     }).catch((err) =>
//       res
//         .status(400)
//         .json(
//           "Unable to delete user because of an error. Check your details and try again."
//         )
//     );
//   } catch (err) {
//     res.status(500).json("unable to delete Account. ");
//   }
// });

//corrected delete any tw user with better db transactions and error handling
// Handle delete user whether field admin or normal user
app.post("/deleteuser", async (req, res) => {
  try {
    const { adminid, email, category } = req.body;

    if (!adminid || !email || !category) {
      return res
        .status(417)
        .json("Incorrect form Submission. Check your details and try again.");
    }

    if (category === "admin") {
      return res.status(403).json("You have no privileges to delete this user");
    }

    // Use a single transaction for both delete operations
    await db.transaction(async (trx) => {
      try {
        // Delete user from the login table
        const deletedLoginEmail = await trx("login")
          .where("email", email.toLowerCase()) // Convert email to lowercase
          .del()
          .returning("email");

        if (!deletedLoginEmail.length) {
          throw Error("User not found in the login table");
        }

        // Delete user from the users table
        const deletedUserEmail = await trx("users")
          .where("email", email.toLowerCase()) // Convert email to lowercase
          .del()
          .returning("email");

        if (!deletedUserEmail.length) {
          throw Error("User not found in the users table");
        }

        res.json("User details deleted successfully");

        // Commit the transaction
        await trx.commit();
      } catch (error) {
        // Rollback the transaction in case of an error
        await trx.rollback();
        throw error;
      }
    });
  } catch (err) {
    res.status(500).json("Unable to delete Account.");
  }
});




//corrected delete any tw user with better db transactions and error handling
// Handle terraweb delete user whether field admin or normal user from any company
app.post("/deleteAnyUser", async (req, res) => {
  try {
    const { adminid, email, category } = req.body;

    if (!adminid || !email || !category) {
      return res
        .status(417)
        .json("Incorrect form Submission. Check your details and try again.");
    }

    if (category === "twAdmin") {
      throw Error("You have no privileges to delete this user");
    }

    // Start a database transaction
    await db.transaction(async (trx) => {
      // Check if the user exists
      const userExists = await trx("users")
        .where("email", email)
        .select("email")
        .first();

      if (!userExists) {
        throw Error("User not found");
      }

      // Delete the user from the login table
      const deletedLogin = await trx("login")
        .where("email", email)
        .del()
        .returning("email");

      if (!deletedLogin.length) {
        throw Error("Error deleting user from login table");
      }

      // Delete the user from the users table
      const deletedUser = await trx("users")
        .where("email", email)
        .del()
        .returning("email");

      if (!deletedUser.length) {
        throw Error("Error deleting user from users table");
      }

      // If all deletions were successful, commit the transaction
      trx.commit();

      res.json("User details deleted successfully");
    });
  } catch (error) {
    res.status(400).json(error.message);
  }
});


//handle update any user whether field admin or normal user to the database
app.post("/updateUser", async (req, res) => {
  try {
    const {
      adminid,
      farmerid,
      fullname,
      email,
      username,
      password,
      company,
      category,
      phone,
      status,
    } = req.body;
    if (!adminid || !category) {
      return res
        .status(417)
        .json(
          "Incorrect form Submission, update requires you choose a user category (farmer or field admin)"
        );
    }

    if (category === "admin") {
      throw Error("You have no previledges to update this user");
    }


    //encrypt users password with bcrypt encryption
    bcrypt.hash(password, 10, function (err, hash) {
      db.transaction((trx) => {
        //validate if the admin id exists in the database
        trx
          .select("adminid", "category")
          .from("users")
          .where("adminid", adminid)
          .transacting(trx)

          // .where((builder) => builder.whereIn("category", "admin"))

          .then((user) => {
            if (category === "admin") {
              throw Error("You have no previledges to update this user");
            }
            if (category === "farmer") {
              trx

                .update({
                  hash: hash,
                  email: email,
                })
                .into("login")
                .where("email", email)

                .returning(["email", "adminid", "userid"])
                .then((loginEmail) => {
                  //detect if the record to be inserted is a farmer or a mini admin

                  //insert userid in the db
                  trx("users")
                    .update({
                        farmerid:farmerid,
                      fullname: fullname,
                      email: loginEmail[0].email,

                      username: username,

                      company: company,
                      category: category,
                      phone: phone,
                      status: status,
                    })
                    .where("email", loginEmail[0].email)
                    .returning(["id", "adminid", "email", "userid"])

                    // .into("users")
                    .then((admin) => {
                      res.json(admin[0].id);
                    });

                  //first if check ends here
                })
                .then(trx.commit)
                .catch(trx.rollback);
            }

            //second if check begins here
            else if (category === "fieldAdmin") {
              trx

                .update({
                  hash: hash,
                  email: email,
                })
                .into("login")
                .where("email", email)

                .returning(["email", "adminid", "userid"])
                .then((loginEmail) => {
                  //insert adminid into the db

                  trx("users")
                    .update({
                        farmerid:farmerid,
                      fullname: fullname,
                      email: loginEmail[0].email,

                      username: username,

                      company: company,
                      category: category,
                      phone: phone,
                      status: status,
                    })
                    .where("email", loginEmail[0].email)
                    .returning(["id", "adminid", "email", "userid"])

                    // .into("users")
                    .then((admin) => {
                      res.json(admin[0].id);
                    });
                })
                .then(trx.commit)
                .catch(trx.rollback);
            } 
            
                //second if check begins here
            else if (category === "twAdmin") {
              trx

                .update({
                  hash: hash,
                  email: email,
                })
                .into("login")
                .where("email", email)

                .returning(["email", "adminid", "userid"])
                .then((loginEmail) => {
                  //insert adminid into the db

                  trx("users")
                    .update({
                        farmerid:farmerid,
                      fullname: fullname,
                      email: loginEmail[0].email,

                      username: username,

                      company: company,
                      category: category,
                      phone: phone,
                      status: status,
                    })
                    .where("email", loginEmail[0].email)
                    .returning(["id", "adminid", "email", "userid"])

                    // .into("users")
                    .then((admin) => {
                      res.json(admin[0].id);
                    });
                })
                .then(trx.commit)
                .catch(trx.rollback);
            } 
            
            
            else {
              res
                .status(400)
                .json("server encountered an error when updating user");
              // throw Error(
              //   "unable to add a user check if you are inserting the right category"
              // );
            }
            // trx("users")
            //   .insert({
            //     adminid: loginEmail[0].adminid,
            //     fullname: fullname,
            //     email: loginEmail[0].email,

            //     username: username,
            //     joined: new Date(),

            //     adminid: username + "_" + random,
            //     company: company,
            //     category: category,
            //     phone: phone,
            //   })
            //   .returning(["adminid", "email"])

            //   // .into("users")
            //   .then((admin) => {
            //     res.json("user created successsfully");
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
            // })
            // .then(trx.commit)
            // .catch(trx.rollback);

            //  })
            //  .catch((err) =>
            //    res
            //      .status(400)
            //      .json("Unable to register, user perhaps already exists ")
            //  );
          })
          .catch((err) =>
            res
              .status(400)
              .json(
                "Unable to upadate user because of an error. Check your details and try again. "
              )
          );
      }).catch((err) =>
        res
          .status(400)
          .json(
            "Unable to update user because of an error. Check your details and try again."
          )
      );
    });
  } catch (err) {
    res.status(500).json("unable to update Account. ");
  }
});

// //handle add any user whether mini admin or normal user to the database
// app.post("/addUser", (req, res) => {
//   try {
//     const {
//       adminid,
//       fullname,
//       email,
//       farmerid,
//       username,
//       password,
//       company,
//       category,
//       phone,
//     } = req.body;
//     if (
//       !adminid ||
//       !fullname ||
//       !email ||
//       !username ||
//       !password ||
//       !company ||
//       !category ||
//       !phone
//     ) {
//       return res.status(417).json("Incorrect form Submission. Make sure to fill all required fields!");
//     }
    
//      //convert the email to lower case letters for consistency and comparing
    
//     const lowercaseEmail = email.toLowerCase();

//     const Str = require("@supercharge/strings");
//     const random = Str.random(6);

//     //encrypt users password with bcrypt encryption
//     bcrypt.hash(password, 10, function (err, hash) {
//       db.transaction((trx) => {
//         //validate if the admin id exists in the database
//         trx
//           .select("adminid")
//           .from("users")
//           .where("adminid", adminid)
//           .transacting(trx)

//           // .where((builder) => builder.whereIn("category", "admin"))

//           .then((user) => {
//             console.log(user);
//             if (category === "farmer") {
//               trx

//                 .insert({
//                   hash: hash,
//                   email: lowercaseEmail,
//                   userid: username + "_" + random,
//                 })
//                 .into("login")

//                 .returning(["email", "adminid"])
//                 .then((loginEmail) => {
//                   //detect if the record to be inserted is a farmer or a mini admin

//                   //insert userid in the db
//                   trx("users")
//                     .insert({
//                       userid: loginEmail[0].userid,
//                       farmerid: farmerid,
//                       fullname: fullname,
//                       email: loginEmail[0].email,

//                       username: username,
//                       joined: new Date(),

//                       userid: username + "_" + random,
//                       company: company,
//                       category: category,
//                       phone: phone,
//                       status: "active",
//                     })
//                     .returning(["adminid", "email"])

//                     // .into("users")
//                     .then((admin) => {
//                       res.json("user created successsfully");
//                     });

//                   //first if check ends here
//                 })
//                 .then(trx.commit)
//                 .catch(trx.rollback);
//             }

//             //second if check begins here
//             else if (category === "fieldAdmin") {
//               trx

//                 .insert({
//                   hash: hash,
//                   email: lowercaseEmail,
//                   adminid: username + "_" + random,
//                 })
//                 .into("login")

//                 .returning(["email", "adminid"])
//                 .then((loginEmail) => {
//                   //insert adminid into the db

//                   trx("users")
//                     .insert({
//                       adminid: loginEmail[0].adminid,
//                       farmerid: farmerid,
//                       fullname: fullname,
//                       email: loginEmail[0].email,

//                       username: username,
//                       joined: new Date(),

//                       adminid: username + "_" + random,
//                       company: company,
//                       category: category,
//                       phone: phone,
//                       status: "pending",
//                     })
//                     .returning(["adminid", "email"])

//                     // .into("users")
//                     .then((admin) => {
//                       res.json("user created successsfully");
//                     });
//                 })
//                 .then(trx.commit)
//                 .catch(trx.rollback);
//             } else {
//               res
//                 .status(400)
//                 .json("server encountered an error when creating user");
//               // throw Error(
//               //   "unable to add a user check if you are inserting the right category"
//               // );
//             }
//             // trx("users")
//             //   .insert({
//             //     adminid: loginEmail[0].adminid,
//             //     fullname: fullname,
//             //     email: loginEmail[0].email,

//             //     username: username,
//             //     joined: new Date(),

//             //     adminid: username + "_" + random,
//             //     company: company,
//             //     category: category,
//             //     phone: phone,
//             //   })
//             //   .returning(["adminid", "email"])

//             //   // .into("users")
//             //   .then((admin) => {
//             //     res.json("user created successsfully");
//             //handle email to be sent to the user for registering with terraweb
//             // data2 = {
//             //   service_id: "service_io7gsxk",
//             //   template_id: "template_gfgs63r",
//             //   user_id: process.env.user_id,
//             //   accessToken: process.env.accessToken,
//             //   template_params: {
//             //     message:
//             //       "Hello,Thank you for registering with Terraweb. Login to do more with Terraweb, for example, the excellent management of your AGRICULTURE data and more.",

//             //     link: "www.terraweb.co.ke",

//             //     to_email: req.body.email,
//             //     // "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
//             //   },
//             // };

//             // fetch("https://api.emailjs.com/api/v1.0/email/send", {
//             //   method: "post",
//             //   // body: JSON.stringify(data),
//             //   // contentType: "application/json",
//             //   headers: {
//             //     "Content-Type": "application/json",
//             //   },
//             //   body: JSON.stringify(data2),
//             // }).then(
//             //   function (res) {},
//             //   function (error) {}
//             // );
//             // })
//             // .then(trx.commit)
//             // .catch(trx.rollback);

//             //  })
//             //  .catch((err) =>
//             //    res
//             //      .status(400)
//             //      .json("Unable to register, user perhaps already exists ")
//             //  );
//           })
//           .catch((err) =>
//             res
//               .status(400)
//               .json("Unable to register, user perhaps already exists ")
//           );
//       }).catch((err) =>
//         res.status(400).json("Unable to register, user perhaps already exists ")
//       );
//     });
//   } catch (err) {
//     res.status(500).json("unable to register user or server error ");
//   }
// });

//add user with modified code that checks for duplicate farmerid when inserting records
// Handle add any user whether mini admin or normal user to the database
app.post("/addUser", async (req, res) => {
  try {
    const {
      adminid,
      fullname,
      email,
      farmerid,
      username,
      password,
      company,
      category,
      phone,
    } = req.body;

    if (
      !adminid ||
      !fullname ||
      !email ||
      !username ||
      !password ||
      !company ||
      !category ||
      !phone
    ) {
      return res
        .status(417)
        .json("Incorrect form Submission. Make sure to fill all required fields!");
    }

    // Convert the email to lowercase letters for consistency and comparing
    const lowercaseEmail = email.toLowerCase();

    const Str = require("@supercharge/strings");
    const random = Str.random(6);

    // Encrypt user's password with bcrypt encryption
    const hash = await bcrypt.hash(password, 10);

    const user = await db.transaction(async (trx) => {
      // Validate if the admin id exists in the database
      const existingUser = await trx("users")
        .select("adminid")
        .where("adminid", adminid)
        .first();

      if (!existingUser) {
        return res.status(400).json("Admin ID not found in the database");
      }

      if (category === "farmer") {
        try {
          await trx("users").insert({
            userid: username + "_" + random,
            farmerid: farmerid,
            fullname: fullname,
            email: lowercaseEmail,
            username: username,
            joined: new Date(),
            company: company,
            category: category,
            phone: phone,
            status: "active",
          });

          await trx("login").insert({
            hash: hash,
            email: lowercaseEmail,
            userid: username + "_" + random,
          });

          res.json("User created successfully");
        } catch (error) {
          if (error.code === "23505") {
            // Postgres error code for duplicate key violation
            return res
              .status(400)
              .json("A user with the same farmerid already exists");
          } else {
            throw error;
          }
        }
      } else if (category === "fieldAdmin") {
        // Similar logic for fieldAdmin as for farmer
        try {
          await trx("users").insert({
            adminid: username + "_" + random,
            farmerid: farmerid,
            fullname: fullname,
            email: lowercaseEmail,
            username: username,
            joined: new Date(),
            company: company,
            category: category,
            phone: phone,
            status: "pending",
          });

          await trx("login").insert({
            hash: hash,
            email: lowercaseEmail,
            adminid: username + "_" + random,
          });

          res.json("User created successfully");
        } catch (error) {
          if (error.code === "23505") {
            // Postgres error code for duplicate key violation
            return res
              .status(400)
              .json("A user with the same farmerid already exists");
          } else {
            throw error;
          }
        }
      } else {
        return res.status(400).json("Invalid category");
      }
    });

    return user;
  } catch (err) {
    res.status(500).json("Unable to register user or server error");
  }
});


//handle get users
app.post("/getusers", async (req, res) => {
  try {
    const { adminid } = req.body;
    if (!adminid) {
      return res.status(400).json("Incorrect form Submission");
    }

    db.transaction((trx) => {
      trx
        .select("email", "company")
        .from("users")
        .where("adminid", adminid)

        // .where((builder) => builder.whereIn("category", "admin"))

        .then((user) => {
          console.log(user);
          trx
            .select(
              "id",
              "farmerid",
              "userid",
              "adminid",
              "username",
              "email",
              "joined",
              "company",
              "category",
              "phone",
              "status"
            )
            .from("users")
            // .where("category", "admin")
            .where("company", user[0].company)
            // .where((builder) => builder.whereIn("category", "admin"))

            .then((user) => {
              console.log(user);
              let resP = [];
              for (const val of user) {
                resP.push({
                  id: val.id,
                  farmerid:val.farmerid,

                  username: val.username,

                  email: val.email,

                  joined: val.joined,
                  category: val.category,
                  company: val.company,
                  phone: val.phone,
                  status: val.status,
                });
              }

              res.json(resP);
            })
            .then(trx.commit)
            .catch(trx.rollback);
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


//handle get terraweb users
app.post("/getTWUsers", async (req, res) => {
  try {
    const { adminid } = req.body;
    if (!adminid) {
      return res.status(400).json("Incorrect form Submission");
    }

    db.transaction((trx) => {
      trx
        .select("email", "company")
        .from("users")
        .where("adminid", adminid)

        // .where((builder) => builder.whereIn("category", "admin"))

        .then((user) => {
          console.log(user);
          trx
            .select(
              "id",
              "farmerid",
              "userid",
              "adminid",
              "username",
              "email",
              "joined",
              "company",
              "category",
              "phone",
              "status"
            )
            .from("users")
            // .where("category", "admin")
            // .where("company", user[0].company)
            // .where((builder) => builder.whereIn("category", "admin"))

            .then((user) => {
              console.log(user);
              let resP = [];
              for (const val of user) {
                resP.push({
                  id: val.id,
                  farmerid:val.farmerid,

                  username: val.username,

                  email: val.email,

                  joined: val.joined,
                  category: val.category,
                  company: val.company,
                  phone: val.phone,
                  status: val.status,
                });
              }

              res.json(resP);
            })
            .then(trx.commit)
            .catch(trx.rollback);
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
    const { farmerid, fullname, email, username, password, company, phone, gender } =
      req.body;
    if (!fullname || !email || !username || !password || !phone || !gender) {
      return res.status(417).json("Incorrect form Submission");
    }

 //convert the email to lower case letters for consistency and comparing
    
    const lowercaseEmail = email.toLowerCase();

    const Str = require("@supercharge/strings");
    const random = Str.random(6);

    //encrypt users password with bcrypt encryption
    bcrypt.hash(password, 10, function (err, hash) {
      db.transaction((trx) => {
        trx

          .insert({
            hash: hash,
            email: lowercaseEmail,
            adminid: username + "_" + random,
          })
          .into("login")

          .returning("email", "adminid")
          .then((loginEmail) => {
            return trx("users")
              .returning(["adminid", "email"])

              .insert({
                adminid: loginEmail[1],
                farmerid:farmerid,
                fullname: fullname,

                email: loginEmail[0],
                phone: phone,
                gender: gender,
                username: username,
                joined: new Date(),
                company: company,
                adminid: username + "_" + random,

                category: "fieldAdmin",
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


//register terraweb admin
app.post("/registerTWAdmin", (req, res) => {
  try {
    const { farmerid, fullname, email, username, password, company, phone, gender } =
      req.body;
    if (!fullname || !email || !username || !password || !phone || !gender) {
      return res.status(417).json("Incorrect form Submission");
    }

 //convert the email to lower case letters for consistency and comparing
    
    const lowercaseEmail = email.toLowerCase();

    const Str = require("@supercharge/strings");
    const random = Str.random(6);

    //encrypt users password with bcrypt encryption
    bcrypt.hash(password, 10, function (err, hash) {
      db.transaction((trx) => {
        trx

          .insert({
            hash: hash,
            email: lowercaseEmail,
            adminid: username + "_" + random,
          })
          .into("login")

          .returning("email", "adminid")
          .then((loginEmail) => {
            return trx("users")
              .returning(["adminid", "email"])

              .insert({
                adminid: loginEmail[1],
                farmerid:farmerid,
                fullname: fullname,

                email: loginEmail[0],
                phone: phone,
                gender: gender,
                username: username,
                joined: new Date(),
                company: company,
                adminid: username + "_" + random,

                category: "twAdmin",
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
    const { farmerid, fullname, email, username, password, company, phone, gender } =
      req.body;
    if (!fullname || !email || !username || !password || !phone || !gender) {
      return res.status(417).json("Incorrect form Submission");
    }
    
    //convert the email to lower case letters for consistency and comparing
    
    const lowercaseEmail = email.toLowerCase();

    const Str = require("@supercharge/strings");
    const random = Str.random(6);

    //encrypt users password with bcrypt encryption
    bcrypt.hash(password, 10, function (err, hash) {
      db.transaction((trx) => {
        trx

          .insert({
            hash: hash,
            email: lowercaseEmail,
            userid: username + "_" + random,
          })
          .into("login")

          .returning("email", "userid")
          .then((loginEmail) => {
            return trx("users")
              .returning(["userid", "email"])

              .insert({
                userid: loginEmail[1],
                farmerid: farmerid,
                fullname: fullname,

                email: loginEmail[0],
                phone: phone,
                gender: gender,
                username: username,
                joined: new Date(),
                company: company,
                userid: username + "_" + random,

                category: "farmer",
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

//handle temp login
app.post("/tempLogin", async (req, res) => {
  try {
    // Generate random session id
    const Str = require("@supercharge/strings");
    let random = Str.random(8);
    
    const email=req.body.email;
    
     //convert the email to lower case letters for consistency and comparing
    
    const lowercaseEmail = email.toLowerCase();

    // Check if user is logged in first before creating a new session
    const data = await db
      .select("email", "hash")
      .from("login")
      .where("email", "=", lowercaseEmail)
      .first(); // Use first() to get only the first row

    if (!data) {
      throw new Error("Err. No user found with this email");
    }

    // Use async/await to compare the password
    const isValid = await compareAsync(req.body.password, data.hash);

    if (isValid) {
      const user = await db
        .select("*")
        .from("users")
        .where("email", "=", lowercaseEmail)
        .first();

      const resP = JSON.stringify({
        sessioniduser: user.userid,
        sessionidadmin: user.adminid,
        category: user.category,
      });

      res.status(200).json({
        sessioniduser: user.userid,
        sessionidadmin: user.adminid,
        category: user.category,
      });
    } else {
      res.status(400).json("Wrong credentials");
    }
  } catch (err) {
    res.status(500).json("Unable to login user.");
  }
});

//handle login of users
app.post("/login", (req, res) => {
  try {
      
      const email = req.body.email;
      
       //convert the email to lower case letters for consistency and comparing
    
    const lowercaseEmail = email.toLowerCase();
      
    //generate random session id
    const Str = require("@supercharge/strings");
    let random = Str.random(8);

    //check if user is logged in first before creating a new session

    db.select("email", "hash")
      .from("login")
      .where("email", "=", lowercaseEmail)
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

                .where("email", "=", lowercaseEmail)
                .then((user) => {
                  let resP = JSON.stringify({
                    sessioniduser: user[0].userid,
                    sessionidadmin: user[0].adminid,
                    category: user[0].category,
                  });

                  res.status(200).json({
                    sessioniduser: user[0].userid,
                    sessionidadmin: user[0].adminid,
                    category: user[0].category,
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
    
  res.json("The server is up and running. Even after making these changes.");
  console.log("someone finally found this port");
});
//this port changes depending on the server environment
const port = 3000 || process.env.PORT;
//the server listens to all incoming connections through this port
app.listen(process.env.PORT||port, () => {
  console.log("app is running on port " + port);
  console.log(process.env.PORT);
});



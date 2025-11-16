import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import axios from "axios";
import cors from "cors";
import crypto from "crypto";
import qs from "qs";
import mysql from "mysql2";
//import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import bcrypt from "bcrypt";
import PayU from "payu-websdk";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";


//import LinkedInStrategy from "passport-linkedin-oauth2";

import { nanoid } from "nanoid";

//const mysql = require("mysql2");

dotenv.config(); 
const app = express();
const PORT = process.env.PORT
const frontend_port=process.env.Frontendport







app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);






 const db = mysql.createConnection({
  host: process.env.host,
  user: process.env.user, 
  password: process.env.password, 
  database: process.env.database,
  port: 3306
});





app.get("/api/check", async (req, res) => {


  res.json({
     connect:" backend connect"
    });

})








app.get("/api/database_check", async (req, res) => {
db.connect((err) => {
  if (err) {

    res.json({
      error: err
    });
   // console.error(" MySQL connection error:", err);
  } else {

    res.json({
      status: "success connected"
    });
  //  console.log(" Connected to MySQL database!");
  }
});
})
/*starting main working   function */

/*from my company to z.company  makeing a  first call-1)*/
app.get("/", async (req, res) => {
  try {
    console.log("get_requesting from  5000");
    const cupon = 12345;

    const cupon_code = { cupon_code: cupon };
   /* const company_verfication = await axios.post(
      "http://localhost:5002/zcom/buybook/cuponcode/companyverification",
      cupon_code,
      {
        headers: { "Content-Type": "application/json" },
      }
    );*/

    console.log("Companyvewrfication:", company_verfication);

    if (company_verfication.data.status == "success") {
      console.log("sucess from company_verfication");
    }
    res.json({
      status: "success",
    });
  } catch (err) {
    console.error("Error forwarding to Server b:", err);
    res.status(500).json({ status: "error", message: err });
  }
});

//companytocomkpany  verifiacation

app.post("/bcom/cuponandcompanyverfication", async (req, res) => {
  try {
    const data = req.body;
    console.log("data", data);

    //   now  first searching exsistence of company

    if (
      typeof data.secret_key !== "undefined" &&
      data.secret_key != "" &&
      typeof data.api_key != "undefined" &&
      data.api_key != ""
    ) {
      const sql =
        "SELECT * FROM handshake_company_secretkey WHERE api_key = ? AND secret_key = ?";

      db.query(sql, [data.api_key, data.secret_key], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
          console.log(results);
          //   to check  exsistence of cupon  of  users
          const sql1 = "SELECT * FROM cupon WHERE cupon_code = ?";
          db.query(sql1, [data.cupon], (err, results1) => {
            if (err) return res.status(500).json({ error: err.message });

            if (results1.length === 0) {
              return res.status(404).json({ message: "User not found" });
            }

            console.log(results1[0].cupon_code);

            if (
              results1[0].cupon_code == data.cupon &&
              results1[0].cupon_code &&
              results1[0].associated_money_to_cupon != 0 &&
              results1[0].expiery_date != ""
            ) {
              let deducted_money = results1[0].associated_money_to_cupon;

              const payload1 = {
                deducted_money: deducted_money,
                cupon_Code: data.cupon,
              };
              // console.log(payload1);

              //deleted  that   part8u

              const sql123 = "DELETE FROM cupon WHERE cupon_code= ?";
              db.query(sql123, [data.cupon], (err, result) => {
                if (err) {
                  console.error("DB delete error:", err);
                  return res
                    .status(500)
                    .json({ message: "Database error while deleting" });
                }

                if (result.affectedRows === 0) {
                  return res
                    .status(404)
                    .json({ message: "No record found for given cupon" });
                }

                console.log(`Deleted record where cupon = ${data.cupon}`);

                res.json({
                  status: "success",
                  message: `Record with cupon ${data.cupon} deleted successfully!`,
                  detucted_money: deducted_money,
                });
              });

             
            }

            
          });
        } else {
          //console.log("nodata   non exsistence of this company");
          res.json({
            message: "partnership company has  nbot authorized with that",
            status: "fail",
          });
        }
        //  res.json(results);
      });
    }

    console.log("provide  proper   key");

    //failure  if  company  is not  authroized
    //res.redirect("http://localhost:3001/");
  } catch (err) {
    console.error("Error forwarding to Server a1234:", err);
    res.status(500).json({ status: "error", message: err });
  }
});




/*new */  // main gmail authentication




app.use(
  session({
    secret:process.env.secret,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());


// Serialize user
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));



// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID:
        process.env.Google_client_id,
      clientSecret: process.env.Google_secret_key,
      callbackURL: `http://localhost:${PORT}/google/callback`,
    },
    (accessToken, refreshToken, profile, done) => {
      // Here, you can save user info to DB if needed
      return done(null, profile);
    }
  )
);

// Routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `http://localhost:${frontend_port}/login`,
  }),
  (req, res) => {
    // On success, redirect to frontend
    res.redirect(`http://localhost:${frontend_port}/startgame/${req.user.emails[0].value}`);
  }
);

app.get("/logout", (req, res) => {
  req.logout((err) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid", { path: "/" });
      // Redirect to Google logout, then back to your login page

      res.redirect(
        `https://accounts.google.com/Logout?continue=https://appengine.google.com/_ah/logout?continue=http://localhost:${frontend_port}/login`
      );
    });
  });
});

app.post("/api/faceapi", (req, res) => {
  console.log(req.body);
});

app.post("/api/signup", (req, res) => {
  const { name, email, phone, address, password } = req.body;
  let succes_ready_score = false;

  if (!name || !email || !phone || !address || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const sql =
    "INSERT INTO signup (name, email, phone, address, password) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [name, email, phone, address, password], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ message: "Email already exists" });
      }
      return res.status(500).json({ message: "Database error" });
    }
    let score = 0;
    const sql2 = "INSERT INTO user_scorecard (email, 	score) VALUES (?, ?)";
    db.query(sql2, [email, score], (err2, result2) => {
      if (err2) {
        return res
          .status(500)
          .json({ message: "Error saving user details", error: err2 });
      }

      // Success response
      let succes_ready_score = true;
    });

    // KYC DETAILS  FALSE3 FALSE  INITIALIZATION

    const sql3 =
      "INSERT INTO kycaccount (email,google_auth,EMAIL_VERIFY) VALUES (?, ?,?)";
    db.query(sql3, [email, "false", "false"], (err2, result2) => {
      if (err2) {
        return res
          .status(500)
          .json({ message: "Error saving user details", error: err2 });
      }

      // Success response
      let succes_ready_score = true;
    });

    res.json({
      message: "Signup successful!",
      success: true,
      succes_ready_score: succes_ready_score,
    });
  });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({
      success: false,
      message: "Please enter email and password",
    });
  }

  const sql = "SELECT * FROM signup WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });

    if (results.length === 0) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    const user = results[0];
    console.log(user, password);

    //const isMatch = await bcrypt.compare(password, user.password);
    //console.log("ismatch:",isMatch)

    if (password != user.password) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    // Successful login
    res.json({
      success: true,
      message: "Login successful",
      user: { id: user.id, name: user.name, email: user.email },
    });
  });
});

app.post("/api/fetch_score", (req, res) => {
  const { id } = req.body;
  console.log(id);

  const sql3 = "SELECT * FROM user_scorecard WHERE email = ?";
  db.query(sql3, [id], (err, result) => {
    if (err) {  
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    console.log(result[0]);
    res.json(result[0]); // send first row
  });
});

// UPDATE route
app.put("/api/score_update", (req, res) => {
  const { score, id } = req.body; // get user id from URL
  //const { name, phone } = req.body; // data to update








  const sql = "UPDATE user_scorecard SET score = ? WHERE email = ?";
  db.query(sql, [score, id], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User updated!" });
  });
});

app.post("/api/cupon_avaliability", (req, res) => {
  const { id } = req.body;
  console.log(":ID", id);

  const sql4 = "SELECT * FROM user_scorecard WHERE email = ?";
  db.query(sql4, [id], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    console.log(result[0]);
    //  res.json(result[0]); // send first row

    if (result[0].score > 10000) {
      /* inserion for cupon <generation></generation>*/
      const cuponSql = `
  INSERT INTO cupon (user_id, cupon_code, expiery_date, associated_money_to_cupon, is_active) 
  VALUES (?, ?, ?, ?, ?)
`;

      const userId = id; // or from signup table
      const cuponCode = Math.floor(Math.random() * 90000) + 10000;
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 month validity

      let numericPoints = Number(result[0].score);

      // Multiply by 0.0332
      const x = 0.0332 * 10000;

      // Optional: round to 2 decimal places
      const roundedX = Math.round(x * 100) / 100;

      const associatedMoney = roundedX; // example amount
      const isActive = true;

      numericPoints = numericPoints - 10000;

      db.query(
        cuponSql,
        [userId, cuponCode, expiryDate, associatedMoney, isActive],
        (err, result) => {
          if (err) {
            console.error("Error inserting coupon:", err);
            return res
              .status(500)
              .json({ success: false, message: "Coupon insert failed" });
          }

          /*update*/
          const sql = "UPDATE user_scorecard SET score = ? WHERE email = ?";
          db.query(sql, [numericPoints, id], (err, result) => {
            if (err) {
              console.error("DB error:", err);
              return res
                .status(500)
                .json({ success: false, message: "Database error" });
            }

            if (result.affectedRows === 0) {
              return res
                .status(404)
                .json({ success: false, message: "User not found" });
            }

            res.json({
              success: true,
              message: "Coupon inserted successfully",
              coupon_code: cuponCode,
            });
          });
          /*update*/
        }
      );
    } else {
      return res.json({
        success: false,
        message:
          "not having above of 10000 points in your account   to be get cupon ",
      });
    }
  });
});

app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
  console.log("email:", email);

  const sql3 = "SELECT * FROM company_admin WHERE email = ?";
  db.query(sql3, [email], (err, result) => {
    if (err) {
      console.error("admin  error:", err);
      return res.status(500).json({ message: "user Database error" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "user not found" });
    }
    console.log(result);
    res.json({ success: true, message: "admin login...." }); // send first row
  });
});

let points1 = 0;

app.post("/api/pointssendtofriend", (req, res) => {
  const { id, userid, points } = req.body;
  console.log("id,userid,points:", id, userid, points);

  //try to fetching  sender users details from  scorecard table
  const sql4 = "SELECT * FROM user_scorecard WHERE email = ?";
  db.query(sql4, [id], (err, result1) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "sender_Database error" });
    }

    if (result1.length === 0) {
      return res.status(404).json({ message: "sender_User not found" });
    }
    console.log(result1[0]);

    const sql5 = "SELECT * FROM user_scorecard WHERE email = ?";
    db.query(sql5, [userid], (err, result) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ message: "Reciever_Database error" });
      }

      if (result.length === 0) {
        return res.status(404).json({ message: "reciever_User not found" });
      }
      console.log(result[0]);
      // res.json(result[0]); // send first row
      //if reciever emails exsists  in this  account
      if (result[0].email === userid) {
        //if sender has amuch avaliability of points
        if (result1[0].score > points) {
          const numericPoints1 = Number(result1[0].score);

          const numericPoints2 = Number(result[0].score);

          let points1 = Number(points);
          // const points=Number(points);
          const x = numericPoints1 - points1;
          const y = numericPoints2 + points1;

          //deducting points  from sender accounts
          const sql6 = "UPDATE user_scorecard SET score = ? WHERE email = ?";
          db.query(sql6, [x, id], (err, result4) => {
            if (err) {
              console.error("DB error:", err);
              return res.status(500).json({
                success: false,
                message: "sender_points_Database error",
              });
            }

            if (result4.affectedRows === 0) {
              return res
                .status(404)
                .json({ success: false, message: "sendder_user_not_found" });
            }

            //res.json({ success: true, message: "User updated!" });

            //adding points to reciever friends account
            const sql7 = "UPDATE user_scorecard SET score = ? WHERE email = ?";
            db.query(sql7, [y, result[0].email], (err, result6) => {
              if (err) {
                console.error("reciever_points_score_DB error:", err);
                return res.status(500).json({
                  success: false,
                  message: "reciever_points_score_DB_errorDatabase error",
                });
              }

              if (result6.affectedRows === 0) {
                return res.status(404).json({
                  success: false,
                  message: "reciever_account_not_found",
                });
              }

              res.json({
                success: true,
                message: "points_tobe_transfered_to_friends_account",
              });
            }); //adding points to reciever friends account
          }); //deducting points  from sender accounts
        } //if sender has amuch avaliability of points
        else {
          return res.json({
            success: false,
            message:
              "User_sender does not have proper much avaliabilitly of points",
          });
          console.log("you dont have  enough  points");
        }
      } //if reciever emails exsists  in this  account
      else {
        return res.json({
          success: false,
          message: "recievers emails does not exsist in application",
        });
      }
    });

    //  res.json(result[0]); // send first row
  }); //try to fetching  sender users details from  scorecard table
});

app.post("/api/cuponcodes", (req, res) => {
  const { id } = req.body;
  console.log(id);

  const sql3 = "SELECT * FROM cupon WHERE user_id = ?";
  db.query(sql3, [id], (err, result) => {
    if (err) {
      console.error("cupon DB error:", err);
      return res.status(500).json({ message: "cupon Database error" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "cupon not found" });
    }
    console.log(result);
    res.json(result); // send first row
  });
});

app.get("/api/top10users", (req, res) => {
  // const { id } = req.body;
  //console.log(id);

  const sql8 = "SELECT * FROM user_scorecard ORDER BY score DESC LIMIT 10";
  db.query(sql8, (err, result10) => {
    if (err) {
      console.error("cupon DB error:", err);
      return res.status(500).json({ message: "cupon Database error" });
    }

    if (result10.length === 0) {
      return res.status(404).json({ message: "cupon not found" });
    }
    console.log(result10);
    res.json(result10); // send first row
  });
});

//signup of handshake company
app.post("/api/auth_handshake_company/signup", async (req, res) => {
  try {
    const { email, password, companyName, phone } = req.body;

    if (!email || !password || !companyName || !phone)
      return res.status(400).json({ message: "All fields required" });

    // const hashedPassword = await bcrypt.hash(password, 10);

    const sql =
      "INSERT INTO handshake_company_signup (email, Password, company_name, phone_no, verified_code) VALUES (?, ?, ?, ?, ?)";

    db.query(
      sql,
      [email, password, companyName, phone, "0000"],
      (err, result11) => {
        if (err) {
          console.error("DB Insert Error:", err);
          return res.status(500).json({ message: "Database error" });
        }
        res.status(200).json({
          success: true,
          message: "Signup_of_handshake_company successful!",
        });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

//handshake_company_login

app.post("/api/handshake_company/login", (req, res) => {
  const { email, password } = req.body;
  const sql =
    "SELECT * FROM handshake_company_signup WHERE email = ? AND password = ?";
  db.query(sql, [email, password], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (result.length > 0) {
      let code = Math.floor(10000 + Math.random() * 90000);

      const sql =
        "UPDATE handshake_company_signup SET verified_code = ? WHERE email = ?";
      db.query(sql, [code, email], (err, result) => {
        if (err) {
          console.error("DB error:", err);
          return res
            .status(500)
            .json({ success: false, message: "Database error" });
        }

        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }

        res.json({ success: true, message: "login successfull", code: code });
      });

      //res.json({ message: "Login successful!" });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  });
});

app.post("/api/verify", (req, res) => {
  const { email, code } = req.body;

  const sql8 =
    "SELECT * FROM handshake_company_signup WHERE email = ? AND verified_code = ? ";
  db.query(sql8, [email, code], (err, result18) => {
    if (err) {
      console.error("cupon DB error:", err);
      return res.status(500).json({ message: "cupon Database error" });
    }

    if (result18.length === 0) {
      return res.status(404).json({ message: "cupon not found" });
    } else {
      if (email === result18[0].email && code === result18[0].verified_code) {
        return res.status(200).json({
          success: true,
          message: "Code verified successfully!",
          code: result18[0].verified_code,
        });
      } else {
        res
          .status(400)
          .json({ success: false, message: "Invalid code or email." });
      }
    }
  });
});

function randDigits(length = 5) {
  let digits = "";
  for (let i = 0; i < length; i++) {
    digits += Math.floor(Math.random() * 10); // random 0-9
  }
  return digits;
}
function randHex(length) {
  let result = "";
  const hexChars = "0123456789abcdef";
  for (let i = 0; i < length; i++) {
    result += hexChars[Math.floor(Math.random() * 16)];
  }
  return result;
}

function generateSimpleKeys(prefix) {
  const now = Date.now().toString(36).toUpperCase(); // compact timestamp
  const part1 = randDigits(5); // e.g. 48291
  const apiKey = `${prefix}-${part1}-${now}`; // e.g. APP-48291-KF5G8

  const secret = `${randHex(12)}-${now}-${randDigits(4)}`; // long secret
  return { apiKey, secret };
}

app.post("/api/generate-key", (req, res) => {
  const { id } = req.body;
  console.log("code key generate:", id);
  let keys = generateSimpleKeys("App");

  const sql =
    "INSERT INTO handshake_company_secretkey (email, api_key, secret_key	) VALUES (?, ?, ?)";

  db.query(sql, [id, keys.apiKey, keys.secret], (err, result11) => {
    if (err) {
      console.log("DB Insert Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.status(200).json({
      success: true,
      message: "key generated",
      apiKey: keys.apiKey,
      secretKey: keys.secret,
    });
  });
});

//paymentgateway

// read keys from env

const  PAYU_KEY="rCB06F"
const PAYU_SALT = "FH1LOpG98Tu3tiyoB2kFy26BYIv9rPnp"
const PAYU_URL = process.env.PAYU_URL             // sandbox payment endpoint
const payuClient = new PayU(
  {
    key: PAYU_KEY, // Your merchant key
    salt: PAYU_SALT, // Your merchant salt
  },
  "TEST" // Use "LIVE" for production
);

// Utility: create txnid
function generateTxnId() {
  return "TXN" + Date.now();
}

// Example: endpoint to create a payment payload

app.post("/api/pay/create", (req, res) => {
  let amount = 0.0332;
  const { id, firstname, email, points } = req.body;

  // console.log(id,firstname);

  let poin = parseInt(points);
  console.log("poin", poin);

  amount = poin * amount;
  console.log(amount);
  let phone = "9999999999";
  let productinfo = "Test Product";
  //let  id="aniketkumarsaha5@gmail.com";
  const txnid = generateTxnId();
  // PayU hash string format (classic flow) - adjust fields to match your integration
  // hashString = key|txnid|amount|productinfo|firstname|email|||||||||||salt
  const hashString = `${PAYU_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${PAYU_SALT}`;
  const hash = crypto.createHash("sha512").update(hashString).digest("hex");

  // Response: front-end will post form to PAYU_URL using these params OR you forward user server side.
  res.json({
    action: "https://test.payu.in/_payment",
    key: PAYU_KEY,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    phone,
    hash,

    // success & failure redirect URLs (use your localhost in sandbox)
    surl: `https://emng-game-backend.onrender.com/payment/success?txnid=${txnid}&id=${id}&points=${points}`,
    furl: `https://emng-game-backend.onrender.com/payment/failure?txnid=${txnid}&points=${points}`,
  });
});

// Example: endpoint to create a payment payload
app.post("/payment/failure", (req, res) => {
  // const {amount, firstname,email  } = req.body;

  console.log(req.body);

  res.send("Payment Failure");
});

app.post("/payment/success", async (req, res) => {
  // const {amount, firstname,email  } = req.body;
  //const { txnid, amount, udf1: userId } = req.body;

  try {
    let txnid = req.query.txnid;
    let id = req.query.id;
    const points = req.query.points;
    // const   userid=req.query.userId;
    console.log("userid:", id);

    console.log("points:", points);

    const response = await payuClient.verifyPayment(txnid);

    const p = txnid;

    console.log(
      "Payment verification response:",
      response.transaction_details[txnid]
    );

    if (response.transaction_details[txnid].status === "success") {
      const sql31 = "SELECT * FROM user_scorecard WHERE email = ?";
      db.query(sql31, [id], (err, result31) => {
        if (err) {
          console.error("DB error:", err);
          return res.status(500).json({ message: "Database error" });
        }

        if (result31.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        //console.log(result[0]);
        //res.json(result[0]); // send first row

        let poin1 = parseInt(points);
        let score1 = parseInt(result31[0].score);
        console.log("poin", poin1);
        let score = score1 + poin1;

        const sql23 = "UPDATE user_scorecard SET score = ? WHERE email = ?";
        db.query(sql23, [score, id], (err, result23) => {
          if (err) {
            console.error("DB error:", err);
            return res
              .status(500)
              .json({ success: false, message: "Database error" });
          }

          if (result23.affectedRows === 0) {
            return res
              .status(404)
              .json({ success: false, message: "scorecard found" });
          }

          const sql2 =
            "INSERT INTO points_transaction (	username, number_points,total_amount	) VALUES (?, ?,?)";
          db.query(
            sql2,
            [id, poin1, response.transaction_details[txnid].amt],
            (err2, result2) => {
              if (err2) {
                return res
                  .status(500)
                  .json({ message: "Error saving user details", error: err2 });
              }

              // Success response
              let succes_ready_score = true;
            }
          );

          const redirectUrl = `http://emng.in/startgame/${id}`;
          return res.redirect(redirectUrl);
          // res.json({ success: true, message: "points hasbeen collected" });
        });
      });
    }
  } catch (err) {
    console.error("Error verifying payment:", err);
  }

  // console.log(userId);

  //res.send("Payment received succesfull");
});

//  two factoauthenticate

let userSecret = null;

//
app.post("/api/auth/generate", async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: process.env.company_key+"(" + req.body.username + ")",
  });
  userSecret = secret.base32;

  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
  res.json({ secret: secret.base32, qrCodeUrl });
});

app.post("/api/auth/verify_forcompany", (req, res) => {
  const { token, secret } = req.body;

  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: process.env.encoding,
    token,
    window: 1, // allow +/- 1 step for clock drift
  });

  if (verified) {
    res.json({ success: true, message: "2FA verified!" });
  } else {
    res.status(400).json({ success: false, message: "Invalid token" });
  }
});

//
app.post("/api/auth/verify", (req, res) => {
  const { token, secret, id } = req.body;

  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: process.env.encoding,
    token,
    window: 1, // allow +/- 1 step for clock drift
  });

  if (verified) {
    const sql234 = "UPDATE kycaccount SET google_auth = ? WHERE email = ?";
    db.query(sql234, ["true", id], (err, result) => {
      if (err) {
        console.error("DB error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      res.json({ success: true, message: "2FA verified!" });
    });
  } else {
    res.status(400).json({ success: false, message: "Invalid token" });
  }
});

// email  authenticate verification:

const pass=process.env.pass
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.email_admin_user,
    pass: pass,
  },
});

app.post("/api/auth/email_autheticate", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email required" });

  // Generate random verification code
  const verificationCode = crypto.randomBytes(3).toString("hex").toUpperCase();

  // Store user temporarily (replace with DB logic)
  // users[email] = { email, verified: false, code: verificationCode };

  // Send email
  const mailOptions = {
    from: process.env.email_admin_user,
    to: email,
    subject: "Email Verification Code",
    text: `Your verification code is: ${verificationCode}`,
    html: `<h3>Your verification code is: <b>${verificationCode}</b></h3>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({
      message: "Verification code sent!",
      verificationCode: verificationCode,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send email" });
  }
});

app.post("/api/auth/email_verify", (req, res) => {
  const { code1, code, id } = req.body;

  if (!code1) return res.status(400).json({ message: "User not found" });

  if (code1 === code) {
    // users[email].verified = true;

    const sql234 = "UPDATE kycaccount SET 	EMAIL_VERIFY = ? WHERE email = ?";
    db.query(sql234, ["true", id], (err, result) => {
      if (err) {
        console.error("DB error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      return res.json({ message: "Email verified successfully!", status: 200 });
    });
  } else {
    return res.status(400).json({ message: "Invalid verification code" });
  }
});

app.post("/api/check_kyc", (req, res) => {
  const { id } = req.body;
  console.log("check/kyc:", id);

  const sql73 = "SELECT * FROM kycaccount WHERE email = ?";
  db.query(sql73, [id], (err, result43) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result43.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    console.log(result43[0]);

    res.json(result43[0]); // send first row
  });
});

app.post("/api/user_score_fetch", (req, res) => {
  const { id } = req.body;
  console.log("id:", id);

  const sql78 = "SELECT * FROM user_scorecard WHERE email = ?";
  db.query(sql78, [id], (err, result478) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result478.length === 0) {
      return res.json({ message: "User not found" });
    }
    console.log(result478[0]);

    res.json(result478[0]); // send first row
  });
});

///get score

app.post("/api/signup_referal_with", (req, res) => {
  // const { id } = req.body;
  // console.log("id:", id);
  console.log(req.body.formData.name);
  const { name, email, phone, address, password } = req.body.formData;
  const sql =
    "INSERT INTO signup ( name,  email,  phone,address,password) VALUES (?, ?, ?, ?, ?)";

  db.query(sql, [name, email, phone, address, password], (err, result11) => {
    if (err) {
      console.error("DB Insert Error:", err);
      return res.status(500).json({ message: "Database error" });
    }


   const sql3 =
      "INSERT INTO kycaccount (email,google_auth,EMAIL_VERIFY) VALUES (?, ?,?)";
    db.query(sql3, [email, "false", "false"], (err2, result2) => {
      if (err2) {
        return res
          .status(500)
          .json({ message: "Error saving user details", error: err2 });
      }

      // Success response
      let succes_ready_score = true;
    });

 let score = 0;
    const sql2 = "INSERT INTO user_scorecard (email, 	score) VALUES (?, ?)";
    db.query(sql2, [email, score], (err2, result2) => {
      if (err2) {
        return res
          .status(500)
          .json({ message: "Error saving user details", error: err2 });
      }

      // Success response
      let succes_ready_score = true;
    });



  const sql = "SELECT * FROM user_scorecard WHERE email = ?";
  db.query(sql, [req.body.storeName2], async (err, results) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });

    if (results.length === 0) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    const user = results[0];
    console.log(user, password);

  if(results[0].email===req.body.storeName2){


let score_bonus=2000;
const num12= parseInt(score_bonus); 

let new_score=results[0].score+num12;






  const sql = "UPDATE user_scorecard SET score = ? WHERE email = ?";
  db.query(sql, [new_score, results[0].email], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "Bonus added   sucessfully" });
  });












  }

   else{

    res.json({ success: false, message: "reffer email does not exsist" });

   }
  });





    
    
  });
});








app.post("/api/userrankers", (req, res) => {
  //const { id } = req.body;
  

  const sql93 = "SELECT * FROM user_scorecard  ORDER BY score DESC LIMIT 5";
  db.query(sql93, (err, result93) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result93.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    console.log(result93[0]);

    res.json(result93[0]); // send first row
  });
});











app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});

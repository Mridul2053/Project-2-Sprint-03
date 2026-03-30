const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const db = new sqlite3.Database('./database.db');

// CREATE TABLE
db.run(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  password TEXT
)
`);

// REGISTER
app.post('/register',(req,res)=>{
  const {email,password} = req.body;

  db.run(
    "INSERT INTO users(email,password) VALUES(?,?)",
    [email,password],
    ()=> res.json({success:true})
  );
});

// LOGIN
app.post('/login',(req,res)=>{
  const {email,password} = req.body;

  db.get(
    "SELECT * FROM users WHERE email=? AND password=?",
    [email,password],
    (err,row)=>{
      if(row){
        res.json({success:true});
      } else {
        res.json({success:false});
      }
    }
  );
});

// START SERVER
app.listen(3000,()=>console.log("Server running on http://localhost:3000"));
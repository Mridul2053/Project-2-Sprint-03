
const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const bodyParser = require('body-parser')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(express.static('public'))

const db = new sqlite3.Database('fittracker.db')

db.serialize(()=>{

db.run(`CREATE TABLE IF NOT EXISTS users(
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT,
email TEXT,
password TEXT
)`)

db.run(`CREATE TABLE IF NOT EXISTS workouts(
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT
)`)

db.run(`CREATE TABLE IF NOT EXISTS macros(
id INTEGER PRIMARY KEY AUTOINCREMENT,
protein INTEGER,
carbs INTEGER,
fat INTEGER,
calories INTEGER
)`)

db.run(`CREATE TABLE IF NOT EXISTS progress(
id INTEGER PRIMARY KEY AUTOINCREMENT,
weight REAL,
date TEXT
)`)

})

app.post('/register',(req,res)=>{
const {name,email,password}=req.body
db.run("INSERT INTO users(name,email,password) VALUES(?,?,?)",[name,email,password],()=>{
res.send({status:'registered'})
})
})

app.post('/login',(req,res)=>{
const {email,password}=req.body
db.get("SELECT * FROM users WHERE email=? AND password=?",[email,password],(err,row)=>{
if(!row) return res.send({status:'fail'})
res.send({status:'success'})
})
})

app.get('/users',(req,res)=>{
db.all("SELECT id,name,email FROM users",(err,rows)=>{
res.json(rows)
})
})

app.get('/workouts',(req,res)=>{
db.all("SELECT * FROM workouts",(err,rows)=>{
res.json(rows)
})
})

app.post('/workouts',(req,res)=>{
const {name}=req.body
db.run("INSERT INTO workouts(name) VALUES(?)",[name],()=>{
res.send({status:'added'})
})
})

app.post('/macros',(req,res)=>{
const {protein,carbs,fat,calories}=req.body
db.run("INSERT INTO macros(protein,carbs,fat,calories) VALUES(?,?,?,?)",
[protein,carbs,fat,calories],()=>{
res.send({status:'saved'})
})
})

app.get('/progress',(req,res)=>{
db.all("SELECT * FROM progress",(err,rows)=>{
res.json(rows)
})
})

app.post('/progress',(req,res)=>{
const {weight,date}=req.body
db.run("INSERT INTO progress(weight,date) VALUES(?,?)",[weight,date],()=>{
res.send({status:'saved'})
})
})

app.listen(3000,()=>{
console.log("FitTracker V3 running http://localhost:3000")
})

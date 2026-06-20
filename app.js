const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const db = new sqlite3.Database('./database.db');


db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            phone TEXT,
            age INTEGER,
            department TEXT,
            message TEXT,
            submittedAt TEXT
        )
    `);

});

app.use(session({
    secret: 'studentportal',
    resave: false,
    saveUninitialized: false
}));


const PORT = 3000;
setInterval(() => {

    console.log(
        "Background Task Running:",
        new Date().toLocaleString()
    );

}, 60000);

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use((req, res, next) => {

    console.log(
        `[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`
    );

    next();

});
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many requests. Please try again later."
});


const weatherCache = {};

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/submit', (req, res) => {

    const {
        name,
        email,
        phone,
        age,
        department,
        message
    } = req.body;

    if (
        !name ||
        !email ||
        !phone ||
        !age ||
        !department
    ) {
        return res.send("All fields are required");
    }

    if (name.length < 3) {
        return res.send("Name should contain at least 3 characters");
    }

    if (phone.length !== 10) {
        return res.send("Phone number should contain 10 digits");
    }

    if (age < 18) {
        return res.send("Age should be 18 or above");
    }

    const submittedAt =
        new Date().toLocaleString();

    db.run(
        `INSERT INTO students
        (name,email,phone,age,department,message,submittedAt)
        VALUES(?,?,?,?,?,?,?)`,
        [
            name,
            email,
            phone,
            age,
            department,
            message,
            submittedAt
        ],
        function(err) {

            if(err){
                return res.send(err.message);
            }

            const user = {
                name,
                email,
                phone,
                age,
                department,
                message,
                submittedAt
            };

            res.render('success', { user });

        }
    );

});

app.get('/users', (req, res) => {

    db.all(
        `SELECT * FROM students ORDER BY id DESC`,
        [],
        (err, rows) => {

            if (err) {
                return res.send(err.message);
            }

            res.render('users', {
                users: rows
            });

        }
    );

});


app.get('/api/users', (req, res) => {

    db.all(
        `SELECT * FROM students ORDER BY id DESC`,
        [],
        (err, rows) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json(rows);

        }
    );

});
app.delete('/api/users/:id', (req, res) => {

    const id = req.params.id;

    db.run(
        `DELETE FROM students WHERE id = ?`,
        [id],
        function(err) {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json({
                message: "User deleted successfully"
            });

        }
    );

});
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {

    const {
        name,
        email,
        password
    } = req.body;

    db.run(
        `INSERT INTO users(name,email,password)
         VALUES(?,?,?)`,
        [name,email,password],
        function(err){

            if(err){
                return res.send(
                    'User already exists'
                );
            }

            res.redirect('/login');
        }
    );

});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {

    const {
        email,
        password
    } = req.body;

    db.get(
        `SELECT * FROM users
         WHERE email=? AND password=?`,
        [email,password],
        (err,user)=>{

            if(!user){
                return res.send(
                    'Invalid Credentials'
                );
            }

            req.session.user =
            user.id;

            res.send(
                'Login Successful'
            );

        }
    );

});
function checkAuth(req, res, next) {

    if (!req.session.user) {
        return res.redirect('/login');
    }

    next();
}

app.get('/dashboard', checkAuth, (req, res) => {

    res.send(`
        <h1>Welcome to Protected Dashboard</h1>
        <p>You are logged in.</p>
        <a href="/">Home</a>
    `);

});
app.get('/api/weather/:city', apiLimiter, async (req, res) => {

    try {

        const city =
            req.params.city.toLowerCase();

        if (weatherCache[city]) {

            return res.json({
                ...weatherCache[city],
                cached: true
            });

        }

        const response =
            await axios.get(
                `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric`
            );

        const weatherData = {

            city: response.data.name,

            temperature:
                response.data.main.temp,

            humidity:
                response.data.main.humidity,

            weather:
                response.data.weather[0].description

        };

        weatherCache[city] =
            weatherData;

        res.json(weatherData);

    } catch (error) {

    console.log("Weather Error:");
    console.log(error.response?.data || error.message);

    res.status(500).json({
        error: error.message
    });

}

});



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
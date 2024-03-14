const express = require('express');
const cookieParser = require('cookie-parser');
const { MongoClient, ObjectId } = require('mongodb');
const nodemailer = require('nodemailer'); 
require('dotenv').config();


const mongoUri = 'mongodb://127.0.0.1:27017'; 
const dbName = 'simpleApi'; 
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.APP_PASSWORD,
    }
})

const mail = {
    to: "",
    from: process.env.EMAIL_ID,
    subject: "OTP",
    text: ""
}


let studentsCollection;
let usersCollection;
async function connectToMongo() {
    try {
        const client = await MongoClient.connect(mongoUri);
        console.log("Connected to MongoDB");

        const db = client.db(dbName);
        studentsCollection = db.collection('students');
        usersCollection = db.collection('users');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SECRET_KEY));

app.listen(3000 ,  async()=>{
    console.log("listening on port 3000")
    await connectToMongo(); 
})

function authenticate(req, res, next) {
    if (req.cookies.isAuthenticated === 'true') {
        next();
    } else {
        res.redirect('/login');
    }
}

function generateOTP(length) {
    var digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < length; i++ ) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
}

function createEmail(emailId, otp) {

    return mail = {
        to: emailId,
        from: process.env.EMAIL_ID,
        subject: "OTP",
        text: otp
    }
}

app.post('/login', async (req, res) => {
    if(!req.body.username || !req.body.password){
        res.status(400)
        res.send({error:"incomplete credentials"})
    }

    const { username, password } = req.body;

    try {
        const user = await usersCollection.findOne({ username: username });

        if (!user) {
            
            res.status(400)
            res.send({error : "user not found" })
        }

        if (username == user.username && password == user.password) {
            const otp = generateOTP(5)
            res.cookie('otp', otp)
            res.cookie('email', user.email)
            transporter.sendMail(createEmail(user.email, otp))
            res.sendFile(__dirname + '/views/verify_otp.html');

            // res.cookie('isAuthenticated', true);
            // res.redirect('/methods')
        } else {
            res.status(400)
            res.send({error : "invalid credentials" })
        }

    } catch (error) {
        res.status(400)
        res.send({error : "user not found" })
    }

    
});

app.post('/verify-otp', (req, res) => {
    if (req.cookies.isAuthenticated == 'true') {
        res.redirect('/methods');
    } else{
        res.sendFile(__dirname + '/views/login.html');
    }

    if (req.body.otp === req.cookies.otp) {
        res.cookie('isAuthenticated', true);
        res.sendFile('/views/home.html')
    } else {
        res.status(400)
        res.send({error : "invalid otp" })
    }

});

app.get('/login', (req, res) => {
    if (req.cookies.isAuthenticated == 'true') {
        res.redirect('/methods');
    } else{
        res.sendFile(__dirname + '/views/login.html');
    }
});

app.get('/signup', (req, res) => {
    if (req.cookies.isAuthenticated === 'true') {
        res.redirect('/methods');
    } else {
        res.sendFile(__dirname + '/views/signup.html');
    }
});

app.post("/api/user", async (req,res)=>{
    try {
        if (!req.body.email) {
            res.status(400);
            return res.json({ error: "email is required" });
        }

        const user = {
            username: req.body.username,
            password: req.body.password,
            email: req.body.email,
        };

        await usersCollection.insertOne(user);
        const otp = generateOTP(5)
        res.cookie('otp', otp)
        res.cookie('email', user.email)
        transporter.sendMail(createEmail(user.email, otp))
        res.sendFile(__dirname + '/views/verify_otp.html');
        // res.status(200)
        // res.send({message: 'use signed up successfully' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
})

app.use(authenticate);

app.get('/logout', (req, res) => {
    res.cookie('isAuthenticated', false);
    res.redirect('/login')
});


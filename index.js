class CustomError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

const express = require('express');
const cookieParser = require('cookie-parser');
const { MongoClient, ObjectId } = require('mongodb');

const mongoUri = 'mongodb://127.0.0.1:27017'; 
const dbName = 'simpleApi'; 

let studentsCollection;
let usersCollection;

async function connectToMongo() {
    try {
        const client = await MongoClient.connect(mongoUri, { useNewUrlParser: true });
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
app.use(cookieParser());

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

app.post('/login', async (req, res) => {
    if(!req.body.username || !req.body.password){
        res.status(400)
        res.send({error:"incomplete credentials"})
    }

    const { username, password } = req.body;

    try {
        const user = await usersCollection.findOne({ username: username });

        if (!user) {
            throw new CustomError('user not found');
        }

        if (username == user.username && password == user.password) {
            res.cookie('isAuthenticated', true);
            res.redirect('/methods')
        } else {
            res.status(400)
            res.send({error : "invalid credentials" })
        }

    } catch (error) {
        res.status(400)
        res.send({error : "user not found" })
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
        res.status(200)
        res.send({message: 'Student updated successfully' })
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

app.get('/methods', (req, res) => {
    res.sendFile(__dirname + '/views/methods.html');
});

app.get('/methods/:method', (req, res) => {
    const method = req.params.method;
    const allowedMethods = ['post', 'put', 'delete'];

    if (allowedMethods.includes(method)) {
        res.sendFile(__dirname + `/views/${method}.html`);
    } else {
        res.status(404).send('Not Found');
    }
});

app.get("/api/students", async (req,res)=>{
    try {
        const students = await studentsCollection.find().toArray();
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
})

app.post("/api/students", async (req,res)=>{
    try {
        if (!req.body.email) {
            res.status(400);
            return res.json({ error: "email is required" });
        }

        const user = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email,
        };

        await studentsCollection.insertOne(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
})



app.put("/api/students/:id", async (req,res) =>{
    const studentId = req.params.id;
    const { first_name, last_name, email } = req.body;

    try {
        const existingStudent = await studentsCollection.findOne({ _id: new ObjectId(studentId) });

        if (!existingStudent) {
            throw new CustomError('Student not found');
        }

        const result = await studentsCollection.updateOne(
            { _id: new ObjectId(studentId) },
            { $set: { first_name, last_name, email } }
        );

        if (result.modifiedCount > 0) {
            res.json({ message: 'Student updated successfully' });
        } else {
            res.status(404).json({ error: 'Student not found' });
        }
    } catch (error) {
        res.status(400)
        res.send({error : error })
    }
})

app.delete("/api/students/:id" , async (req,res)=>{
    const studentId = req.params.id;

    try {
        const result = await studentsCollection.deleteOne({ _id: new ObjectId(studentId) });

        if (result.deletedCount > 0) {
            res.json({ message: 'Student deleted successfully' });
        } else {
            res.status(404).json({ error: 'Student not found' });
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})
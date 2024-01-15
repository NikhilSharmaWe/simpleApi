const express = require('express');
const cookieParser = require('cookie-parser');


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.listen(3000 ,  ()=>{
    console.log("listening on port 3000")
})

const validCredentials = {
    username: 'admin',
    password: 'password123',
};

function authenticate(req, res, next) {
    if (req.cookies.isAuthenticated === 'true') {
        next();
    } else {
        res.redirect('/login');
    }
}

app.post('/login', (req, res) => {
    if(!req.body.username || !req.body.password){
        res.status(400)
        return res.json({error:"incomplete credentials"})
    }

    const { username, password } = req.body;
  
    if (username == validCredentials.username && password == validCredentials.password) {
        res.cookie('isAuthenticated', true);
        res.redirect('/methods')
    } else {
        res.status(400)
        res.send({error : "invalid credentials" })
    }
});

app.get('/login', (req, res) => {
    if (req.cookies.isAuthenticated == 'true') {
        res.redirect('/methods');
    } else{
        res.sendFile(__dirname + '/views/login.html');
    }
});

app.use(authenticate);

app.get('/logout', (req, res) => {
    res.cookie('isAuthenticated', false);
    res.redirect('/login')
});

const students = [{
    "id": 1,
    "first_name": "Nikhil",
    "last_name": "Sharma",
    "email": "nikhil@gg.com"
  }, {
    "id": 2,
    "first_name": "Rewak",
    "last_name": "Tyagi",
    "email": "rewak@gg.com"
  }, {
    "id": 3,
    "first_name": "John",
    "last_name": "Wick",
    "email": "john@gg.com"
  }
]

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

app.get("/api/students", (req,res)=>{
    res.json(students);
})

app.post("/api/students", (req,res)=>{
    if(!req.body.email){
        res.status(400)
        return res.json({error:"email is required"})
    }

    const user = {
        id : students.length + 1,
        first_name : req.body.first_name,
        last_name : req.body.last_name,
        email : req.body.email, 
    }
    students.push(user)
})

app.put("/api/students/:id", (req,res) =>{
    let id = req.params.id
    let first_name = req.body.first_name
    let last_name = req.body.last_name
    let email = req.body.email

    let index = students.findIndex((student) =>{
        return (student.id==Number.parseInt(id))
    })

    if(index >=0 ) {
        let std = students[index]
        std.last_name = last_name
        std.first_name = first_name
        std.email=email 
    } else{
        res.status(404)
        res.send({error : "cannot found" })
    }
})

app.delete("/api/students/:id" , (req,res)=>{
    let id = req.params.id;
    let index = students.findIndex((student)=>{
    return (student.id == Number.parseInt(id))
    })
    if(index >=0){
        let std = students[index]
        students.splice(index , 1)
    }else{
        res.status(404)
        res.json({error : "cannot find index"})
    }
})
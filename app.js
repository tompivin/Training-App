/////////////////////////////////////
// express connection 
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const session = require('express-session');
const port = 5000;
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
app.listen(port, () => {
    console.log('server running on http: //localhost:${port}');
});

/////////////////////////
//session config
app.use(session({
    secret:'your-secret-key',
    resave: false,
    saveUninitialized: false
}));
// Set view engine
app.set('view engine', 'ejs');



//passport connection;
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

//passport 

passport.use(new LocalStrategy((username, password, done) => {
    db.get(logInQuery, [username, password], (error, row) =>{
        if(error) {
            return done(error);
        }
        if ( !row ) {
            return done(null, false, {message : 'Incorect usernam or password'});
        }

        const user = new User(row.user_name,row.user_age, row.user_password, row.user_exp, row.user_lvl);
        
        // Compare the provided password with the hashed password stored in the user object

        bcrypt.compare(password, user.password, (error, isMatch) => {
            if(error){
                return done(error);
            }
            if (!isMatch) {
               return done(null, false, {messsage : 'Incorrect username or password'});

            }
             // Authentication successful
            return done(null, user);
            });
        });
    })
);

//initialize Passport and session middleware
app.use(passport.initialize());
app.use(passport.session());


/////////////////////////////////////

//sqlite connection 
const sqlite3 = require('sqlite3');;
const db = new sqlite3.Database('user.db');
const insertQuery = 'INSERT INTO users (user_name, user_age, user_password) VALUES (?, ?, ?)';
const updateLvl = 'UPDATE users SET user_exp = ?, user_lvl = ? WHERE user_name = ?';


//////////////////////////////////////////////////////////////////
//user model
class User {
    constructor(name, age, password, exp = 0, lvl = 0){
        this.name = name;
        this.age = age;
        this.password = password;
        this.exp = exp;
        this.lvl = lvl;
    }
}
////////////////////////////////////////////////////
// lvl up function 
function lvlUp(user){
    while(user.exp >= 10){
    const remExp = user.exp - 10;
    user.exp = remExp;
    user.lvl++;
    };
}
/////////////////////////////////////////////////////
// user body-parser middleware with extended option
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());
/////////////////////////////////////////////////////
//training function 
const exerciceExp = 1;

function trainingTime(exerciceExp,exerciceTime, user){
    let total = exerciceExp * exerciceTime;
    user.exp = total;
    return lvlUp(user.exp) ;
}
//////////////////////////////////////////////////////
//hashing password function 

function passwordHasher(password, callback){
    //Generate a salt to use for hashing
    bcrypt.genSalt(10, (err, salt) =>{
        if (err) throw err;

        //hash the password using the generated salt 
        bcrypt.hash(password, salt, (err, hash) => {
            if (err) throw err;

            // invoke the callback
            callback(hash)
        })
    })
}
//////////////////////////////////////////////////////
 //logIn function 
function logIn(req, res) {
    const { username } = req.body //get username and password from the form for middleware
    
    //check the Datebase for a row
    db.run('SELECT * FROM users WERE user_name = ?', [username], function(error, row) {
        if(error) {
            throw error;
        }
        if (!row) {
            console.log('ther is now User with that name ')
            return res.render('create-account');
        }
        else{
            const user = new User(row.user_name, row.user_exp, row.user_lvl);
            req.login(User, (error) => {
                if(err) {
                    throw err;
                }
                console.log('User has been serialized and added to the session');
                return res.render('dashboard', {user});
            });

        }
    })
}

/////////////////////////////////////////////////////
//Acount creating form path

//path
app.post('/createAccount', (req, res)=>{
    const {username, password} = req.body;
    
    //check if user already exist 
    db.run("SELECT * FROM user WHERE user_name=?",[username], function(error, row) {
    if(error) throw error;
    
    if(row) {
        console.log('User already exist');
        res.statuts(400).send('User already exist');
    }else{
        //call passwordHasher
        passwordHasher(password, (hashedPassword) => {
            //Store the hashed password in the database
            db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], function(error){
                if (error) throw error;

                console.log("User account added");
                res.send("Acccount created succesfully");
            });
        });
    }
    });
});
//////////////////////////////////////////
//log in path

app.post('/login', passport.authenticate('local', {
    successRedirect :'/dashboard',
    failureRedirect: '/login',
}), logIn);



/////////////////////////////////////////////
//Upadting user lvl

app.post('/userLevel', (req, res) =>{
    //getting UserID
    const userId = req.session.user;
    const userExperience = User.exp;
    const userLvl = User.lvl;
    //getting the exerciceTime value 
    const {Time} = req.body;
    exerciceTime = Time;
    
    
    //calling the lvl updater 
    trainingTime(exerciceTime, exerciceExp);

    console.log('lvl up as been executed properly');
    //adding user lvl and experience to Database
    db.run(updateLvl, [userId, userExperience, userLvl], (err) => {
        if(err) {
            console.error('Error updating user level in the database:', err);
            res.status(500).send('Error updating user level in the database');
        } else {
            console.log('SQL query executed successfully');
            res.status(200).send('great job!');
            return res.render('dashboard', {userId});
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
});


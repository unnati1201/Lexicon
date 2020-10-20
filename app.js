const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(session({
  secret: "Build Vocabulary",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-unnati:test@123%23@cluster0.qxp39.mongodb.net/lexiconDB", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
mongoose.set("useCreateIndex", true);

const wordDetailSchema = new mongoose.Schema({
  word: String,
  synonyms: String,
  explaination: String
})

const WordDetail = new mongoose.model("WordDetail", wordDetailSchema);

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  words: [wordDetailSchema]
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

let workingId = null;
// GET
app.get("/",(req,res)=>{
  res.render("home");
})

app.get("/login",(req,res)=>{
  res.render("login");
})

app.get("/signUp",(req,res)=>{
  res.render("signUp");
})

app.get("/user/:id", (req,res)=>{
  if(req.isAuthenticated()){
    const requested = req.params.id;
    User.findOne({_id: requested}, (err, user)=>{
      workingId = user._id;
      res.render("myLexicon", {dataList: user.words});
    })
  }else{
    res.redirect("/login");
  }
})

app.get("/word/:wordId", (req,res)=>{
  if(req.isAuthenticated()){
    const requestedWord = req.params.wordId;
    WordDetail.findOne({_id: requestedWord}, (err, wordDetail)=>{
      res.render("wordDetails",{
        word: wordDetail.word,
        synonyms: wordDetail.synonyms,
        explaination: wordDetail.explaination
      })
    })
  }else{
    res.redirect("/login");
  }
})

app.get("/compose", (req,res)=>{
  if(req.isAuthenticated()){
    res.render("compose");
  }else{
    res.redirect("/login");
  }
});

app.get('/logout', function(req, res){
  workingId = null;
  req.logout();
  res.redirect('/');
});

//POST
app.post("/signUp", (req,res)=>{
  User.register({username: req.body.username}, req.body.password, (err,user)=>{
    if(err){
      console.log(err);
      res.redirect("/signUp");
    }else{
      if(req.body.password === req.body.confirmPassword){
        passport.authenticate("local")(req, res, ()=>{
          res.redirect("/user/"+user._id);
        })
      }else{
        res.redirect("/signUp");
      }
    }
  })
})

app.post("/login", (req,res)=>{
  const user = new User({
    username: req.body.username,
    password: req.body.password
  })

  req.login(user, (err)=>{
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req,res, ()=>{
        res.redirect("/user/" + req.user._id);
      })
    }
  })
})

app.post("/compose", (req,res)=>{
  const wordDetail = new WordDetail({
    word: req.body.newWord,
    synonyms: req.body.synonyms,
    explaination: req.body.explaination
  });
  User.updateOne({_id: workingId}, {$push: {words: wordDetail}}, (err)=>{
    if(err){
      console.log(err);
    }else{
      wordDetail.save();
      console.log("Successfully updated");
      res.redirect("/user/"+workingId);
    }
  })
})

app.post("/delete", (req,res)=>{
  const deleteWordId = req.body.delete;
  WordDetail.findByIdAndRemove(deleteWordId, (err)=>{
    if(err){
      console.log(err);
    }else{
      User.findOneAndUpdate({_id: workingId},{$pull: {words: {_id: deleteWordId}}},(err, user)=>{
        if(!err){
          res.redirect("/user/" + user._id);
        }else{
          console.log(err);
        }
      });
    }
  })
})
//Listen
app.listen(3000, (req,res)=>{
  console.log("Server running on port 3000");
})

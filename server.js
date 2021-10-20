const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const socket = require('socket.io');
const bcrypt = require('bcryptjs');
const {User, Question, Room} = require('./models/schema.js'); 
const bodyParser = require('body-parser');

var qlist = [];
const { requireAuth,checkUser } = require('./middleware/authMiddleware')
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
var clientNo = 1;
var user_array = [];
var qno = 0;
var endpoint = "";

var answerlist = {};
var questionObject = [];

// Functions
const handleErrors = (err) => {
  console.log(err.message,err.code);
}

const createToken = (id) => {
  return jwt.sign({id},'Danish Codes',{ expiresIn: 60 * 60})
}
var points = 0;

function extractAnswer(list){
  let answer_array = [];
  list.forEach(element => {
    answer_array.push(element.answer)
  })
  return answer_array
}


function answerValidation(){
  for(let i=0; i<5; i++){
    if(qlist[i].answer === answerlist[i].radio){
      points += 10;
    }
  }
  return points
}

function objCheck(room,user){
  if(questionObject)
  {
    for (let i=1; i<questionObject.length; i++){
      if(questionObject[i].roomno === room && (questionObject[i].user1 === user || questionObject[i].user2 === user)){
      return true
      break
      }
    }
    return false
  }else{
    return false
  }
}

function aQno(){
    if(qno === 5){
      qno = 0;
    }
  return qno
  qno++;
}

function bQno(){
  if(qno === 4){
    return 0
  }else{
    return qno + 0
  }
}

app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(cookieParser())

const uri = "mongodb+srv://admin:admin@cluster0.hvfsk.mongodb.net/game_database?retryWrites=true&w=majority";

const connectionParams = {
  useNewUrlParser: true,
  useUnifiedTopology: true
}

mongoose.connect(uri, connectionParams)
  .then(() => {
    console.log('Connected to database ')
  })
  .catch((err) => {
    console.error(`Error connecting to the database. \n${err}`);
  })


const server = app.listen(3000, () => {
  console.log("connected to server");
})

io = socket(server);

io.on('connection',(socket) => {
  console.log("socket connection made",socket.id);
  socket.on('clientToServer',function(data){
    if(!user_array.includes(data.username)){
      user_array.push(data.username)
      var roomNo = Math.round(clientNo/2);
      socket.join(roomNo);
      if(user_array.length === 2){
        console.log(user_array)
        questionObject.push({
              roomno:roomNo,
              usr1:user_array[0],
              usr2:user_array[1],
              submit: 0})
      Question.find()
        .then(result => {
          qlist = result.sort(() => Math.random() - Math.random()).slice(0, 5);
          let temp = extractAnswer(qlist)
          console.log("temp=>",temp)
          let room = new Room({ roomno: roomNo, user1: user_array[0], user2: user_array[1], answer_list: temp})
          room.save();
          //let tempObj = objCheck(roomNo,user1)
          // console.log(qlist)
         
          for (let i=0; i<questionObject.length;i++){
            
            if(questionObject[i].roomno === roomNo){
              questionObject[i].queslist = qlist;
              questionObject[i].answer = temp;
            }
          }
        })
        
      console.log("qlist",qlist)
      console.log(socket.rooms)
      io.sockets.emit("redirect",user_array)
        
      user_array = [];
      }
      clientNo++;
    }
    io.sockets.emit('serverToClient',{
      userArray : user_array
    })
  })
})



app.set('view engine','ejs');


app.get('*',checkUser)
app.post('*',checkUser)

app.get("/",(req,res) => {
    res.redirect("/welcome")
})

app.get("/welcome",(req,res) => {
    res.render("welcome");
})


app.post("/welcome",async (req,res) => {
    const {email, password} = req.body;
    try {
      let user = await User.login(email,password)
      if(user){
        const token = createToken(user._id)
        res.cookie('jwt',token,{httpOnly: true, maxAge: 60 * 60 * 1000});
        res.redirect("/start");
      }
    } catch (err) {
      res.status(400).send("error")
    }
       
});

app.get("/signup",(req,res) => {
    res.render("signup");
})


app.post("/signup",(req,res) => {
    const user = new User(req.body);
    const token = createToken(user._id)
    res.cookie('jwt',token,{httpOnly: true, maxAge: 60 * 60 * 1000});
    
    user.save()
        .then((result) => {
          res.redirect('/start')
          
        })
        .catch((err) => {
          handleErrors(err);
          res.status(400).send("error, User not created")
        })
});



app.get("/start",requireAuth,(req,res) => {
  res.render("start",{
    usrlist : user_array
  });
})

app.get("/quiz",async (req,res) => {
  
  await res.render("begin",{fquesid : qlist[0]._id});
  
})

app.get("/logout",(req,res) => {
  res.cookie('jwt','', {maxAge: 1});
  res.redirect('/welcome')
    
})

function quizGiver(user){
  for(let i = 0; i < questionObject.length; i++){
    if(questionObject[i].user1 === user || questionObject[i].user2 === user){
      console.log(i,"found")
      return i
      break
    }
    console.log("not exist")
  }
}

app.get("/quiz/:id/:user/:n",requireAuth,async (req,res) => {
  const para_user = await req.params.user;
  const para_id = await req.params.id;
  const n = await parseInt(req.params.n)
  console.log(questionObject[0].queslist)
  console.log(questionObject[0].queslist[0])
  // res.redirect(`/quiz/${para_id}/${para_user}/${n}`)
  
  // for (let i = 0; i < questionObject.length; i++) {
  //   if (questionObject[i].usr1 === para_user || questionObject[i].usr2 === para_user) {
  //     // console.log(i,"found");
  //     setindex = i;
  //     break
  //   }
  // }
  // var js = JSON.stringify(questionObject[setindex].queslist[n]._id).substr(1, 24);
    // var js2 = JSON.stringify(questionObject[setindex].queslist[n+1]._id).substr(1, 24);
    // var js3 = questionObject[setindex].queslist[n]
  
  await res.render("quiz", { question: qlist[0], nextquesid: qlist[0]._id,ides:qlist[0]._id ,nn: 1})

})



app.post("/quiz/:id/:user/:n",async (req,res) => {
    
    const para_user  = await req.params.user;
    const para_id = await req.params.id;
    var n = await parseInt(req.params.n)
    var setindex = 0;
    n++
    
    for(let i = 0; i < questionObject.length; i++){
      if(questionObject[i].usr1 === para_user || questionObject[i].usr2 === para_user){
      // console.log(i,"found");
        setindex = i;
        break
      }
      console.log("not exist")
    }
    console.log("*****",para_user,para_id,"n=",n,setindex);

    const useranswer = req.body;
    if(answerlist[para_user]){
      answerlist[para_user].push(useranswer.radio);
    }else{
      answerlist[para_user] = [useranswer.radio]
    }
    
    if(n <= 4){
    var js = JSON.stringify(questionObject[setindex].queslist[n]._id).substr(1, 24);
    var js2 = JSON.stringify(questionObject[setindex].queslist[n]._id).substr(1, 24);
    var js3 = questionObject[setindex].queslist[n]
    }
    
    console.log("*****",para_user,para_id,"n=",n,setindex);
    console.log("@@@@@",js2)
    console.log(answerlist)
    console.log(js3)
    
    if (answerlist[para_user].length === 5) {
      questionObject[setindex][para_user] = [answerlist[para_user]];
    
      var fscr = 0;
      for(let i = 0;i<5;i++){
        if(questionObject[setindex].answer[i] === questionObject[setindex][para_user][0][i]){
          console.log(questionObject[setindex][para_user][0][i],"'",questionObject[setindex].answer[i])
          fscr += 10
        }
      }
      
      questionObject[setindex][para_user].push(fscr)
      questionObject[setindex].submit += 1;
      console.log(answerlist[para_user])
      
      if(questionObject[setindex].submit === 1){
        res.redirect(`/quiz/wait/${para_user}`)
      }else if(questionObject[setindex].submit === 2){
        res.redirect(`/quiz/score/${para_user}`)
      }
      
      qno = 0;
      qlist = [];
      console.log(questionObject)
      res.redirect("/start")
    }else{
      await res.render("quiz", { question:js3, nextquesid: js,ides: js2, nn: n+1})
    }
});

app.get('/quiz/wait/:user',(req,res) => {
  const user = req.params.user;
  res.render('waiting',{user: user})
})

app.get('/quiz/score/:user',(req,res) => {
  const user = req.params.user;
  var user_sc1 = "";
  var user_sc2 = "";
  var index_sc = 0;
  for(let i=0; i<questionObject.length; i++){
    if(questionObject[i][user]){
        if(questionObject[i].usr1 === user){
          user_sc1 = questionObject[i].usr1;
          user_sc2 = questionObject[i].usr2;
        }else{
          user_sc1 = questionObject[i].usr2;
          user_sc2 = questionObject[i].usr1;
        }
      index_sc = i;
    }
    break
  }
  console.log(questionObject[index_sc][user_sc1],"---------->>>>>")
  res.render('score',{user1: [user_sc1,questionObject[index_sc][user_sc1][1]], user2: [user_sc2,questionObject[index_sc][user_sc2][1]]})
})


const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    user: {
      type: String,
      required: [true,"Please enter a user name"],
      unique: true
    },
    password: {
      type: String,
      required: [true,"Please enter a password"],
      minlength: [6,"password length should be greater then 6"]
    }
},
{ timestamps:true });

UserSchema.pre('save',async function(next){
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password,salt);
  next();
})

UserSchema.statics.login = async function(email,password){
  const user = await this.findOne({ user :email });
  console.log(user)
  if(user){
    const auth = await bcrypt.compare(password,user.password);
    
    if(auth){
      return user
    }
    throw Error('incorrect password')
  }
  throw Error('incorrect email')
}

const User = mongoose.model("User", UserSchema);

const QuestionSchema = new mongoose.Schema({
    Q: {
        type: String
    },
    a: {
      type: String
    },
    b: {
      type: String
    },
    c: {
      type: String
    },
    d: {
      type: String
    },
    answer: {
      type: String
    }
});

const Question = mongoose.model("Question", QuestionSchema);

const RoomSchema = new mongoose.Schema({
  roomno : {
    type : Number
  },
  user1 : {
    type : String 
  },
  user2 : {
    type : String
  },
  answer_list : {
    type : Array
  },
  expire_at: {
  type: Date, 
  default: Date.now, 
  expires: 60}
})

const Room = mongoose.model("Room", RoomSchema);

module.exports = {
  User,
  Question,
  Room
}
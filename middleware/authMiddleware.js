const jwt = require('jsonwebtoken');
const { User } = require('../models/schema.js')
const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt; 
  
  if(token){
    jwt.verify(token,'Danish Codes',(err,decodedToken) => {
      if(err){
        console.log(err.message);
        res.redirect('/welcome');
      }
      else{
        //console.log(decodedToken);
        next()
      }
    })
  }
  else{
    res.redirect('/welcome');
  }
}

const checkUser = (req, res, next) => {
  const token = req.cookies.jwt; 
  
  if(token){
    jwt.verify(token,'Danish Codes',async (err,decodedToken) => {
      if(err){
        console.log(err.message);
        res.locals.user = null;
        next();
      }
      else{
        //console.log(decodedToken,"####");
        let user = await User.findById(decodedToken.id);
        // console.log(user,"!!!!")
        res.locals.user = user;
        // console.log(user);
        next()
      }
    })
  }
  else{
    res.locals.user = null;
    next();
  }
}

module.exports = { requireAuth,checkUser }
const jwt=require('jsonwebtoken');
const sec_key=process.env.JWT_SEC_KEY
// to creating the token with id as pasload
const createToken=(id)=>{
    return token=jwt.sign({id:id},sec_key)
}

module.exports={createToken}
const jwt=require('jsonwebtoken');
const auth = async (req, res, next) => {
    //to check the authorization is coming with request or not
    if (req.headers.authorization === undefined) return res.json({ success: false, message: 'Token not found.' });
   //to abstract token with incoming request
    const token = req.headers.authorization.split(' ')[1];
    //if token found
    if (token) {
        try {
         //verifying token and getting loggedi user
            const verifyToken = jwt.verify(token,process.env.JWT_SEC_KEY);
            //assign req.user with abstracted user details
            req.user=verifyToken;
        } catch (error) {
            //when we failed to verify the toekn
            res.json({ success: false, message: 'Invalid token.' });
        }
        next();
    }
    else {
        // if token not found 
        res.json({ success: false, message: 'Token not found.' })
    }
}

//to exporting the modeule
module.exports = { auth }
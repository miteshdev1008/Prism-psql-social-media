//requiring the prisma migrations
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

//to check the single time login
const is_login = async (req, res, next) => {
    try {
        //geting the userid based on token
        const userId = req.user.id;
        //find the user's token from db
        const findToken = await prisma.users.findUnique({ where: { id: parseInt(userId) } });
        const currentToken = req.headers.authorization.split(' ')[1];
        //check the both token is matched 
        if (currentToken == findToken.token) {
            next();
        }
        else { 
        //if not matched then logout
        return res.status(403).json({ succees: false, message: "You are not authorized to access this resource." });
    }
    } catch (error) {
    res.json({ success: false, message: error.message });
}
}

module.exports = { is_login }
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const is_block = async (req, res, next) => {
    const userId = req.user.id;
    const isAdmin = await prisma.users.findUnique({
        where: {
            id: userId
        }
    });
    console.log(isAdmin);
    if (isAdmin.is_blcok == false) {
        next();
    }
    else{
        res.json({success:false,message:'Sorry you are blocked by admin.'});
    }
}

module.exports = { is_block}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const is_admin = async (req, res, next) => {
    const userId = req.user.id;
    const isAdmin = await prisma.users.findUnique({
        where: {
            id: userId
        }
    });
    console.log(isAdmin);
    if (isAdmin.user_type == 'Admin') {
        next();
    }
    else{
        res.json({success:false,message:'Only admin can have rights to perform this operatin.'});
    }
}

module.exports = { is_admin }
const exp = require('express');
const app = exp();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
app.use(exp.json())

//for creating the use with post
app.get('/', async (req, res) => {
    try {
        const newUser = await prisma.user.create({
            data: {
                name: 'Alice',
                email: 'alices@prisma.io',
                Post: {
                    create: {
                        title: 'Hello World',
                    },
                },
            },
        })
        console.log('Created new user: ', newUser)

        const allUsers = await prisma.user.findMany({
            include: { Post: true },
        })
        console.log('All users: ')
        console.dir(allUsers, { depth: null })

        // Send the fetched data as JSON response
        res.json("data");
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


//for getting all user
app.get('/users', async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users)
})

//for getting all posts
app.get('/feed', async (req, res) => {
    const Post = await prisma.Post.findMany();
    res.json(Post)
})
    
//for getting a post by id
app.post(`/post/:id`, async (req, res) => {
    const { id } = req.params;
    console.log(id);
    const post = await prisma.Post.findUnique({
        where: { id: Number(id) },
    })
    res.json(post)
})

//for updating the post
app.put('/post/:id', async (req, res) => {

})

//for deleting the post
app.delete('/post/:id', async (req, res) => {
    const userid = req.params.id;
    console.log(userid)
    const Post = await prisma.Post.delete({
        where: {
            id: parseInt(userid),
        }
    });
    res.json(Post)
})

//to listen the app
app.listen(8080, '192.168.0.129', () => {
    console.log("app is live on " + '192.168.0.129:' + '8080');
});

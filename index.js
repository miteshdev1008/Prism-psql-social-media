const exp = require('express');
const app = exp();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const multer = require('multer');
const moment = require('moment');
const { createToken } = require('./middleware/token');
const { auth } = require('./middleware/auth');
const { is_login } = require('./middleware/is_login');
const { is_admin } = require('./middleware/is_admin');
const { is_block } = require('./middleware/is_block');

//base url from .env
const base_url = process.env.BASE_URL || '192.168.0.131';

//port from .env
const port = process.env.port || 8080;

//to upload a picture on specific folder and middlewear
const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public");
    },
    filename: (req, file, cb) => {
        const ext = file.mimetype.split("/")[1];
        cb(null, `files/post-${file.fieldname}-${Date.now()}.${ext}`);
    },
})

//to upload a file and get it 
const upload = multer({
    storage: multerStorage,
});

//to support json incoming data
app.use(exp.json())
app.use(exp.urlencoded({ extended: true }));

//for creating the user 
app.post('/signup', upload.single('image'), async (req, res) => {
    try {
        if (req.file.mimetype.split('/')[1] != 'jpg' && req.file.mimetype.split('/')[1] != 'png' && req.file.mimetype.split('/')[1] != 'jpeg') {
            return res.status(500).json({ success: false, message: 'Upload only png/jpg/jpeg files.' })
        }
        if (!/^([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/.test(req.body.email)) {
            return res.json({ success: false, message: 'Enter valid email address.' });
        }
        if (!/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/.test(req.body.password)) {
            return res.json({ success: false, message: 'Enter valid password.' });
        }
        var pic_url = './public/' + req.file.filename;
        //to check that if username is exists or not
        const findmail = await prisma.users.findUnique({ where: { email: req.body.email } });
        if (findmail) return res.status(403).json({ success: true, message: 'User name already exists.' });

        const newUser = await prisma.users.create({ data: { email: req.body.email, password: req.body.password, profile_pic: pic_url } });
        const token = createToken(newUser.id);

        //updating the user's data where insert token islogin true 
        await prisma.users.update({ where: { id: parseInt(newUser.id) }, data: { token: token, is_login: true, user_type: 'Admin' } });


        res.json({ success: true, messgae: 'signup successfully', token });
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
});

//for login
app.post('/login', async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        const getUser = await prisma.users.findUnique({
            where: {
                email: username
            }
        });
        if (getUser) {
            if (getUser.password === password) {
                const token = createToken(getUser.id);
                //updating the users data with token and is_login with true
                await prisma.users.update({ where: { id: parseInt(getUser.id) }, data: { token: token, is_login: true } });
                //giving all the user 
                res.json({ success: true, token });
            }
            else {
                res.json({ success: true, message: 'Password is wrong.' })
            }
        }
        else {
            res.json({ success: true, message: 'Username not found.' })
        }
    } catch (error) {
        res.json({ success: false, message: error });
    }
});

//for getting all user
app.get('/allusers/:page', auth, is_login, is_admin, async (req, res) => {

    try {
        const page = parseInt(req.params.page);
        console.log(page)
        if (page == 0) {
            //to skip the documents
            const skip = page * 3;
            //to specify that how many records to fetch from db
            const take = 3;
            //if first page that menas 0 to skip and 3 documnet to keep it to send furthure
            const users = await prisma.users.findMany({
                take: take, skip: skip, orderBy: {
                    id: 'asc',
                }
            });
            res.json({ success: true, data: users });
        }
        else {
            const skip = page * 3;
            const take = 3;
            const users = await prisma.users.findMany({
                take: take,
                skip: skip,
                orderBy: {
                    id: 'asc',
                }
            });
            res.json({ success: true, data: users });
        }
    }
    catch (e) {
        res.json({ success: false, message: e });
    }
})

//for logout
app.get('/logout', auth, async (req, res) => {
    try {
        //getting the user id from the current user id 
        const userId = req.user.id;
        //updating user account token to empty&last seen of today&&is_login to false
        await prisma.users.update({ where: { id: parseInt(userId) }, data: { token: '', last_seen: new Date(), is_login: false } });
        //sending the response
        res.json({ success: true, message: 'User logedout successfully.' });
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.toString() })
    }
})

//for deleting the post
app.delete('/deleteuser', auth,is_block, is_login, async (req, res) => {
    try {
        const userid = req.body.id;
        await prisma.users.delete({
            where: {
                id: parseInt(userid),
            }
        });
        res.json({ success: true, messgae: 'User deleted successfully.' });
    }
    catch (e) {
        console.log("first", e)
        res.json({ success: false, messgae: e });
    }

});

//to delete by admin
app.delete('/delete-user-by-id', auth, is_login, is_admin, async (req, res) => {
    try {
        const deleteUserID = parseInt(req.body.deleteid);
        console.log(deleteUserID);
        //deleting the user by id
        await prisma.users.delete({ where: { id: deleteUserID } });

        res.json({ success: true, data: 'User deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.toString() });
    }


});

//for updating the user crededtials
app.patch('/updateuser', auth,is_block,  is_login, upload.single('image'), async (req, res) => {
    try {
        var id = req.user.id;

        if (req.body.hasOwnProperty('email')) {
            if (!/^([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/.test(req.body.email)) {
                return res.json({ success: false, message: 'Enter valid email address.' });
            }
        }

        if (req.body.hasOwnProperty('password')) {
            if (!/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/.test(req.body.password)) {
                return res.json({ success: false, message: 'Enter valid password.' });
            }
        }

        const Post = await prisma.users.update({
            where: { id: parseInt(id) },
            data: req.body
        });
        res.json({ success: true, message: 'Data updated successfully.' })
    }
    catch (e) {
        console.log(e)
        res.json({ success: false, message: e });
    }


});

//for making a post
app.post('/post', upload.single('img'), auth,is_block,  is_login, async (req, res) => {
    try {
        if (req.file.mimetype.split('/')[1] != 'jpg' && req.file.mimetype.split('/')[1] != 'png' && req.file.mimetype.split('/')[1] != 'jpeg') {
            return res.status(500).json({ success: false, message: 'Upload only png/jpg/jpeg files.' })
        }
        else {
            var pic_url = './public/' + req.file.filename;
            var poetedby = req.user.id;
            var post = await prisma.posts.create({ data: { post_url: pic_url, posted_by: parseInt(poetedby) } });
            res.json({ success: true, data: post });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error });
    }



});

//getall posts
app.get('/allpost/:page', auth, is_admin, async (req, res) => {
    try {
        const page = parseInt(req.params.page);
        var take = 0;
        var skip = 0;

        if (page == 0) {
            take = 3;
            skip = page * 3;
        }
        else {
            take = 3;
            skip = page * 3;
        }
        //for getting all posts
        const allpost = await prisma.posts.findMany({
            take, skip,
            orderBy: {
                id: 'asc',
            }
        });

        //iterator over all looping statement
        for (i = 0; i < allpost.length; i++) {
            //asigning the array of likes by post
            const likedByUser = allpost[i].liked_by;

            //to find username from the table of users for cheking whom liked posts
            const userlikes = await prisma.users.findMany({
                where: {
                    id: {
                        in: likedByUser,
                    }
                }, select: {
                    email: true
                }
            });

            allpost[i].liked_by = userlikes;
            const dateInIso = allpost[i].created_at + '';


            allpost[i].created_at = dateInIso.split('G')[0];
            // to give comment on post 
            const allcomments = await prisma.comment.findMany({
                where: { post_id: allpost[i].id }
            });

            var comments = [];
            //to iterrate over howmany comments user had
            for (j = 0; j < allcomments.length; j++) {
                const commented_by = await prisma.users.findUnique({
                    where: {
                        id: allcomments[j].comment_by
                    },
                    select: {
                        email: true,
                    }
                })
                //to pushing the element into the comments
                comments.push({ comment: allcomments[j].content, commentedby: commented_by.email });
            }
            //for adding the comments in response 
            allpost[i].comments = comments;
        }
        res.json({ success: true, data: allpost });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error });
    }


});

//like dislike facility
app.post('/likepost', auth,is_block,  is_login, async (req, res) => {
    try {
        const post_id = req.body.post_id;
        const user_id = req.user.id;
        //to find the post
        const findpost = await prisma.posts.findUnique({
            where: {
                id: parseInt(post_id),
            }
        });
        //to check that weather user likes or not
        const is_likes = findpost.liked_by.includes(parseInt(user_id));
        //if user dislikes
        if (is_likes) {
            //decrease the value of like following by 1
            var likes = findpost.likes;
            likes -= 1;
            var likedby = findpost.liked_by;
            //removing dislike user id from liked_by array
            likedby.pop(parseInt(user_id));
            //updating the record
            const updatepost = await prisma.posts.update({
                where: {
                    id: parseInt(post_id)
                }, data: {
                    likes: likes,
                    liked_by: likedby
                }
            })
            res.json({ success: true, message: 'Dislkes the post successfully.' });
        }
        //if user likes
        else {
            //getting all likes and increase it by 1
            var likes = findpost.likes;
            likes += 1;
            //updating the likes as well as pushing the user id to the liked_by
            const updatepost = await prisma.posts.update({
                where: {
                    id: parseInt(post_id)
                }, data: {
                    likes: likes,
                    liked_by: {
                        push: parseInt(user_id)
                    }
                }
            })
            res.json({ success: true, message: 'Liked the post successfully.' });
        }
    } catch (error) {
        res.json({ success: false, message: error });
    }
});

//delete the post
app.delete('/deletepost/:id', auth,is_block,  is_login, async (req, res) => {
    try {
        const id = req.params.id;
        await prisma.posts.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, messae: 'Post deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error })
    }
});

//deleting the post by admin via id
app.delete('/delete-post-by-id', auth, is_login, is_admin, async (req, res) => {
    try {
        const postId = req.body.post_id;
        await prisma.posts.delete({ where: { id: parseInt(postId) } });
        res.json({ success: true, message: 'Post deleted successfully.' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message.toString() });
    }
});

//to add the comment
app.post('/comment', auth,is_block,  is_login, async (req, res) => {
    try {
        const post_id = req.body.post_id;
        const comment_by = req.user.id;
        const content = req.body.content;
        //create a comment
        const createcomment = await prisma.comment.create({
            data: {
                content: content,
                comment_by: parseInt(comment_by),
                post_id: parseInt(post_id)
            }
        });

        //sending response 
        res.json({ success: 'true', data: createcomment });
    }
    catch (e) {
        console.log(e)
        res.json({ success: 'false', message: e });
    }


});

//for uploading a story
app.post('/upload-story', upload.single('img'), auth,is_block,  is_login, async (req, res) => {
    try {
        const userId = req.user.id;
        //cheking that user only upload png/jpg/jpeg formats
        if (req.file.mimetype.split('/')[1] != 'jpg' && req.file.mimetype.split('/')[1] != 'png' && req.file.mimetype.split('/')[1] != 'jpeg') {
            return res.status(500).json({ success: false, message: 'Upload only png/jpg/jpeg files.' })
        }
        else {
            //asigning the pic url
            var story_url = './public/' + req.file.filename;
            var story = await prisma.story.create({ data: { pic_url: story_url, uploaded_by: parseInt(userId) } });
            res.status(200).json({ success: true, data: story });
        }

    } catch (error) {
        console.log(error.toString())
        res.json({ success: false, message: error.toString() });
    }
});

//to get the all story of logged user
app.get('/mystory', auth,is_block,  is_login, async (req, res) => {
    try {
        const userId = req.user.id;
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const getAllStory = await prisma.story.findMany({
            where: {
                AND: [
                    { uploaded_by: parseInt(userId) },
                    { createdat: { gte: twentyFourHoursAgo } },
                ],
            },
        })

        if (getAllStory) {
            return res.json({ success: true, data: getAllStory });
        }
        else {
            return res.json({ success: true, message: 'Sorry you don\'t have uploaded any story in last within 24 hours' });
        }
    } catch (error) {
        return res.json({ success: false, message: error.toString() })
    }
});

//to update the story loged user story 
app.patch('/update-story', upload.single('img'), auth,is_block,  is_login, async (req, res) => {
    try {
        const userId = req.user.id;
        const storyid = req.body.storyid;
        if (req.file.mimetype.split('/')[1] != 'jpg' && req.file.mimetype.split('/')[1] != 'png' && req.file.mimetype.split('/')[1] != 'jpeg') {
            return res.status(500).json({ success: false, message: 'Upload only png/jpg/jpeg files.' })
        }
        else {
            //asigning the pic url
            var story_url = './public/' + req.file.filename;
            var story = await prisma.story.update({ where: { id: parseInt(storyid) }, data: { pic_url: story_url } });
            res.status(200).json({ success: true, data: story });
        }

    } catch (error) {
        res.status(500).json({ success: false, messgae: error.toString() });
    }
});

//deleting the story
app.delete('/delete-story', auth,is_block,  is_login, async (req, res) => {
    try {
        const userId = req.user.id;
        const storyId = req.body.storyid;
        // getting the deatils of the story by id
        const details = await prisma.story.findUnique({ where: { id: parseInt(storyId) } });
        if (details.uploaded_by == userId) {
            await prisma.story.delete({ where: { id: parseInt(storyId) } });
            res.json({ success: true, message: 'Story deleted successfully.' });
        }
        else {
            res.json({ success: true, message: 'You are not authorise to do so.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, messgae: error.toString() });
    }
});

//to delete the comment
app.delete('/delete-comment', auth,is_block,  is_login, async (req, res) => {
    try {
        const comment_id = req.body.comment_id;
        const userid = req.user.id;

        //to find the comment by id
        const check_commented_by_user = await prisma.comment.findUnique({
            where: {
                id: parseInt(comment_id)
            }
        });
        //if comment is find by id
        if (check_commented_by_user) {
            //then check the comment is done by login user
            if (check_commented_by_user.comment_by == userid) {
                //if yes then to delete the comment by id
                await prisma.comment.delete({
                    where: {
                        id: parseInt(comment_id)
                    }
                });
                res.json({ success: true, message: 'Comment was deleted successfully.' });
            }
            //when comment is not done by the current user
            else {
                res.json({ success: false, message: 'This comment is not associate with you.' });
            }
        }
        //when comment was not found by the given id
        else {
            res.json({ success: false, message: 'Comment not found.' });
        }
    } catch (error) {
    }
});

//to get the all comment
app.get('/get-all-comment/:page', auth, is_admin, async (req, res) => {
    try {
        const page = parseInt(req.params.page);
        //to find the all comments
        if (page == 0) {
            take = 3;
            skip = page * 3;
        }
        else {
            take = 3;
            skip = page * 3;
        }
        const all_comments = await prisma.comment.findMany({
            take,
            skip,
            orderBy: {
                id: 'asc',
            }
        });
        res.json({ success: true, data: all_comments });
    } catch (error) {
        res.json({ success: false, message: error });
    }
});

//to edit the coomment
app.patch('/edit-comment', auth,is_block,  is_login, async (req, res) => {
    try {
        const comment_id = req.body.comment_id;
        const userid = req.user.id;

        //to find the comment by id
        const check_commented_by_user = await prisma.comment.findUnique({
            where: {
                id: parseInt(comment_id)
            }
        });
        //to check the comment is available or not by given id
        if (check_commented_by_user) {
            //cheking that comment was created by current loged in user
            if (check_commented_by_user.comment_by == userid) {
                //getting the updating comment
                const content = req.body.content;

                //updating the comment
                await prisma.comment.update({
                    where: {
                        id: parseInt(comment_id)
                    },
                    data: {
                        content
                    }
                });
                //giving response that comment is updated
                res.json({ success: true, message: 'Comment updated successfully' });
            }
            else {
                //this triggers when user is trying to update other user's created comment
                res.json({ success: false, message: 'This comment is not belongs to you.' });
            }
        }
        else {
            //triggers when commnet not found by given id
            res.json({ success: false, message: 'Comment not found.' })
        }
    } catch (error) {
        console.log(error)
        //when any error occures
        res.json({ success: false, message: error });
    }

});

//to delete a comment
app.delete('/delete-comment-id', auth, is_login, is_admin, async (req, res) => {
    try {
        const deletecommentId = parseInt(req.body.id);
        await prisma.comment.delete({ where: { id: deletecommentId } });
        res.json({ success: true, message: 'Comment deleted successfully.' });
    } catch (error) {
        res.json({ success: false, message: error.message.toString() });
    }
});

//to get the story by id
app.post('/get-story-by-id', auth,is_block, is_login, async (req, res) => {
    try {
        const userId = req.user.id;
        const storyId = req.body.storyid;
        //find the story by given story id
        const findStoryById = await prisma.story.findUnique({ where: { id: parseInt(storyId) } });
        //if story find by the given story id
        if (findStoryById) {
            //checking that if user seen this story first time
            if (!findStoryById.seenby.includes(userId)) {
                await prisma.story.update({
                    where: { id: parseInt(storyId) },
                    data: {
                        //to push the data which is used to seenby 
                        seenby: { push: parseInt(userId) }
                    }
                });
                //sending the details of story 
                res.json({ success: true, data: findStoryById });
            }
            else {
                res.json({ success: true, data: findStoryById });
            }
        }
        else {
            //when story not found by given story id
            res.json({ success: true, message: 'Sorry this story is unavailable' });
        }
    } catch (error) {
        //when some error ocuures any kind of
        res.json({ success: false, message: error.toString() });
    }
});
//only post of loggedin user
app.post('/my-posts', auth,is_block,  is_login, async (req, res) => {
    try {

        var userid = req.user.id;
        //getting the all post of loged user    
        const allpost = await prisma.posts.findMany({
            where: {
                posted_by: parseInt(userid)
            }
            , orderBy: {
                id: 'asc',
            }
        });

        for (i = 0; i < allpost.length; i++) {
            const likedByUser = allpost[i].liked_by;
            //to find username from the table of users for cheking whom liked posts
            const userlikes = await prisma.users.findMany({
                where: {
                    id: {
                        in: likedByUser,
                    }
                }, select: {
                    email: true
                }
            });
            allpost[i].liked_by = userlikes;

            // to give comment on post 
            const allcomments = await prisma.comment.findMany({
                where: { post_id: allpost[i].id }
            });
            var comments = [];
            for (j = 0; j < allcomments.length; j++) {
                const commented_by = await prisma.users.findUnique({
                    where: {
                        id: allcomments[j].comment_by
                    },
                    select: {
                        email: true,
                    }
                })
                //Parsing date object into the string.
                const dateInIso = allcomments[j].created_at + '';

                //split the date object from G and adding the date to created at
                allcomments[j].created_at = dateInIso.split('G')[0];

                comments.push({ comment: allcomments[j].content, commentedby: commented_by.email, commentedAt: allcomments[i].created_at });
            }
            //for adding the comments in response 
            allpost[i].comments = comments;
        }
        res.json({ success: true, data: allpost });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error });
    }
});

//to search the user
app.post('/search-user', auth,is_block,  is_login, async (req, res) => {
    try {
        const email = req.body.email;
        const finduser = await prisma.users.findMany({
            where: {
                //to find a search like regex
                email: {
                    contains: email,
                    //to search with case sensitive or not
                    mode: 'insensitive'
                },
            },
            //select only email
            select: {
                id: true,
                email: true
            }
        });
        //if it couldn't find anything
        if (finduser.length <= 0) {
            return res.json({ success: true, message: 'User not found.' })
        }
        res.json({ success: true, data: finduser })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error })
    }
});

//myprofile
app.get('/myprofile', auth,is_block,  is_login, async (req, res) => {
    try {
        const userid = req.user.id;
        //to get the username
        const username = await prisma.users.findUnique({
            where: {
                id: userid
            },
            select: {
                email: true
            }
        });
        //to get the current user all posts
        const allpost = await prisma.posts.findMany({
            where: {
                posted_by: parseInt(userid)
            }
            , orderBy: {
                id: 'asc',
            }
        });
        for (i = 0; i < allpost.length; i++) {
            const likedByUser = allpost[i].liked_by;
            //to find username from the table of users for cheking whom liked posts
            const userlikes = await prisma.users.findMany({
                where: {
                    id: {
                        in: likedByUser,
                    }
                }, select: {
                    email: true
                }
            });
            allpost[i].liked_by = userlikes;
            // to give comment on post 
            const allcomments = await prisma.comment.findMany({
                where: { post_id: allpost[i].id }
            });
            var comments = [];
            for (j = 0; j < allcomments.length; j++) {
                const commented_by = await prisma.users.findUnique({
                    where: {
                        id: allcomments[j].comment_by
                    },
                    select: {
                        email: true,
                    }
                })
                const dateInIso = allcomments[j].created_at + '';
                //split the date object from G and adding the date to created at
                allcomments[j].created_at = dateInIso.split('G')[0];
                comments.push({ comment: allcomments[j].content, commentedby: commented_by.email, commentedAt: allcomments[i].created_at });
            }
            //for adding the comments in response 
            allpost[i].comments = comments;
            // for converting the date object nto string
            var dateInIso = allpost[i].created_at + '';
            //split the date object from G and adding the date to created at
            allpost[i].created_at = dateInIso.split('G')[0];
        }
        //to get the all story of logged user
        const allStory = await prisma.story.findMany({ where: { uploaded_by: parseInt(userid) } });
        //wraping the all response into the one
        const newResponse = { username: username, mystory: allStory, allpost }
        res.json({ success: true, data: newResponse });
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.toString() })
    }

});
``
//for getting the user who signup between two dates get all user
app.get('/get-user-by-time', is_admin, async (req, res) => {
    try {
        //convserting date to iso
        const getAllUser = await prisma.users.findMany({
            where: {
                created_at: {
                    gte: new Date(req.body.fromdate),
                    lte: new Date(req.body.todate)
                }
            }
        });
        res.json({ success: true, data: getAllUser });
    } catch (error) {
        res.json({ success: false, messgae: error.toString() });
    }
});

//for block the user
app.get('/block-user', auth, is_login, is_admin, async (req, res) => {
    try {
        const userId = req.body.id;
        console.log(userId);
        await prisma.users.update({ where: { id: parseInt(userId) }, data: { is_block: true, token: '', last_seen: new Date(), is_login: false } });
        res.json({ success: false, message: 'Block user successfully.' });
    } catch (error) {
        res.json({ success: false, message: error.toString() });
    }
});

//for unblock the user
app.get('/unblock-user', auth, is_login, is_admin, async (req, res) => {
    try {
        const userId=parseInt(req.body.id);
        console.log("Unblock User",userId );
            await prisma.users.update({where:{id:userId},data:{is_block:false}});
        res.json({success :true ,message :"Unblock user Successfully"});

    } catch (error) {
        res.json({ success: false, messgae: error.toString() });
    }
});

//default route when no route found
app.get('*', (req, res) => {
    res.status(500).json({ success: false, message: 'Api not found.' });
});

//to listen the app
app.listen(port, base_url, () => {
    console.log("app is live on " + `${base_url}` + `:${port}`);
});
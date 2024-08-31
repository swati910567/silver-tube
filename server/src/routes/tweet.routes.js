import {Router} from 'express';
import {
    createTweet,
    updateTweet,
    getUserTweets,
    deleteTweet
} from "../controllers/tweet.js";
import { verifyJWT } from '../middlewares/auth.js';

const router=Router();
router.use(verifyJWT);

router.route("/").post(createTweet);
router.route("/user/:userId").get(getUserTweets);
router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);

export default router;
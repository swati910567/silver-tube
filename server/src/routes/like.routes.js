import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.js";
import {
    getLikedVideos,
    toggleCommentLike,
    toggleTweetLike,
    toggledVideoLike
} from "../controllers/like.js";

const router=Router();

router.use(verifyJWT);

router.route("/toggle/v/:videoId").post(toggledVideoLike);
router.route("/toggle/c/:commentId").post(toggleCommentLike);
router.route("/toggle/t/:tweetId").post(toggleTweetLike);
router.route("/videos").get(getLikedVideos);

export default router;
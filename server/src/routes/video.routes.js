import { Router } from "express";
import {upload} from "../middlewares/multer.js";
import {verifyJWT} from "../middlewares/auth.js";
import {
    deleteVideo,
    getAllVideos,
    getVideoById,
    updateVideo,
    publishAVideo,
    togglePublishStatus
} from "../controllers/vedio.js";

const router=Router();

router.use(verifyJWT);
 // Apply verifyJWT middleware to all routes in this file

 router
 .route("/")
 .get(getAllVideos)
 .post(upload.fields([
    {
        name:"videoFile",
        maxCount:1,
    },
    {
        name:"thumbnail",
        maxCount:1,
    },
 ]),
publishAVideo);

router
.route("/:videoId")
.get(getVideoById)
.delete(deleteVideo)
.patch(upload.single("thumbnail"),updateVideo);

router
.route("/toggle/publish/:videoId")
.patch(togglePublishStatus);

export default router;

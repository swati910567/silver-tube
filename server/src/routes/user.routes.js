import {Router} from 'express';
//import { registerUser } from '../controllers/registeruser.js';
import {upload} from "../middlewares/multer.js";
import { loginUser,logoutUser,registerUser,refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAcoountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from '../controllers/user.js';
import { verifyJWT } from '../middlewares/auth.js';
const router=Router()


//yaha registerUser ke pehle jo h wo middleware injected hai
router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)
//secured routes
//yha pehle jwt verify kro then go aage ,give reference only not run methods
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/changePassword").post(verifyJWT,changeCurrentPassword)
//get isiliye ki ye data ni bhej rha hai kuch bhi
//verufyJWT isiliye kyuki user logged in hona cahiye
router.route("/current-user").get(verifyJWT,getCurrentUser)
//yha pe post rakhne se sari hi details update hone lagengi
router.route("/update-account").patch(verifyJWT,updateAcoountDetails)
//upload single as hume single data update krna h bs 
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)
//yha we are using params thats why different
router.route("/c/:username").get(verifyJWT,getUserChannelProfile)
router.route("/watch-history").get(verifyJWT,getWatchHistory)



export default router;
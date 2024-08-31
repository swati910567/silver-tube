import{Router} from 'express';
import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription
} from "../controllers/subscription.js";
import { verifyJWT } from '../middlewares/auth.js';

const router=Router();
router.use(verifyJWT);

router
.route("/c/:channelId")
.get(getSubscribedChannels)
.post(toggleSubscription);

router.route("/u/:subscriberId").get(getUserChannelSubscribers);

export default router;
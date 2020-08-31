import {Router} from "express";
import Global from "../Global";
import argon from "argon2";
import {v4} from "uuid";

const router = Router();

router.post("/login", async (req, res) => {
    if (!req.headers.hasOwnProperty("authorization")) return res.status(401).json({ message: "No way to authorize user" });
    const users = await Global.db.collection("users").find().toArray();
    for (let user of users) {
        if (argon.verify(user.hash, req.headers.authorization!)) {
            req.session!.username = user.username;
            req.session!.token = user.token;
            return res.status(200).json({ message: "Authorization successful" });
        }
    }
    return res.status(403).json({ message: "Incorrect token" });
});

router.post("/register", async (req, res) => {
    if (!req.body.hasOwnProperty("username"))
        return res.status(400).json({ message: "No username provided" });
    if (!req.body.hasOwnProperty("email"))
        return res.status(400).json({ message: "No e-mail provided" });

    const token = v4() + "-" + v4();
    const hash = await argon.hash(token);

    req.session!.username = req.body.username;
    req.session!.token = token;

    Global.db.collection("users").insertOne({
        _id: await Global.getNextSequenceValue("userid"),
        username: req.body.username,
        email: req.body.email,
        hash
    }).then(user => {
        res.json({
            id: user.ops[0]._id,
            token
        });
    }).catch(e => {
        if (e.message.includes("duplicate key error collection: httpreq.users index: email"))
            return res.status(409).json({
                message: "This e-mail address is taken"
            });
        if (e.message.includes("duplicate key error collection: httpreq.users index: username"))
            return res.status(409).json({
                message: "This username is taken"
            });
        res.status(500).end();
    });
});

export default router;
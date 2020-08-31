import "dotenv/config";
import argon from "argon2";
import express from "express";
import Logger from "./Logger";
import helmet from "helmet";
import cors from "cors";
import multer from "multer";
import Global from "./Global";
import { v4 } from "uuid";
import bodyParser from "body-parser";
import cookieSession from "cookie-session";
import { GridFSBucket } from "mongodb";

const upload = multer();

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(cookieSession({
    name: 'ses',
    keys: [process.env.SESSION_KEY1!, process.env.SESSION_KEY2!],
    maxAge: 86400000 /* 1 day */
}));

app.get("/", (req, res) => {
    req.session!.a = "a";

    res.json({
        message: "Welcome to httpreq.club"
    });
});

app.post("/api/auth/login", async (req, res) => {
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
})

app.post("/api/auth/register", async (req, res) => {
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
    })
})

app.post("/api/upload", upload.single("file"), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ message: "No file to upload" });

    let userId: number | null = null;
    if (req.session!.hasOwnProperty("userId"))
        userId = Number(req.session!.userId);
    else {
        if (!req.headers.hasOwnProperty("authorization")) return res.status(401).json({ message: "No way to authorize user" });
        const users = await Global.db.collection("users").find().toArray();
        for (let user of users) {
            if (argon.verify(user.hash, req.headers.authorization!)) {
                userId = user._id;
                break;
            }
        }
    }
    
    if (userId === null) return res.status(403).json({ message: "Incorrect token" });

    const bucket = new GridFSBucket(Global.db);

    const id = String(await Global.getNextSequenceValue("fileid"));

    const uploadStream = bucket.openUploadStream(id);
    const stream = req.file.stream.pipe(uploadStream);
    stream.on("finish", async () => {
        await Global.db.collection("files").insertOne({
            _id: id,
            userId: userId,
            fileId: uploadStream.id,
            mimeType: (req.file as any).detectedMimeType
        });

        res.status(201).json({
            address: "/" + id
        });
    });
});

app.get("/:id", async (req, res) => {
    const file = await Global.db.collection("files").findOne({
        _id: req.params.id
    }, {
        projection: {
            _id: 0,
            mimeType: 1
        }
    });

    if (!file) return res.status(404).end();

    res.contentType(file.mimeType as string);
    const bucket = new GridFSBucket(Global.db);
    const stream = bucket.openDownloadStreamByName(req.params.id);
    stream.pipe(res);
});

app.listen(process.env.PORT || 4042, () => {
    Logger.success(`Listening on localhost:${process.env.PORT || 4042}`);
});
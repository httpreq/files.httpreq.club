import "dotenv/config";
import argon from "argon2";
import express from "express";
import Logger from "./Logger";
import helmet from "helmet";
import cors from "cors";
import multer from "multer";
import Global from "./Global";
import Auth from "./Routers/Auth";
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
    name: "ses",
    keys: [process.env.SESSION_KEY1!, process.env.SESSION_KEY2!],
    maxAge: 86400000 /* 1 day */
}));

app.use("/api/auth", Auth);

app.get("/", (req, res) => {
    res.json({
        message: "Welcome to httpreq.club"
    });
});

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
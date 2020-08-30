import { MongoClient } from "mongodb";
import Logger from "./Logger";

if (process.env.NODE_ENV === "development") require("dotenv/config");
if (!process.env.hasOwnProperty("MONGO")) throw new Error("Environment variable MONGO must be set and must be a MongoDB connection string.");

const mongo = new MongoClient(process.env.MONGO!, {
    useUnifiedTopology: true,
    useNewUrlParser: true
});

mongo.connect().then(_ => {
    Logger.success("Connected to MongoDB");
});

export default class Global {
    static mongo = mongo;
    static db = mongo.db("httpreq");
    static getNextSequenceValue = (name: string): Promise<number> => {
        return new Promise((resolve, reject) => {
            Global.db.collection("counters").findOneAndUpdate({ _id: name }, { $inc: { sequence_value: 1 } }, function (err, result) {
                if (err) reject(err);
                resolve(result.value.sequence_value);
            });
        });
    }
}
import Global from "./Global";
import { GridFSBucket } from "mongodb";

export async function autoDelete() {
    const files = await Global.db.collection("files").find({ expiry:  { $lt: Date.now() } }).toArray();

    for(let file of files) {
        await Global.db.collection("files").deleteOne({_id: file._id});
        const bucket = new GridFSBucket(Global.db);
        bucket.delete(file._id);
    }
}
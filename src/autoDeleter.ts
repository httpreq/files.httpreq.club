import Global from "./global";

export async function autoDelete() {
    const files = await Global.db.collection("files").find({ expiry:  { $lt: Date.now() } }).toArray();

    for(let file in files) {
        await Global.db.collection("files").deleteOne({_id: file._id});
    }
}
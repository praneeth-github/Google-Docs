const mongoose = require('mongoose')
const Document = require("./Document")
require("dotenv").config()

const io = require("socket.io")(5000, {
    cors: {
        origin: ["http://localhost:3000"],
        methods: ["GET", "POST"],
    }
})

mongoose.connect(process.env.MONGO_DB).then(() => {
    console.log("Connected to db");
})

const defaultValue = ""

io.on("connection", socket => {
    // console.log("connected");
    socket.on("get-document", async(documentId) => {
        const document = await findOrCreateDocument(documentId)
        socket.join(documentId)
        socket.emit("load-document", document.data)
        socket.on("send-changes", (delta) => {
            // console.log(delta)
            socket.broadcast.to(documentId).emit("changes-received", delta)
        })
        socket.on("save-document", async(data) => {
            await Document.findByIdAndUpdate(documentId, {data})
        })
    })

})

const findOrCreateDocument = async(id) => {
    if(id==null) return

    const document = await Document.findById(id)
    if(document) return document

    return Document.create({_id: id, data: defaultValue})
}
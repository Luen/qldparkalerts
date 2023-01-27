const express = require("express");
const app = express();

app.get("/", async (req, res) => {
    res.sendFile(__dirname + "/qld-park-alerts.json", (err) => {
        if (err) {
            res.status(404).send('File not found')
        }
    })
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bot_sdk_1 = require("@line/bot-sdk");
const game_manager_1 = require("./game_manager");
const clientConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.CHANNEL_SECRET,
};
const middlewareConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET || '',
};
const PORT = process.env.PORT || 3000;
// Create a new LINE SDK client.
const client = new bot_sdk_1.Client(clientConfig);
const app = (0, express_1.default)();
app.set("view engine", "ejs");
app.use(express_1.default.urlencoded({ extended: true }));
const gameManager = new game_manager_1.GameManager();
const gameData = {
    idioms: [],
    status: "問題なし",
    collapsedHeight: null,
};
function updateStatus() {
    const stability = gameManager.checkStability(gameData.idioms);
    if (stability === true) {
        gameData.collapsedHeight = null;
        gameData.status = "問題なし";
    }
    else {
        gameData.collapsedHeight = stability;
        gameData.status = "崩れました";
    }
}
app.get("/", (req, res) => {
    res.render("views", {
        field: gameManager.idiom2String(gameData.idioms, gameData.collapsedHeight, "<br/>"),
        status: gameData.status,
    });
});
app.post("/", (req, res) => {
    const idiom = req.body["battle"];
    const offset = gameData.idioms.length == 0 ? 0 : gameManager.calcOffset(gameData.idioms[0].idiom, idiom) + gameData.idioms[0].offset;
    gameData.idioms.unshift({ idiom: idiom, offset: offset });
    updateStatus();
    res.redirect("/");
});
app.post("/restart", (req, res) => {
    gameData.idioms.splice(0);
    updateStatus();
    res.redirect("/");
});
// This route is used for the Webhook.
app.post('/webhook', (0, bot_sdk_1.middleware)(middlewareConfig), async (req, res) => {
    const events = req.body.events;
    // Process all of the received events asynchronously.
    const results = await Promise.all(events.map(async (event) => {
        try {
            await textEventHandler(event);
        }
        catch (err) {
            if (err instanceof Error) {
                console.error(err);
            }
            // Return an error message.
            return res.status(500).json({
                status: 'error',
            });
        }
    }));
    // Return a successfull message.
    return res.status(200).json({
        status: 'success',
        results,
    });
});
const lineGameMap = new Map();
const textEventHandler = async (event) => {
    // Process all variables here.
    if (event.type !== 'message' || event.message.type !== 'text') {
        return;
    }
    // Process all message related variables here.
    const { replyToken } = event;
    const { text } = event.message;
    const { userId } = event.source;
    // 四字熟語じゃない場合の返答
    if (!gameManager.isIdiom(text)) {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: 'ちょっとそれわかんない！ごめんね青春！',
        });
        return;
    }
    if (!userId) {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: 'ゲームできないかも！',
        });
        return;
    }
    if (!lineGameMap.has(userId)) {
        lineGameMap.set(userId, {
            idioms: [],
            status: "問題なし",
            collapsedHeight: null,
        });
    }
    const data = lineGameMap.get(userId);
    const offset = data.idioms.length == 0 ? 0 : gameManager.calcOffset(data.idioms[0].idiom, text) + data.idioms[0].offset;
    data.idioms.unshift({ idiom: text, offset: offset });
    const stability = gameManager.checkStability(data.idioms);
    if (stability === true) {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: gameManager.idiom2String(data.idioms, null, "\n"),
        });
        return;
    }
    else {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '崩れました',
        });
        lineGameMap.delete(userId);
        return;
    }
};
app.listen(PORT, () => {
    console.log("Example app listening on port 3000!");
});
//# sourceMappingURL=index.js.map
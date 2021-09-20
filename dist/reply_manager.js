"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplyManager = void 0;
class ReplyManager {
    static getRepliesInGame(idioms) {
        const items = idioms.map(idiom => {
            return ReplyManager.createReplyItem(idiom);
        });
        items.unshift(ReplyManager.createReplyItem("やめる"));
        return {
            items: items
        };
    }
    static getRepliesNotInGame() {
        return {
            items: [
                ReplyManager.createReplyItem("はじめる"),
                ReplyManager.createReplyItem("説明を見る"),
            ]
        };
    }
    static createReplyItem(text) {
        return {
            type: "action",
            action: {
                type: "message",
                label: text,
                text: text
            }
        };
    }
}
exports.ReplyManager = ReplyManager;
//# sourceMappingURL=reply_manager.js.map
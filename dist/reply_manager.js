"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplyManager = void 0;
class ReplyManager {
    static getRepliesInGame(idioms) {
        const items = idioms.map((idiom) => {
            return ReplyManager.createReplyItem(idiom, true);
        });
        items.unshift(ReplyManager.createReplyItem('やめる'));
        return {
            items: items,
        };
    }
    static getRepliesNotInGame() {
        return {
            items: [
                ReplyManager.createReplyItem('はじめる'),
                ReplyManager.createReplyItem('遊び方'),
                ReplyManager.createReplyItem('成績を見る'),
            ],
        };
    }
    static createReplyItem(text, slice = false) {
        return {
            type: 'action',
            action: {
                type: 'message',
                label: text,
                text: slice ? text.slice(0, 4) : text,
            },
        };
    }
}
exports.ReplyManager = ReplyManager;
//# sourceMappingURL=reply_manager.js.map
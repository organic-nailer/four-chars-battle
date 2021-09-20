import { QuickReply, QuickReplyItem } from "@line/bot-sdk";
import { createRequire } from "module";

export class ReplyManager {
    static getRepliesInGame(idioms: string[]): QuickReply {
        const items: QuickReplyItem[] = idioms.map(idiom => {
            return ReplyManager.createReplyItem(idiom);
        });
        items.unshift(ReplyManager.createReplyItem("やめる"));
        return {
            items: items
        };
    }

    static getRepliesNotInGame(): QuickReply {
        return {
            items: [
                ReplyManager.createReplyItem("はじめる"),
                ReplyManager.createReplyItem("説明を見る"),
            ]
        };
    }

    private static createReplyItem(text: string): QuickReplyItem {
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
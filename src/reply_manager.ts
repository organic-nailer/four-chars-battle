import { QuickReply, QuickReplyItem } from '@line/bot-sdk';

export class ReplyManager {
    static getRepliesInGame(idioms: string[]): QuickReply {
        const items: QuickReplyItem[] = idioms.map((idiom) => {
            return ReplyManager.createReplyItem(idiom, true);
        });
        items.unshift(ReplyManager.createReplyItem('やめる'));
        return {
            items: items,
        };
    }

    static getRepliesNotInGame(): QuickReply {
        return {
            items: [
                ReplyManager.createReplyItem('はじめる'),
                ReplyManager.createReplyItem('遊び方'),
                ReplyManager.createReplyItem('成績を見る'),
            ],
        };
    }

    private static createReplyItem(
        text: string,
        slice = false
    ): QuickReplyItem {
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

import dataMessages from '@/data/messages.json';

export function getAllMessageIds() {
    return dataMessages.map((item) => {
        return {
            id: item.Id,
        };
    });
}

export function getMessageData(id: string) {
    const message = dataMessages.find((item) => item.Id === id);
    return message;
}
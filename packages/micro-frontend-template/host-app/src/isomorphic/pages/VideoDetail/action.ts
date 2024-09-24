import {
    ShowVideoPlayer,
} from "./constants";

export function showVideoPlayer(data) {
    return {
        type: ShowVideoPlayer,
        data: {
            ...data,
        },
    };
}

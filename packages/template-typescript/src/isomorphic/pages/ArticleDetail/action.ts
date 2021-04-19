import {
    CloseFullscreenPictureViewer,
    CloseVideoPlayer,
    GallarySwitch,
    HideArticleContent,
    MoveVideoPlayer,
    ShowFullscreenPictureViewer,
    ShowVideoPlayer,
} from "./constants";

export function gallarySwitch(data) {
    return {
        type: GallarySwitch,
        data,
    };
}

export function hideArticleContent(data) {
    return {
        type: HideArticleContent,
        data,
    };
}

export function showFullscreenPictureViewer(data) {
    return {
        type: ShowFullscreenPictureViewer,
        data,
    };
}

export const closeFullscreenPictureViewer = {
    type: CloseFullscreenPictureViewer,
    data: {
        pictureList: null,
    },
};

export function closeVideoPlayer(data) {
    return {
        type: CloseVideoPlayer,
        data,
    };
}

export function showVideoPlayer(data) {
    return {
        type: ShowVideoPlayer,
        data,
    };
}

export function moveVideoPlayer(data) {
    return {
        type: MoveVideoPlayer,
        data,
    };
}

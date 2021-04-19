import {
    CloseFullscreenPictureViewer,
    CloseVideoPlayer,
    GallarySwitch,
    HideArticleContent,
    MoveVideoPlayer,
    ShowFullscreenPictureViewer,
    ShowVideoPlayer,
} from "./constants";
import { articleDetailInitState } from "./initialState";

export function articleDetailReducer(state = articleDetailInitState, action) {
    switch (action.type) {
        default:
            return {
                ...state,
            };
    }
}

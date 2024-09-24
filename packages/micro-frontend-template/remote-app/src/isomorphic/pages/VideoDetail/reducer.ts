import {
    ShowVideoPlayer,
} from "./constants";
import { articleDetailInitState } from "./initialState";

export function videoDetailReducer(state = articleDetailInitState, action) {
    switch (action.type) {
        case ShowVideoPlayer: {
            return {
                ...state,
                ...action.data
            };
        }
        default:
            return {
                ...state,
            };
    }
}

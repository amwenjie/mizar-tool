import { articleDetailInitState } from "./initialState";

export function articleDetailReducer(state = articleDetailInitState, action) {
    switch (action.type) {
        default:
            return {
                ...state,
                ...action.data
            };
    }
}
